"""
ML Studio MLOps — API REST Integration Tests (Partie 4 & 5)
Dynamically reads the feature names and a few real test split rows,
sends them as a payload to the MLflow serving endpoint on port 1234,
and asserts successful prediction responses.
"""

from pathlib import Path
import json
import requests
import joblib
import numpy as np

# Paths
ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
MODELS_DIR = ROOT / "models"

SPLITS_PKL = DATA_DIR / "splits.pkl"
FEATURES_PKL = MODELS_DIR / "features.pkl"

def main():
    print("Initializing local API serving smoke test...")
    url = "http://127.0.0.1:1234/invocations"
    
    # 1. Load exact features metadata to keep schema aligned
    if FEATURES_PKL.exists():
        columns = joblib.load(FEATURES_PKL)
        print(f"Loaded feature schema: {len(columns)} columns.")
    else:
        # Fallback to defaults
        columns = ["feature1", "feature2", "feature3"]
        print("Feature schema missing. Using fallback dummy columns.")
        
    # 2. Extract real data rows from X_test if available
    if SPLITS_PKL.exists():
        _, X_test, _, _ = joblib.load(SPLITS_PKL)
        # Take the first two rows
        sample_data = X_test[:2].tolist()
        print(f"Loaded {len(sample_data)} real test samples for payload.")
    else:
        sample_data = [[1.2, 0.5, 3.1], [0.8, 1.1, 2.4]]
        print("Splits missing. Using fallback dummy data.")
        
    # 3. Construct standard MLflow dataframe_split payload
    payload = {
        "dataframe_split": {
            "columns": list(columns),
            "data": sample_data
        }
    }
    
    headers = {"Content-Type": "application/json"}
    
    print(f"Sending POST request to MLflow serving endpoint: {url}")
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response text: {response.text}")
        
        if response.status_code == 200:
            print("\n[SUCCESS] REST Serving endpoint is live and responded with valid predictions!")
            predictions = response.json()
            print("Predictions output:", predictions)
            
            # Simple validation check on predictions structure
            if "predictions" in predictions:
                print("Assertion OK: 'predictions' key present in response.")
            elif "dataframe_split" in predictions or isinstance(predictions, list):
                print("Assertion OK: Response format matches standard list/split predictions.")
            else:
                print("Warning: Response was 200 OK but format is custom.")
        else:
            print(f"\n[FAIL] Serving endpoint returned error status: {response.status_code}")
            sys.exit(1)
            
    except requests.exceptions.ConnectionError:
        print("\n[FAIL] Connection refused. Is the MLflow model serve running on port 1234?")
        print("Run 'make serve' first, then run this test.")
        sys.exit(1)
    except Exception as e:
        print(f"\n[FAIL] Test encountered an unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    import sys
    main()
