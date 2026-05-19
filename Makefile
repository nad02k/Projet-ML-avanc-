# ML Studio MLOps Pipeline Orchestrator

PYTHON = .\venv\Scripts\python.exe
PIP = .\venv\Scripts\pip.exe

.PHONY: setup train monitor serve pipeline help

help:
	@echo "ML Studio MLOps Commands:"
	@echo "  make setup    - Install dependencies"
	@echo "  make train    - Run AutoML pipeline"
	@echo "  make monitor  - Run Data Drift detection (Evidently + KS-Test)"
	@echo "  make serve    - Start the MLflow UI (port 5000)"
	@echo "  make pipeline - Full cycle: train -> monitor"

setup:
	$(PIP) install -r backend/requirements.txt

train:
	@echo ">>> Starting AutoML training..."
	curl -X POST http://localhost:5001/api/automl/run

monitor:
	@echo ">>> Starting monitoring..."
	$(PYTHON) backend/monitoring.py

serve:
	@echo ">>> Launching MLflow UI..."
	.\venv\Scripts\mlflow ui --host 0.0.0.0 --port 5000

pipeline: train monitor
	@echo ">>> MLOps Pipeline completed."
