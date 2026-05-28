"""Register best MLflow run in Model Registry (Partie 3)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from registry_service import register_best_model

if __name__ == "__main__":
    result = register_best_model()
    print(result)
