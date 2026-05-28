"""
ML Studio MLOps — Programmatic Run Query (Partie 2.3)
Queries the local SQLite DB to identify the highest performing run.
"""

from pathlib import Path
import mlflow
from mlflow.tracking import MlflowClient

# Paths
ROOT = Path(__file__).resolve().parent.parent
MLFLOW_DB = ROOT / "mlflow.db"

def main():
    # Set local SQLite Tracking URI
    mlflow.set_tracking_uri(f"sqlite:///{MLFLOW_DB.as_posix()}")
    
    client = MlflowClient()
    experiment = client.get_experiment_by_name('mon_projet_ml')
    
    if not experiment:
        print("L'expérience 'mon_projet_ml' n'a pas été trouvée. Veuillez d'abord exécuter le script d'entraînement.")
        return
        
    runs = client.search_runs(
        experiment_ids=[experiment.experiment_id],
        order_by=['metrics.accuracy DESC'],
        max_results=5
    )
    
    if not runs:
        print("Aucun run trouvé dans l'expérience 'mon_projet_ml'.")
        return
        
    best_run = runs[0]
    print(f"Meilleur run : {best_run.info.run_id}")
    print(f"Accuracy     : {best_run.data.metrics.get('accuracy', 0.0):.4f}")
    print(f"Paramètres   : {best_run.data.params}")

if __name__ == "__main__":
    main()
