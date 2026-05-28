"""
ML Studio MLOps — Data Drift Simulation and Detection (Partie 6)
Loads splits, shifts feature distributions to simulate drift, runs Evidently
and KS-test, logs HTML and CSV reports to MLflow, and triggers retraining.
"""

import os
import sys
import subprocess
from pathlib import Path
import json
import numpy as np
import pandas as pd
import joblib
from scipy import stats

import mlflow
from mlflow.tracking import MlflowClient

# Paths
ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
MODELS_DIR = ROOT / "models"
SCRATCH_DIR = ROOT / "scratch"
SCRATCH_DIR.mkdir(exist_ok=True)

SPLITS_PKL = DATA_DIR / "splits.pkl"
FEATURES_PKL = MODELS_DIR / "features.pkl"
MLFLOW_DB = ROOT / "mlflow.db"

# Output files
DRIFT_REPORT_HTML = 'drift_report.html'
KS_CSV = 'ks_drift_results.csv'

# Thresholds
SEUIL_DRIFT = 0.30   # 30% features drifted -> retrain
SEUIL_WARN  = 0.15   # 15% features drifted -> warning

# Set tracking URI
mlflow.set_tracking_uri(f"sqlite:///{MLFLOW_DB.as_posix()}")

# Try loading Evidently
EVIDENTLY_AVAILABLE = False
try:
    from evidently.report import Report
    from evidently.metric_preset import DataDriftPreset, DataQualityPreset
    from evidently.metrics import DatasetDriftMetric
    EVIDENTLY_AVAILABLE = True
except ImportError:
    print("Evidently is not installed or import failed. Falling back to KS-test exclusively.")

def main():
    if not SPLITS_PKL.exists():
        raise FileNotFoundError(f"Splits file not found at: {SPLITS_PKL}. Please run preprocess.py first.")
        
    print("Loading reference and test datasets...")
    X_train, X_test, y_train, y_test = joblib.load(SPLITS_PKL)
    
    # Load features metadata
    if FEATURES_PKL.exists():
        features = joblib.load(FEATURES_PKL)
    else:
        features = [f"feature_{i}" for i in range(X_train.shape[1])]
        
    X_ref = pd.DataFrame(X_train, columns=features)
    
    # 1. Simulation du drift (Partie 6.2)
    # Drift simulation: Shift mean + add noise on the first two numerical features
    print("Simulating production data drift (Partie 6.2)...")
    X_prod = pd.DataFrame(X_test, columns=features).copy()
    num_cols = X_prod.select_dtypes(include=[np.number]).columns
    
    for col in num_cols[:min(2, len(num_cols))]:
        X_prod[col] = X_prod[col] * 1.6 + np.random.normal(0, 0.5, len(X_prod))
        
    print(f"Moyenne feature '{num_cols[0]}' - Ref: {X_ref[num_cols[0]].mean():.3f} | Prod: {X_prod[num_cols[0]].mean():.3f}")
    
    # 2. Setup MLflow Experiment
    mlflow.set_experiment('monitoring_drift')
    
    # 3. Drift Analysis
    evidently_drift_share = None
    dataset_drift = False
    n_drifted_ev = 0
    n_total_ev = len(features)
    
    with mlflow.start_run(run_name='drift_check_v1') as run:
        # A. Evidently HTML Report (Partie 6.3)
        if EVIDENTLY_AVAILABLE:
            print("Generating Evidently drift and quality reports...")
            report = Report(metrics=[DataDriftPreset(), DataQualityPreset()])
            report.run(reference_data=X_ref, current_data=X_prod)
            report.save_html(DRIFT_REPORT_HTML)
            mlflow.log_artifact(DRIFT_REPORT_HTML)
            
            # Numeric scores extraction
            score_report = Report(metrics=[DatasetDriftMetric()])
            score_report.run(reference_data=X_ref, current_data=X_prod)
            result = score_report.as_dict()
            
            metric_result = result['metrics'][0]['result']
            evidently_drift_share = float(metric_result['drift_share'])
            dataset_drift = bool(metric_result['dataset_drift'])
            n_drifted_ev = int(metric_result['number_of_drifted_columns'])
            n_total_ev = int(metric_result['number_of_columns'])
            
            print(f"Evidently Drift Share: {evidently_drift_share:.2%} | Drifted: {n_drifted_ev}/{n_total_ev}")
            
        # B. Test statistique KS-test par feature (Partie 6.4)
        print("Executing Kolmogorov-Smirnov statistical tests feature-by-feature...")
        ks_results = []
        n_drifted_ks = 0
        n_total_ks = len(num_cols)
        
        for col in num_cols:
            stat, pvalue = stats.ks_2samp(X_ref[col].dropna(), X_prod[col].dropna())
            drifted = pvalue < 0.05
            if drifted:
                n_drifted_ks += 1
            ks_results.append({
                'feature': col,
                'ks_stat': round(float(stat), 4),
                'p_value': round(float(pvalue), 4),
                'drifted': drifted
            })
            # Log feature level p-values as metrics
            mlflow.log_metric(f'ks_pvalue_{col}', pvalue)
            
        df_drift = pd.DataFrame(ks_results)
        df_drift.to_csv(KS_CSV, index=False)
        mlflow.log_artifact(KS_CSV)
        print("\nKS-test Results:")
        print(df_drift.to_string(index=False))
        
        # Calculate final drift share to log
        drift_share = (
            evidently_drift_share 
            if evidently_drift_share is not None 
            else n_drifted_ks / max(1, n_total_ks)
        )
        
        # Log aggregated metrics
        mlflow.log_metric('drift_share', drift_share)
        mlflow.log_metric('drifted_columns', n_drifted_ev or n_drifted_ks)
        mlflow.log_metric('total_columns', n_total_ev or n_total_ks)
        mlflow.log_metric('dataset_drifted', int(dataset_drift or drift_share > SEUIL_DRIFT))
        
        print(f"\nFinal Drift Share: {drift_share:.2%}")
        
        # C. Déclenchement automatique du ré-entraînement (Partie 6.5)
        retrain_triggered = 0
        if drift_share > SEUIL_DRIFT:
            print(f"\n[CRITIQUE] Drift detected: {drift_share:.2%} > seuil {SEUIL_DRIFT:.0%}")
            print("Triggering automatic retraining pipeline...")
            
            # Execute train.py in subprocess
            try:
                # We point to python in .venv or the current active interpreter
                python_exe = sys.executable
                train_script = str(ROOT / "src" / "train.py")
                
                print(f"Running: {python_exe} {train_script}")
                subprocess.run([python_exe, train_script], check=True)
                retrain_triggered = 1
                print("Retraining completed successfully!")
            except Exception as e:
                print(f"Failed to execute retraining: {e}")
                
        elif drift_share > SEUIL_WARN:
            print(f"\n[AVERTISSEMENT] Drift warning: {drift_share:.2%} — surveillance renforcée.")
        else:
            print(f"\n[OK] Drift is under control: {drift_share:.2%} — modèle stable.")
            
        mlflow.log_metric('retrain_triggered', retrain_triggered)
        
if __name__ == "__main__":
    main()
