"""
ML Studio MLOps — Model Registry Promotion Script (Partie 3)
Finds the best run, registers it, updates metadata,
and handles transitions from Staging to Production.
"""

from pathlib import Path
import mlflow
from mlflow.tracking import MlflowClient

# Paths
ROOT = Path(__file__).resolve().parent.parent
MLFLOW_DB = ROOT / "mlflow.db"

def main():
    # Set SQLite Tracking URI
    mlflow.set_tracking_uri(f"sqlite:///{MLFLOW_DB.as_posix()}")
    
    client = MlflowClient()
    experiment = client.get_experiment_by_name('mon_projet_ml')
    
    if not experiment:
        print("L'expérience 'mon_projet_ml' n'a pas été trouvée. Run train.py first.")
        return
        
    runs = client.search_runs(
        experiment_ids=[experiment.experiment_id],
        order_by=['metrics.accuracy DESC'],
        max_results=1
    )
    
    if not runs:
        print("Aucun run trouvé.")
        return
        
    best_run = runs[0]
    best_run_id = best_run.info.run_id
    acc = best_run.data.metrics.get('accuracy', 0.0)
    
    print(f"Meilleur run ID: {best_run_id} (Accuracy: {acc:.4f})")
    
    # 1. Enregistrement du modèle (Partie 3.1)
    model_name = 'mon_modele_production'
    model_uri = f'runs:/{best_run_id}/model'
    
    print(f"Enregistrement du modèle '{model_name}'...")
    registered = mlflow.register_model(
        model_uri=model_uri,
        name=model_name
    )
    version = registered.version
    print(f"Version enregistrée : {version}")
    
    # 2. Ajout de description et de tags (Partie 3.1)
    client.update_registered_model(
        name=model_name,
        description='Modèle de classification — version optimisée'
    )
    
    client.set_model_version_tag(
        name=model_name,
        version=version,
        key='validated_by',
        value='equipe_data'
    )
    
    # 3. Transition de cycle de vie (Partie 3.2)
    # Promouvoir le modèle en Staging
    client.transition_model_version_stage(
        name=model_name,
        version=version,
        stage='Staging',
        archive_existing_versions=False
    )
    print(f"Modèle v{version} promu en Staging.")
    
    # Validation avant promotion en Production (Threshold = 0.85)
    SEUIL_PRODUCTION = 0.85
    if acc >= SEUIL_PRODUCTION:
        client.transition_model_version_stage(
            name=model_name,
            version=version,
            stage='Production',
            archive_existing_versions=True
        )
        print(f"Modèle v{version} promu en Production (Accuracy {acc:.3f} >= seuil {SEUIL_PRODUCTION}).")
    else:
        print(f"Modèle non promu : accuracy {acc:.3f} < seuil {SEUIL_PRODUCTION}")

if __name__ == "__main__":
    main()
