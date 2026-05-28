"""Data drift detection — Evidently report + KS-test + auto-retrain trigger."""

from __future__ import annotations

import json
import joblib
import numpy as np
import pandas as pd
import requests
from pathlib import Path
from scipy import stats

import mlflow

from mlflow_setup import ROOT, setup_mlflow, agent_log

DATA_DIR = ROOT / "data"
MODELS_DIR = ROOT / "models"
SPLITS_PKL = DATA_DIR / "splits.pkl"
SCRATCH = ROOT / "scratch"
SCRATCH.mkdir(exist_ok=True)

DRIFT_REPORT_HTML = SCRATCH / "drift_report.html"
DRIFT_RESULTS_JSON = SCRATCH / "drift_latest.json"
KS_CSV = SCRATCH / "ks_drift_results.csv"

SEUIL_DRIFT = 0.30
SEUIL_WARN = 0.15

EVIDENTLY_AVAILABLE = False
try:
    from evidently.report import Report
    from evidently.metric_preset import DataDriftPreset, DataQualityPreset
    from evidently.metrics import DatasetDriftMetric

    EVIDENTLY_AVAILABLE = True
except ImportError:
    pass


def simulate_drift(df: pd.DataFrame) -> pd.DataFrame:
    df_drift = df.copy()
    num_cols = df_drift.select_dtypes(include=[np.number]).columns
    for col in num_cols[: min(2, len(num_cols))]:
        df_drift[col] = df_drift[col] * 1.6 + np.random.normal(0, 0.5, len(df_drift))
    return df_drift


def _load_reference_current() -> tuple[pd.DataFrame, pd.DataFrame]:
    if not SPLITS_PKL.exists():
        raise FileNotFoundError("splits.pkl not found. Upload dataset or run pipeline first.")

    X_train, X_test, _y_train, _y_test = joblib.load(SPLITS_PKL)
    features_path = MODELS_DIR / "features.pkl"
    if features_path.exists():
        features = joblib.load(features_path)
    else:
        features = [f"feature_{i}" for i in range(X_test.shape[1])]

    X_ref = pd.DataFrame(X_train, columns=features)
    X_cur = simulate_drift(pd.DataFrame(X_test, columns=features))
    return X_ref, X_cur


def run_drift_check(trigger_retrain: bool = True) -> dict:
    setup_mlflow()
    mlflow.set_experiment("monitoring_drift")

    X_ref, X_cur = _load_reference_current()

    evidently_drift_share = None
    dataset_drift = False
    n_drifted_ev = 0
    n_total_ev = len(X_ref.columns)

    if EVIDENTLY_AVAILABLE:
        report = Report(metrics=[DataDriftPreset(), DataQualityPreset()])
        report.run(reference_data=X_ref, current_data=X_cur)
        report.save_html(str(DRIFT_REPORT_HTML))

        score_report = Report(metrics=[DatasetDriftMetric()])
        score_report.run(reference_data=X_ref, current_data=X_cur)
        result = score_report.as_dict()
        metric_result = result["metrics"][0]["result"]
        evidently_drift_share = float(metric_result["drift_share"])
        dataset_drift = bool(metric_result["dataset_drift"])
        n_drifted_ev = int(metric_result["number_of_drifted_columns"])
        n_total_ev = int(metric_result["number_of_columns"])

    # KS-test per feature
    ks_results = []
    n_drifted_ks = 0
    num_cols = [c for c in X_ref.columns if pd.api.types.is_numeric_dtype(X_ref[c])]
    for col in num_cols:
        stat, pvalue = stats.ks_2samp(X_ref[col].dropna(), X_cur[col].dropna())
        drifted = bool(pvalue < 0.05)
        if drifted:
            n_drifted_ks += 1
        ks_results.append({
            "feature": col,
            "ks_stat": round(float(stat), 4),
            "p_value": round(float(pvalue), 4),
            "drifted": drifted,
        })

    drift_share = (
        evidently_drift_share
        if evidently_drift_share is not None
        else n_drifted_ks / max(1, len(num_cols))
    )

    ks_df = pd.DataFrame(ks_results)
    ks_df.to_csv(KS_CSV, index=False)

    retrain_triggered = 0
    alert_level = "ok"
    if drift_share > SEUIL_DRIFT:
        alert_level = "critical"
        if trigger_retrain:
            try:
                res = requests.post("http://127.0.0.1:5001/api/automl/run", timeout=10)
                retrain_triggered = 1 if res.status_code == 200 else 0
            except Exception:
                retrain_triggered = 0
    elif drift_share > SEUIL_WARN:
        alert_level = "warning"

    with mlflow.start_run(run_name="drift_check_v1"):
        mlflow.log_metric("drift_share", drift_share)
        mlflow.log_metric("drifted_columns", n_drifted_ev or n_drifted_ks)
        mlflow.log_metric("total_columns", n_total_ev)
        mlflow.log_metric("dataset_drifted", int(dataset_drift or drift_share > SEUIL_DRIFT))
        mlflow.log_metric("retrain_triggered", retrain_triggered)
        for row in ks_results:
            mlflow.log_metric(f"ks_pvalue_{row['feature']}", row["p_value"])
        if DRIFT_REPORT_HTML.exists():
            mlflow.log_artifact(str(DRIFT_REPORT_HTML))
        mlflow.log_artifact(str(KS_CSV))

    payload = {
        "status": "ok",
        "drift_share": round(drift_share, 4),
        "drift_share_pct": round(drift_share * 100, 2),
        "drifted_columns": n_drifted_ev or n_drifted_ks,
        "total_columns": n_total_ev,
        "dataset_drifted": dataset_drift or drift_share > SEUIL_DRIFT,
        "alert_level": alert_level,
        "seuil_critical": SEUIL_DRIFT,
        "seuil_warning": SEUIL_WARN,
        "retrain_triggered": bool(retrain_triggered),
        "evidently_available": EVIDENTLY_AVAILABLE,
        "report_url": "/api/drift/report",
        "ks_results": ks_results,
        "reference_mean_sample": {
            col: round(float(X_ref[col].mean()), 4)
            for col in num_cols[:3]
        },
        "current_mean_sample": {
            col: round(float(X_cur[col].mean()), 4)
            for col in num_cols[:3]
        },
    }

    DRIFT_RESULTS_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    agent_log("DRF", "drift_service.py", "drift complete", {"drift_share": drift_share, "alert": alert_level})
    return payload


def get_latest_drift() -> dict:
    if DRIFT_RESULTS_JSON.exists():
        return json.loads(DRIFT_RESULTS_JSON.read_text(encoding="utf-8"))
    return {
        "status": "empty",
        "message": "No drift check yet. Run monitoring from the Drift page.",
    }
