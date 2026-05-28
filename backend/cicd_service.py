"""
CI/CD service for ML Studio.
Handles quality gate checks, pre-commit simulation, API testing, and run history.
"""

from __future__ import annotations
import os
import sys
import json
import subprocess
import time
from pathlib import Path
import mlflow
from mlflow.tracking import MlflowClient

ROOT = Path(__file__).resolve().parent.parent
MLFLOW_DB = ROOT / "mlflow.db"
HISTORY_FILE = ROOT / "scratch" / "cicd_history.json"
PRE_COMMIT_FILE = ROOT / ".git" / "hooks" / "pre-commit"

def get_python_exe() -> str:
    for candidate in (
        ROOT / ".venv" / "Scripts" / "python.exe",
        ROOT / "venv" / "Scripts" / "python.exe",
    ):
        if candidate.exists():
            return str(candidate)
    return sys.executable

def ensure_history_exists():
    ROOT.mkdir(parents=True, exist_ok=True)
    (ROOT / "scratch").mkdir(exist_ok=True)
    if not HISTORY_FILE.exists():
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)

def get_cicd_history() -> list:
    ensure_history_exists()
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_cicd_history(history: list):
    ensure_history_exists()
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history[:50], f, indent=2)  # Keep latest 50 runs

def get_cicd_status() -> dict:
    """Retrieve current CI/CD status, quality gate config, and last runs."""
    ensure_history_exists()
    
    # 1. Check Git hook status
    hook_active = PRE_COMMIT_FILE.exists()
    
    # 2. Query best model and quality gate
    tracking_uri = f"sqlite:///{MLFLOW_DB.as_posix()}"
    mlflow.set_tracking_uri(tracking_uri)
    client = MlflowClient(tracking_uri=tracking_uri)
    
    best_acc = 0.0
    best_run_id = "None"
    best_model_name = "None"
    quality_gate_passed = False
    threshold = 0.80  # Default pre-commit threshold
    
    try:
        experiment = client.get_experiment_by_name("mon_projet_ml")
        if not experiment:
            for name in ["Student_Performance", "Student_Performance_AutoML"]:
                experiment = client.get_experiment_by_name(name)
                if experiment:
                    break
                    
        if experiment:
            runs = client.search_runs(
                experiment_ids=[experiment.experiment_id],
                order_by=["metrics.accuracy DESC"],
                max_results=1
            )
            if runs:
                best_run = runs[0]
                best_acc = best_run.data.metrics.get("accuracy", 0.0)
                best_run_id = best_run.info.run_id
                best_model_name = best_run.data.tags.get("mlflow.runName", "rf_deep")
                quality_gate_passed = best_acc >= threshold
    except Exception as e:
        print(f"Error checking mlflow in CICD: {e}")
        
    history = get_cicd_history()
    last_run = history[0] if history else None
    
    return {
        "hook_active": hook_active,
        "quality_gate_threshold": threshold,
        "best_model_accuracy": best_acc,
        "best_model_name": best_model_name,
        "best_run_id": best_run_id,
        "quality_gate_passed": quality_gate_passed,
        "last_run": last_run,
        "history_count": len(history)
    }

def run_cicd_pipeline() -> dict:
    """
    Simulate the complete CI/CD pipeline:
    1. Pre-commit check (quality gate threshold test)
    2. API service integration tests (if serving is live, else offline test mode)
    Saves results to history and returns logs.
    """
    start_time = time.time()
    logs = []
    
    logs.append(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Starting ML Studio MLOps CI/CD Pipeline Run...")
    logs.append("Environment: LOCAL_DEVELOPMENT")
    
    # ── Phase 1: Pre-commit Quality Gate Check ──
    logs.append("\n>>> Phase 1: Pre-commit Quality Gate Verification")
    
    status = get_cicd_status()
    threshold = status["quality_gate_threshold"]
    best_acc = status["best_model_accuracy"]
    best_name = status["best_model_name"]
    run_id = status["best_run_id"]
    
    logs.append(f"Retrieving best run from MLflow (experiment 'mon_projet_ml')...")
    logs.append(f"Best run ID: {run_id}")
    logs.append(f"Best run model name: {best_name}")
    logs.append(f"Best run accuracy: {best_acc:.4f}")
    logs.append(f"Target Quality Gate Threshold: >= {threshold:.2f}")
    
    gate_ok = best_acc >= threshold
    if gate_ok:
        logs.append(f"✅ Quality Gate Passed! Performance meets operational requirements ({best_acc:.4f} >= {threshold:.2f}).")
    else:
        logs.append(f"❌ QUALITY GATE FAILED: Performance too low ({best_acc:.4f} < {threshold:.2f}). Commit would be rejected!")
        
    # ── Phase 2: REST API serving integration smoke tests ──
    logs.append("\n>>> Phase 2: FastAPI /invocations Endpoint Smoke Tests")
    
    python_exe = get_python_exe()
    test_script = ROOT / "tests" / "test_api.py"
    
    test_ok = False
    if not test_script.exists():
        logs.append("⚠️ Smoke test script 'tests/test_api.py' not found! Skipping API check.")
        test_logs = "No test script found."
    else:
        logs.append(f"Running '{test_script.name}'...")
        try:
            res = subprocess.run(
                [python_exe, str(test_script.resolve())],
                cwd=str(ROOT),
                capture_output=True,
                text=True,
                timeout=15
            )
            test_logs = res.stdout + "\n" + res.stderr
            logs.append(res.stdout)
            if res.returncode == 0:
                logs.append("✅ FastAPI Model Serving Smoke Tests: PASSED!")
                test_ok = True
            else:
                logs.append(f"❌ FastAPI Model Serving Smoke Tests: FAILED (Code {res.returncode})!")
                logs.append(res.stderr)
        except subprocess.TimeoutExpired:
            logs.append("❌ FastAPI Smoke Test TIMEOUT (15s exceeded). Make sure serving is active on port 1234.")
            test_logs = "Timeout executing test script."
        except Exception as e:
            logs.append(f"❌ Error executing test script: {e}")
            test_logs = str(e)
            
    # Calculate totals
    duration = time.time() - start_time
    pipeline_ok = gate_ok and test_ok
    
    run_entry = {
        "id": f"run_{int(time.time())}",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "status": "success" if pipeline_ok else "failed",
        "gate_passed": gate_ok,
        "tests_passed": test_ok,
        "best_accuracy": best_acc,
        "accuracy_threshold": threshold,
        "duration_seconds": round(duration, 2),
        "logs": "\n".join(logs)
    }
    
    # Save to history
    history = get_cicd_history()
    history.insert(0, run_entry)
    save_cicd_history(history)
    
    return run_entry
