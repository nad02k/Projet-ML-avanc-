"""Runtime smoke test — writes evidence to debug-8f022d.log."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from mlflow_setup import agent_log, setup_mlflow, MLFLOW_DB, ROOT as PROJ_ROOT

DATA_DIR = PROJ_ROOT / "data"
SPLITS = DATA_DIR / "splits.pkl"


def main():
    run_id = "smoke-pre-fix"

    # Hypothesis A: data artifacts
    agent_log(
        "A",
        "smoke_test.py:data",
        "data artifacts",
        {
            "splits_exists": SPLITS.exists(),
            "active_exists": (DATA_DIR / "active_dataset.csv").exists(),
            "mlflow_db_exists": MLFLOW_DB.exists(),
        },
        run_id,
    )

    # Hypothesis B: MLflow URI
    uri = setup_mlflow()
    import mlflow

    agent_log(
        "B",
        "smoke_test.py:mlflow",
        "tracking uri",
        {"uri": uri, "resolved": str(MLFLOW_DB.resolve())},
        run_id,
    )

    # Hypothesis C: nested run without parent
    nested_err = None
    try:
        with mlflow.start_run(run_name="_smoke_nested", nested=True):
            pass
    except Exception as e:
        nested_err = type(e).__name__ + ": " + str(e)[:200]
    agent_log(
        "C",
        "smoke_test.py:nested",
        "nested without parent",
        {"error": nested_err},
        run_id,
    )

    # Hypothesis D: train path imports splits
    splits_ok = False
    if SPLITS.exists():
        import joblib

        data = joblib.load(SPLITS)
        splits_ok = len(data) == 4
    agent_log(
        "D",
        "smoke_test.py:splits",
        "load splits",
        {"ok": splits_ok},
        run_id,
    )

    print("smoke_test done — see debug-8f022d.log")


if __name__ == "__main__":
    main()
