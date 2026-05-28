"""MLflow Model Registry — register best run, lifecycle stages."""

from __future__ import annotations

import mlflow
from mlflow.tracking import MlflowClient

from mlflow_setup import setup_mlflow, agent_log

REGISTRY_NAME = "mon_modele_production"
SEUIL_PRODUCTION = 0.85


def get_client() -> MlflowClient:
    setup_mlflow()
    return MlflowClient()


def find_best_run(experiment_names: list[str] | None = None) -> dict | None:
    """Return best run by accuracy across known experiments."""
    if experiment_names is None:
        experiment_names = [
            "Student_Performance",
            "Student_Performance_AutoML",
            "Student_Performance_Analysis",
            "Task4_RandomForest_Student",
        ]
    client = get_client()
    best = None
    best_acc = -1.0

    for exp_name in experiment_names:
        exp = client.get_experiment_by_name(exp_name)
        if exp is None:
            continue
        runs = client.search_runs(
            experiment_ids=[exp.experiment_id],
            order_by=["metrics.accuracy DESC"],
            max_results=1,
        )
        if not runs:
            continue
        run = runs[0]
        acc = run.data.metrics.get("accuracy")
        if acc is None:
            continue
        if float(acc) > best_acc:
            best_acc = float(acc)
            best = run

    if best is None:
        return None

    return {
        "run_id": best.info.run_id,
        "experiment_id": best.info.experiment_id,
        "accuracy": best_acc,
        "metrics": dict(best.data.metrics),
        "params": dict(best.data.params),
    }


def register_best_model(
    name: str = REGISTRY_NAME,
    description: str = "Modèle de classification — version optimisée",
    validated_by: str = "equipe_data",
) -> dict:
    best = find_best_run()
    if not best:
        return {"status": "error", "message": "No runs with metric 'accuracy' found. Train a model first."}

    client = get_client()
    run_id = best["run_id"]
    model_uri = f"runs:/{run_id}/model"

    registered = mlflow.register_model(model_uri=model_uri, name=name)
    version = registered.version

    client.update_registered_model(name=name, description=description)
    client.set_model_version_tag(
        name=name,
        version=version,
        key="validated_by",
        value=validated_by,
    )
    client.transition_model_version_stage(
        name=name,
        version=version,
        stage="Staging",
        archive_existing_versions=False,
    )

    acc = float(best["accuracy"])
    stage = "Staging"
    if acc >= SEUIL_PRODUCTION:
        client.transition_model_version_stage(
            name=name,
            version=version,
            stage="Production",
            archive_existing_versions=True,
        )
        stage = "Production"

    agent_log(
        "REG",
        "registry_service.py",
        "registered",
        {"name": name, "version": version, "stage": stage, "accuracy": acc},
    )

    return {
        "status": "ok",
        "name": name,
        "version": int(version),
        "stage": stage,
        "run_id": run_id,
        "accuracy": acc,
        "message": (
            f"Modèle v{version} promu en Production."
            if stage == "Production"
            else f"Modèle non promu : accuracy {acc:.3f} < seuil {SEUIL_PRODUCTION}"
        ),
    }


def list_registered_models() -> list[dict]:
    client = get_client()
    out = []
    for rm in client.search_registered_models():
        versions = []
        try:
            for mv in client.search_model_versions(f"name='{rm.name}'"):
                versions.append({
                    "version": int(mv.version),
                    "stage": mv.current_stage,
                    "status": mv.status,
                    "run_id": mv.run_id,
                    "creation_timestamp": mv.creation_timestamp,
                })
        except Exception:
            pass
        versions.sort(key=lambda x: x["version"], reverse=True)
        out.append({
            "name": rm.name,
            "description": rm.description or "",
            "versions": versions,
            "latest_version": versions[0] if versions else None,
        })
    return out


def promote_version(name: str, version: int, stage: str = "Production") -> dict:
    client = get_client()
    client.transition_model_version_stage(
        name=name,
        version=version,
        stage=stage,
        archive_existing_versions=(stage == "Production"),
    )
    return {"status": "ok", "name": name, "version": version, "stage": stage}
