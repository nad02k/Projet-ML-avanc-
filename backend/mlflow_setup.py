"""Shared MLflow tracking URI (absolute path at project root)."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MLFLOW_DB = ROOT / "mlflow.db"
DEBUG_LOG = ROOT / "debug-8f022d.log"


def mlflow_tracking_uri() -> str:
    return f"sqlite:///{MLFLOW_DB.as_posix()}"


def setup_mlflow():
    import mlflow

    uri = mlflow_tracking_uri()
    mlflow.set_tracking_uri(uri)
    return uri


# region agent log
def agent_log(hypothesis_id: str, location: str, message: str, data=None, run_id: str = "pre-fix"):
    import json
    import time

    entry = {
        "sessionId": "8f022d",
        "runId": run_id,
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data or {},
        "timestamp": int(time.time() * 1000),
    }
    try:
        with open(DEBUG_LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except OSError:
        pass


# endregion
