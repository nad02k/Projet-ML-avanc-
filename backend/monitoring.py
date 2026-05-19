import numpy as np
import pandas as pd
import mlflow
import joblib
import traceback
import requests
from pathlib import Path
from scipy import stats

# Setup paths
ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
MODELS_DIR = ROOT / "models"
ACTIVE_DATASET_CSV = DATA_DIR / "active_dataset.csv"
SPLITS_PKL = DATA_DIR / "splits.pkl"

def simulate_drift(df):
    """Simulates data drift by shifting numerical features and adding noise."""
    df_drift = df.copy()
    num_cols = df_drift.select_dtypes(include=[np.number]).columns
    
    if len(num_cols) > 0:
        # Shift the first two numerical columns significantly
        for col in num_cols[:min(2, len(num_cols))]:
            df_drift[col] = df_drift[col] * 1.5 + np.random.normal(0, 2, len(df_drift))
            
    return df_drift

def run_monitoring():
    print(">>> MLOps: Starting Data Drift Monitoring...")
    mlflow.set_tracking_uri("sqlite:///mlflow.db")
    mlflow.set_experiment("Student_Performance_Monitoring")
    
    try:
        # 1. Load Reference Data (Original Training Set)
        if not SPLITS_PKL.exists():
            print(">>> Error: splits.pkl not found. Run pipeline first.")
            return
        
        X_train, X_test, y_train, y_test = joblib.load(SPLITS_PKL)
        
        # Load trained columns names
        features_path = MODELS_DIR / "features.pkl"
        if features_path.exists():
            features = joblib.load(features_path)
        else:
            features = [f"feature_{i}" for i in range(X_test.shape[1])]
            
        # Convert reference to DataFrame
        X_test_df = pd.DataFrame(X_test, columns=features)
        
        # 2. Simulate Production Data (Drifted)
        X_prod = simulate_drift(X_test_df)
        
        with mlflow.start_run(run_name="drift_check"):
            # 3. Statistical KS-Test per feature
            print(">>> MLOps: Running KS-Tests...")
            results = []
            n_drifted = 0
            n_total = len(X_test_df.columns)
            
            for col in X_test_df.columns:
                # We can only do KS test on numerical features
                if pd.api.types.is_numeric_dtype(X_test_df[col]):
                    stat, pvalue = stats.ks_2samp(X_test_df[col].dropna(), X_prod[col].dropna())
                    drifted = pvalue < 0.05
                    if drifted:
                        n_drifted += 1
                    results.append({
                        'feature': col,
                        'ks_stat': round(stat, 4),
                        'p_value': round(pvalue, 4),
                        'drifted': drifted
                    })
                    mlflow.log_metric(f"ks_pvalue_{col}", pvalue)
            
            # Calculate overall drift share based on KS-test
            drift_share = n_drifted / max(1, len([c for c in X_test_df.columns if pd.api.types.is_numeric_dtype(X_test_df[c])]))
            dataset_drift = drift_share > 0.30

            mlflow.log_metric("drift_share", drift_share)
            mlflow.log_metric("drifted_columns", n_drifted)
            mlflow.log_metric("total_columns", n_total)
            mlflow.log_metric("dataset_drifted", int(dataset_drift))
            
            # Log results to CSV
            df_drift = pd.DataFrame(results)
            results_path = ROOT / "scratch" / "ks_drift_results.csv"
            df_drift.to_csv(results_path, index=False)
            mlflow.log_artifact(str(results_path))
            
            print(f">>> MLOps: Drift Share: {drift_share:.2%} ({n_drifted} drifted features detected via KS-test)")
            
            # 4. Automatic Retraining Trigger
            SEUIL_DRIFT = 0.30
            if drift_share > SEUIL_DRIFT:
                print(f">>> CRITICAL: Drift {drift_share:.2%} exceeds threshold {SEUIL_DRIFT:.0%}. Triggering retraining...")
                try:
                    res = requests.post("http://localhost:5001/api/automl/run")
                    if res.status_code == 200:
                        print(">>> MLOps: Retraining triggered successfully.")
                        mlflow.log_metric("retrain_triggered", 1)
                    else:
                        print(f">>> Warning: Retraining failed with status {res.status_code}")
                        mlflow.log_metric("retrain_triggered", 0)
                except Exception as e:
                    print(f">>> Warning: Could not reach backend to trigger retraining. {e}")
                    mlflow.log_metric("retrain_triggered", 0)
            else:
                print(f">>> OK: Drift {drift_share:.2%} is within stable limits.")
                mlflow.log_metric("retrain_triggered", 0)
                
            print(">>> MLOps: Monitoring complete. Results logged to MLflow.")

    except Exception as e:
        print(f">>> MLOps Monitoring Error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    run_monitoring()

