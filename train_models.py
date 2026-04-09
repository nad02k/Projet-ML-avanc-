import pandas as pd
import numpy as np
import mlflow
import mlflow.sklearn
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.preprocessing import StandardScaler
import os

# Set MLflow tracking URI (using local sqlite db as seen in project structure)
mlflow.set_tracking_uri("sqlite:///preprocessing/mlflow.db")
mlflow.set_experiment("Student_Performance_Analysis")

def load_data():
    df = pd.read_csv("data/student_clean.csv")
    X = df.drop(columns=['pass', 'G3', 'score']) # Drop targets and highly correlated score
    y = df['pass']
    return train_test_split(X, y, test_size=0.2, random_state=42)

def train_and_log_model(model_name, model, X_train, X_test, y_train, y_test, params):
    with mlflow.start_run(run_name=model_name):
        # Train
        model.fit(X_train, y_train)
        
        # Predict
        y_pred = model.predict(X_test)
        
        # Metrics
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        
        # Log params
        mlflow.log_params(params)
        
        # Log metrics
        mlflow.log_metric("accuracy", acc)
        mlflow.log_metric("precision", prec)
        mlflow.log_metric("recall", rec)
        mlflow.log_metric("f1_score", f1)
        
        # Log model
        mlflow.sklearn.log_model(model, "model")
        
        print(f"Logged {model_name}: Acc={acc:.4f}, F1={f1:.4f}")

if __name__ == "__main__":
    X_train, X_test, y_train, y_test = load_data()
    
    # Scaling is important for KNN and SVM
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # 1. KNN Experiments
    print("Running KNN experiments...")
    for k in [3, 5, 7, 11]:
        train_and_log_model(
            "KNN", 
            KNeighborsClassifier(n_neighbors=k),
            X_train_scaled, X_test_scaled, y_train, y_test,
            {"n_neighbors": k}
        )
        
    # 2. SVM Experiments
    print("Running SVM experiments...")
    for kernel in ['linear', 'rbf']:
        for C in [0.1, 1.0, 10.0]:
            train_and_log_model(
                "SVM",
                SVC(kernel=kernel, C=C),
                X_train_scaled, X_test_scaled, y_train, y_test,
                {"kernel": kernel, "C": C}
            )
            
    # 3. Random Forest Experiments
    print("Running Random Forest experiments...")
    for n_est in [50, 100, 200]:
        for depth in [None, 5, 10]:
            train_and_log_model(
                "RandomForest",
                RandomForestClassifier(n_estimators=n_est, max_depth=depth, random_state=42),
                X_train, X_test, y_train, y_test,
                {"n_estimators": n_est, "max_depth": depth}
            )
            
    # 4. Logistic Regression Experiments
    print("Running Logistic Regression experiments...")
    for C in [0.1, 1.0, 10.0]:
        train_and_log_model(
            "LogisticRegression",
            LogisticRegression(C=C, max_iter=1000),
            X_train_scaled, X_test_scaled, y_train, y_test,
            {"C": C}
        )

    print("All experiments completed.")
