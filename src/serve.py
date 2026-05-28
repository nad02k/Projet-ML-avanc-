"""
ML Studio MLOps — FastAPI Model Serving (Partie 4.2 — Alternative avancée)
Serves the Production model from the MLflow Registry via a REST API endpoint.
Automatically reloads the model when a new Production version is promoted.
"""

import os
import sys
from pathlib import Path
import numpy as np
import joblib

import mlflow
import mlflow.sklearn
from mlflow.tracking import MlflowClient

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import threading
import time

# ─── Paths ───────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
MLFLOW_DB = ROOT / "mlflow.db"
FEATURES_PKL = ROOT / "models" / "features.pkl"

# ─── MLflow setup ────────────────────────────────────────────────────────────
TRACKING_URI = f"sqlite:///{MLFLOW_DB.as_posix()}"
mlflow.set_tracking_uri(TRACKING_URI)
client = MlflowClient(tracking_uri=TRACKING_URI)

MODEL_NAME = os.environ.get("MODEL_NAME", "mon_modele_production")
MODEL_STAGE = os.environ.get("MODEL_STAGE", "Production")

# ─── Global model state ─────────────────────────────────────────────────────
_current_model = None
_current_version = None
_feature_names = []

# ─── Pydantic schemas ───────────────────────────────────────────────────────
class DataframeSplit(BaseModel):
    columns: List[str]
    data: List[List[float]]

class PredictionRequest(BaseModel):
    dataframe_split: DataframeSplit

class PredictionResponse(BaseModel):
    predictions: List[float]

# ─── Model loader ────────────────────────────────────────────────────────────
def load_production_model():
    """Load or reload the Production-stage model from the MLflow Registry."""
    global _current_model, _current_version, _feature_names

    try:
        # Query all versions for the model with stage MODEL_STAGE
        stages = [MODEL_STAGE] if MODEL_STAGE else ["Production", "Staging"]
        versions = client.get_latest_versions(MODEL_NAME, stages=stages)
        if not versions and "Production" in stages:
            # Fallback to Staging
            versions = client.get_latest_versions(MODEL_NAME, stages=["Staging"])
        if not versions:
            print("[WARN] No Production or Staging model found in registry.")
            return False

        latest = versions[0]
        new_version = latest.version

        if new_version != _current_version:
            print(f"Loading model '{MODEL_NAME}' version {new_version} (stage: {latest.current_stage})...")
            model_uri = f"models:/{MODEL_NAME}/{latest.current_stage}"
            _current_model = mlflow.sklearn.load_model(model_uri)
            _current_version = new_version
            print(f"Model v{new_version} loaded successfully.")
        
        # Load feature names
        if FEATURES_PKL.exists():
            _feature_names = joblib.load(FEATURES_PKL)

        return True
    except Exception as e:
        print(f"[ERROR] Failed to load model: {e}")
        return False

# ─── Background watcher (auto-reload) ────────────────────────────────────────
def _background_model_watcher(interval: int = 60):
    """Periodically checks the registry for new Production versions."""
    while True:
        time.sleep(interval)
        try:
            load_production_model()
        except Exception as e:
            print(f"[WARN] Background reload failed: {e}")

# ─── FastAPI app ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="ML Studio — Model Serving API",
    description="REST API serving the Production model from the MLflow Model Registry.",
    version="1.0.0"
)

@app.on_event("startup")
def startup():
    """Load the model at startup and launch the background watcher."""
    success = load_production_model()
    if not success:
        print("[WARN] No model loaded at startup. Predictions will fail until a model is registered.")
    
    # Start background watcher thread
    watcher = threading.Thread(target=_background_model_watcher, args=(120,), daemon=True)
    watcher.start()
    print("Background model watcher started (checking every 120s).")

@app.get("/health")
def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model_name": MODEL_NAME,
        "model_version": _current_version,
        "model_loaded": _current_model is not None
    }

@app.post("/invocations", response_model=PredictionResponse)
def invocations(request: PredictionRequest):
    """
    MLflow-compatible prediction endpoint.
    Accepts a dataframe_split payload with columns and data.
    """
    if _current_model is None:
        raise HTTPException(
            status_code=503,
            detail="No model is currently loaded. Register a model in Production first."
        )

    try:
        data = np.array(request.dataframe_split.data)
        predictions = _current_model.predict(data).tolist()
        return PredictionResponse(predictions=predictions)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {str(e)}")

@app.get("/model-info")
def model_info():
    """Returns metadata about the currently loaded model."""
    return {
        "model_name": MODEL_NAME,
        "model_version": _current_version,
        "feature_names": _feature_names,
        "n_features": len(_feature_names) if _feature_names else "unknown"
    }

if __name__ == "__main__":
    print("Starting FastAPI Model Serving on port 1234...")
    uvicorn.run(app, host="127.0.0.1", port=1234, log_level="info")
