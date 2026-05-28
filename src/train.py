"""
ML Studio MLOps — Multi-Model Training with MLflow (Partie 1 & 2)
Loads train/test splits, executes a config sweep over 3 model architectures,
logs all hyperparameters, metrics, plots, and classification reports,
and registers/promotes the best model in the MLflow Model Registry.
"""

import os
import sys
from pathlib import Path
import pandas as pd
import numpy as np
import joblib
import matplotlib
matplotlib.use('Agg')  # Non-interactive background for headless plotting
import matplotlib.pyplot as plt

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    roc_auc_score,
    precision_score,
    recall_score,
    ConfusionMatrixDisplay,
    classification_report
)

import mlflow
import mlflow.sklearn
from mlflow.tracking import MlflowClient

# Paths
ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
MODELS_DIR = ROOT / "models"
SCRATCH_DIR = ROOT / "scratch"
SCRATCH_DIR.mkdir(exist_ok=True)

SPLITS_PKL = DATA_DIR / "splits.pkl"
MLFLOW_DB = ROOT / "mlflow.db"

# 1. Setup MLflow Tracking URI
mlflow.set_tracking_uri(f"sqlite:///{MLFLOW_DB.as_posix()}")
mlflow.set_experiment('mon_projet_ml')

def run_training_sweeps():
    if not SPLITS_PKL.exists():
        raise FileNotFoundError(f"Splits file not found at: {SPLITS_PKL}. Run preprocess.py first.")
        
    print("Loading preprocessed splits...")
    X_train, X_test, y_train, y_test = joblib.load(SPLITS_PKL)
    
    # 2. Configurations for sweep (Partie 2.1)
    configs = [
        {
            'model': 'rf',
            'model_type': 'RandomForest',
            'n_estimators': 50,
            'max_depth': 3,
            'random_state': 42,
            'run_name': 'rf_baseline'
        },
        {
            'model': 'rf',
            'model_type': 'RandomForest',
            'n_estimators': 200,
            'max_depth': 10,
            'random_state': 42,
            'run_name': 'rf_deep'
        },
        {
            'model': 'gb',
            'model_type': 'GradientBoosting',
            'n_estimators': 100,
            'learning_rate': 0.1,
            'random_state': 42,
            'run_name': 'gb_model'
        }
    ]
    
    client = MlflowClient()
    print(f"Starting MLflow training sweep. Tracking to: {mlflow.get_tracking_uri()}")
    
    for cfg in configs:
        run_name = cfg['run_name']
        print(f"\n>>> Running configuration: {run_name}")
        
        with mlflow.start_run(run_name=run_name) as run:
            # 3. Log hyper-parameters (Partie 1.2)
            mlflow.log_params(cfg)
            
            # 4. Instantiate and fit model
            if cfg['model'] == 'rf':
                model = RandomForestClassifier(
                    n_estimators=cfg['n_estimators'],
                    max_depth=cfg['max_depth'],
                    random_state=cfg['random_state']
                )
            elif cfg['model'] == 'gb':
                model = GradientBoostingClassifier(
                    n_estimators=cfg['n_estimators'],
                    learning_rate=cfg['learning_rate'],
                    random_state=cfg['random_state']
                )
            else:
                raise ValueError(f"Unknown model type: {cfg['model']}")
                
            model.fit(X_train, y_train)
            
            # 5. Evaluate and compute metrics
            y_pred = model.predict(X_test)
            
            # Handle probability calculation dynamically based on classes
            classes = np.unique(y_train)
            if len(classes) == 2:
                y_proba = model.predict_proba(X_test)[:, 1]
                roc_auc = roc_auc_score(y_test, y_proba)
            else:
                y_proba = model.predict_proba(X_test)
                roc_auc = roc_auc_score(y_test, y_proba, multi_class='ovr')
                
            metrics = {
                'accuracy': accuracy_score(y_test, y_pred),
                'f1_score': f1_score(y_test, y_pred, average='weighted'),
                'precision': precision_score(y_test, y_pred, average='weighted', zero_division=0),
                'recall': recall_score(y_test, y_pred, average='weighted', zero_division=0),
                'roc_auc': roc_auc
            }
            
            # Log metrics (Partie 1.2)
            mlflow.log_metrics(metrics)
            print(f"Metrics logged: Accuracy={metrics['accuracy']:.4f} | F1={metrics['f1_score']:.4f} | ROC_AUC={metrics['roc_auc']:.4f}")
            
            # 6. Save model as pickle locally
            model_pkl_path = MODELS_DIR / f"latest_{cfg['model']}.pkl"
            joblib.dump(model, model_pkl_path)
            
            # 7. Log model to MLflow (Partie 1.2)
            mlflow.sklearn.log_model(
                sk_model=model,
                artifact_path='model'
            )
            
            # 8. Generate and log additional artifacts (Partie 1.3)
            # Plot confusion matrix
            fig, ax = plt.subplots(figsize=(8, 6))
            ConfusionMatrixDisplay.from_predictions(y_test, y_pred, ax=ax)
            cm_path = SCRATCH_DIR / 'confusion_matrix.png'
            plt.savefig(cm_path)
            plt.close()
            mlflow.log_artifact(str(cm_path))
            
            # Log classification report text file
            report = classification_report(y_test, y_pred)
            report_path = SCRATCH_DIR / 'classification_report.txt'
            with open(report_path, 'w') as f:
                f.write(report)
            mlflow.log_artifact(str(report_path))
            
            print(f"Artifacts successfully logged to run {run.info.run_id}")
            
    # 9. Identify best run programmatically (Partie 2.3)
    print("\n>>> Sweep complete! Programmatically querying best run...")
    experiment = client.get_experiment_by_name('mon_projet_ml')
    runs = client.search_runs(
        experiment_ids=[experiment.experiment_id],
        order_by=['metrics.accuracy DESC'],
        max_results=1
    )
    
    if not runs:
        print("No runs found.")
        return
        
    best_run = runs[0]
    best_run_id = best_run.info.run_id
    best_acc = best_run.data.metrics["accuracy"]
    print(f"Meilleur run : {best_run_id}")
    print(f"Accuracy     : {best_acc:.4f}")
    print(f"Paramètres   : {best_run.data.params}")
    
    # 10. Register and promote the best model in Model Registry (Partie 3)
    print("\n>>> Registering and promoting the best model...")
    model_name = 'mon_modele_production'
    model_uri = f'runs:/{best_run_id}/model'
    
    registered = mlflow.register_model(
        model_uri=model_uri,
        name=model_name
    )
    version = registered.version
    print(f"Version enregistrée : {version}")
    
    # Add description and tags
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
    
    # Promote to Staging
    client.transition_model_version_stage(
        name=model_name,
        version=version,
        stage='Staging',
        archive_existing_versions=False
    )
    print(f"Modèle v{version} promu en Staging.")
    
    # Promotion check to Production (Threshold = 0.85)
    SEUIL_PRODUCTION = 0.85
    if best_acc >= SEUIL_PRODUCTION:
        client.transition_model_version_stage(
            name=model_name,
            version=version,
            stage='Production',
            archive_existing_versions=True
        )
        print(f"Modèle v{version} promu en Production (Accuracy {best_acc:.3f} >= seuil {SEUIL_PRODUCTION}).")
    else:
        print(f"Modèle non promu en Production : accuracy {best_acc:.3f} < seuil {SEUIL_PRODUCTION}")

if __name__ == "__main__":
    run_training_sweeps()
