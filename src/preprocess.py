"""
ML Studio MLOps — Preprocessing Pipeline (Partie 1)
Loads raw data, handles target leakage, encodes categorical columns,
applies scaling, and exports train/test splits.
"""

import os
from pathlib import Path
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder

# Paths
ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
MODELS_DIR = ROOT / "models"
MODELS_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

CLEAN_DATA_CSV = DATA_DIR / "student_clean.csv"
SPLITS_PKL = DATA_DIR / "splits.pkl"
SCALER_PKL = MODELS_DIR / "scaler.pkl"
FEATURES_PKL = MODELS_DIR / "features.pkl"

def run_preprocessing_pipeline(csv_path: Path = CLEAN_DATA_CSV):
    if not csv_path.exists():
        raise FileNotFoundError(f"Cleaned dataset not found at: {csv_path}")
        
    print(f"Loading data from {csv_path.name}...")
    df = pd.read_csv(csv_path)
    
    # 1. Identify target
    target = None
    if 'pass' in df.columns:
        target = 'pass'
    elif 'G3' in df.columns:
        target = 'G3'
    else:
        target = df.columns[-1]
        
    print(f"Target column detected: '{target}'")
    
    # 2. Drop leakage columns
    df_clean = df.dropna(subset=[target])
    cols_to_drop = [target]
    for leakage_col in ['G3', 'score']:
        if leakage_col in df_clean.columns and leakage_col != target:
            cols_to_drop.append(leakage_col)
            
    print(f"Dropping target leakage columns: {cols_to_drop}")
    X = df_clean.drop(columns=cols_to_drop, errors="ignore")
    y = df_clean[target]
    
    # 3. Label encode target if non-numeric
    if y.dtype == object or not pd.api.types.is_numeric_dtype(y):
        print("Label encoding non-numeric target...")
        le = LabelEncoder()
        y = le.fit_transform(y.astype(str))
        
    # 4. One-Hot Encode categorical variables
    print("One-hot encoding categorical variables...")
    X = pd.get_dummies(X, drop_first=True)
    
    # 5. Handle missing values
    numeric_cols = X.select_dtypes(include=[np.number]).columns
    if not numeric_cols.empty:
        X[numeric_cols] = X[numeric_cols].fillna(X[numeric_cols].median())
    X = X.fillna(0)
    
    # 6. Fit and apply Scaling
    print("Applying StandardScaler...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # 7. Split dataset (80/20 train/test)
    print("Splitting dataset into train/test (80/20)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42
    )
    
    # 8. Save artifacts
    print("Saving processed splits and metadata...")
    joblib.dump((X_train, X_test, y_train, y_test), SPLITS_PKL)
    joblib.dump(scaler, SCALER_PKL)
    joblib.dump(list(X.columns), FEATURES_PKL)
    
    print(f"Preprocessing successfully complete!")
    print(f" - Train set shape: {X_train.shape}")
    print(f" - Test set shape : {X_test.shape}")
    print(f" - Saved splits to: {SPLITS_PKL.name}")
    print(f" - Saved scaler to: {SCALER_PKL.name}")
    print(f" - Saved features to: {FEATURES_PKL.name}")

if __name__ == "__main__":
    run_preprocessing_pipeline()
