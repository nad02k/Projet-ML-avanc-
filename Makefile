# ML Studio MLOps Pipeline Orchestrator

PYTHON = .\.venv\Scripts\python.exe
PIP = .\.venv\Scripts\pip.exe

.PHONY: setup preprocess train register monitor serve-ui serve-model test pipeline help

help:
	@echo "ML Studio MLOps Commands:"
	@echo "  make setup        - Install all dependencies from requirements.txt"
	@echo "  make preprocess   - Run data preprocessing pipeline"
	@echo "  make train        - Run preprocess and multi-model MLflow training sweep"
	@echo "  make register     - Programmatically register best model in Model Registry"
	@echo "  make serve-ui     - Launch MLflow Tracking UI on port 5000"
	@echo "  make serve-model  - Serve Production model on port 1234 via REST API"
	@echo "  make monitor      - Run Evidently + KS-test drift check & auto-retrain"
	@echo "  make test         - Run REST API prediction endpoint smoke test"
	@echo "  make pipeline     - Run full training, registration, and drift verification pipeline"

setup:
	$(PIP) install -r requirements.txt

preprocess:
	$(PYTHON) src/preprocess.py

train:
	@echo ">>> Starting preprocessing and training sweep..."
	$(PYTHON) src/preprocess.py
	$(PYTHON) src/train.py

register:
	@echo ">>> Registering and promoting best model..."
	$(PYTHON) src/register_best_model.py

monitor:
	@echo ">>> Executing Evidently & KS-test drift analysis..."
	$(PYTHON) src/simulate_drift.py

serve-ui:
	@echo ">>> Launching MLflow UI on port 5000..."
	$(PYTHON) -m mlflow ui --host 0.0.0.0 --port 5000 --backend-store-uri sqlite:///d:/Projet_ML_avance/mlflow.db

serve-model:
	@echo ">>> Serving Production model on port 1234 (FastAPI)..."
	$(PYTHON) src/serve.py

test:
	@echo ">>> Running prediction REST API smoke test..."
	$(PYTHON) tests/test_api.py

pipeline: train register test
	@echo ">>> MLOps Pipeline completed successfully."
