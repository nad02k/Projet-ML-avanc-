"""Start/stop MLflow UI and MLflow model serving subprocesses."""

from __future__ import annotations

import os
import sys
import time
import socket
import subprocess
from pathlib import Path

import requests

from mlflow_setup import ROOT, MLFLOW_DB, mlflow_tracking_uri, agent_log

MLFLOW_UI_PORT = int(os.environ.get("MLFLOW_UI_PORT", "5000"))
MLFLOW_SERVE_PORT = int(os.environ.get("MLFLOW_SERVE_PORT", "1234"))
LOG_DIR = ROOT / "scratch"
LOG_DIR.mkdir(exist_ok=True)
UI_LOG = LOG_DIR / "mlflow_ui.log"
SERVE_LOG = LOG_DIR / "serve.log"

_ui_proc: subprocess.Popen | None = None
_serve_proc: subprocess.Popen | None = None


def _python_exe() -> str:
    for candidate in (
        ROOT / ".venv" / "Scripts" / "python.exe",
        ROOT / "venv" / "Scripts" / "python.exe",
    ):
        if candidate.exists():
            return str(candidate)
    return sys.executable


def _port_open(port: int, host: str = "127.0.0.1") -> bool:
    try:
        with socket.create_connection((host, port), timeout=1.5):
            return True
    except OSError:
        return False


def _http_ok(url: str) -> bool:
    try:
        r = requests.get(url, timeout=3)
        return r.status_code < 500
    except Exception:
        return False


def start_mlflow_ui(force: bool = False) -> dict:
    """Start MLflow tracking UI; reuse existing server on port if healthy."""
    global _ui_proc

    base = f"http://127.0.0.1:{MLFLOW_UI_PORT}"
    if _http_ok(base):
        agent_log("MLF", "mlflow_process.py", "ui already up", {"url": base, "port": MLFLOW_UI_PORT})
        return {"status": "running", "url": base, "port": MLFLOW_UI_PORT, "reused": True}

    if _ui_proc and _ui_proc.poll() is None and not force:
        if _http_ok(base):
            return {"status": "running", "url": base, "port": MLFLOW_UI_PORT}

    if _port_open(MLFLOW_UI_PORT) and not _http_ok(base):
        agent_log(
            "MLF",
            "mlflow_process.py",
            "port blocked non-mlflow",
            {"port": MLFLOW_UI_PORT},
        )
        return {
            "status": "error",
            "message": f"Port {MLFLOW_UI_PORT} is in use but MLflow UI did not respond. "
            f"Close other apps on that port or set MLFLOW_UI_PORT=5050.",
            "log_file": str(UI_LOG),
        }

    python_exe = _python_exe()
    db_uri = mlflow_tracking_uri()
    env = os.environ.copy()
    env["MLFLOW_TRACKING_URI"] = db_uri

    UI_LOG.write_text("", encoding="utf-8")
    log_f = open(UI_LOG, "a", encoding="utf-8")

    cmd = [
        python_exe,
        "-m",
        "mlflow",
        "ui",
        "--backend-store-uri",
        db_uri,
        "--default-artifact-root",
        str((ROOT / "mlruns").resolve()),
        "--host",
        "127.0.0.1",
        "--port",
        str(MLFLOW_UI_PORT),
    ]
    try:
        _ui_proc = subprocess.Popen(
            cmd,
            cwd=str(ROOT),
            stdout=log_f,
            stderr=subprocess.STDOUT,
            env=env,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
        )
    except Exception as e:
        log_f.close()
        agent_log("MLF", "mlflow_process.py", "ui spawn failed", {"error": str(e)})
        return {"status": "error", "message": str(e), "log_file": str(UI_LOG)}

    for _ in range(30):
        time.sleep(0.5)
        if _http_ok(base):
            agent_log(
                "MLF",
                "mlflow_process.py",
                "ui started",
                {"url": base, "pid": _ui_proc.pid},
            )
            return {
                "status": "running",
                "url": base,
                "port": MLFLOW_UI_PORT,
                "pid": _ui_proc.pid,
                "log_file": str(UI_LOG),
            }
        if _ui_proc.poll() is not None:
            break

    tail = UI_LOG.read_text(encoding="utf-8", errors="replace")[-2000:]
    agent_log("MLF", "mlflow_process.py", "ui failed health", {"tail": tail[-500:]})
    return {
        "status": "error",
        "message": "MLflow UI process exited or did not become ready.",
        "log_file": str(UI_LOG),
        "log_tail": tail,
    }


def mlflow_ui_status() -> dict:
    base = f"http://127.0.0.1:{MLFLOW_UI_PORT}"
    running = _http_ok(base)
    proc_alive = _ui_proc is not None and _ui_proc.poll() is None
    return {
        "running": running,
        "url": base if running else None,
        "port": MLFLOW_UI_PORT,
        "process_alive": proc_alive,
        "tracking_uri": mlflow_tracking_uri(),
        "db_exists": MLFLOW_DB.exists(),
        "log_file": str(UI_LOG),
    }


def start_model_serving(model_name: str = "mon_modele_production", stage: str = "Production") -> dict:
    """Start `mlflow models serve` for a registered model stage."""
    global _serve_proc

    base = f"http://127.0.0.1:{MLFLOW_SERVE_PORT}"
    if _http_ok(f"{base}/health") or _http_ok(base):
        return {"status": "running", "url": base, "port": MLFLOW_SERVE_PORT, "reused": True}

    if _serve_proc and _serve_proc.poll() is None:
        return {"status": "running", "url": base, "port": MLFLOW_SERVE_PORT}

    python_exe = _python_exe()
    env = os.environ.copy()
    env["MLFLOW_TRACKING_URI"] = mlflow_tracking_uri()

    SERVE_LOG.write_text("", encoding="utf-8")
    log_f = open(SERVE_LOG, "a", encoding="utf-8")

    model_uri = f"models:/{model_name}/{stage}"
    env["MODEL_NAME"] = model_name
    env["MODEL_STAGE"] = stage

    cmd = [
        python_exe,
        str((ROOT / "src" / "serve.py").resolve()),
    ]
    try:
        _serve_proc = subprocess.Popen(
            cmd,
            cwd=str(ROOT),
            stdout=log_f,
            stderr=subprocess.STDOUT,
            env=env,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
        )
    except Exception as e:
        log_f.close()
        return {"status": "error", "message": str(e), "log_file": str(SERVE_LOG)}

    for _ in range(40):
        time.sleep(0.5)
        if _http_ok(base):
            return {
                "status": "running",
                "url": base,
                "invocations": f"{base}/invocations",
                "model_uri": model_uri,
                "port": MLFLOW_SERVE_PORT,
                "pid": _serve_proc.pid,
            }
        if _serve_proc.poll() is not None:
            break

    tail = SERVE_LOG.read_text(encoding="utf-8", errors="replace")[-2000:]
    return {
        "status": "error",
        "message": "Serving process failed. Register a Production model first.",
        "log_file": str(SERVE_LOG),
        "log_tail": tail,
    }


def serving_status() -> dict:
    base = f"http://127.0.0.1:{MLFLOW_SERVE_PORT}"
    running = _http_ok(base) or _http_ok(f"{base}/health")
    return {
        "running": running,
        "url": base if running else None,
        "invocations": f"{base}/invocations" if running else None,
        "port": MLFLOW_SERVE_PORT,
        "process_alive": _serve_proc is not None and _serve_proc.poll() is None,
        "log_file": str(SERVE_LOG),
    }
