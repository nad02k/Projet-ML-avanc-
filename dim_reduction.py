import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import mlflow

# Set MLflow tracking URI
mlflow.set_tracking_uri("sqlite:///preprocessing/mlflow.db")
mlflow.set_experiment("Student_Performance_Analysis")

def load_data():
    df = pd.read_csv("data/student_clean.csv")
    X = df.drop(columns=['pass', 'G3', 'score'])
    y = df['pass']
    return X, y

def visualize_reduction(X, y, method="PCA"):
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    if method == "PCA":
        reducer = PCA(n_components=2)
        title = "PCA Visualization"
    else:
        reducer = TSNE(n_components=2, random_state=42)
        title = "t-SNE Visualization"
        
    embedding = reducer.fit_transform(X_scaled)
    
    plt.figure(figsize=(10, 6))
    sns.scatterplot(x=embedding[:, 0], y=embedding[:, 1], hue=y, palette="viridis", alpha=0.7)
    plt.title(title)
    plt.xlabel(f"{method} 1")
    plt.ylabel(f"{method} 2")
    plt.savefig(f"data/{method.lower()}_viz.png")
    print(f"Saved {title} to data/{method.lower()}_viz.png")

def experiment_with_reduction(X, y):
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # PCA reduction to 5 components (explaining ~80% variance usually)
    pca = PCA(n_components=5)
    X_pca = pca.fit_transform(X_scaled)
    
    # Split
    from sklearn.model_selection import train_test_split
    X_train_orig, X_test_orig, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
    X_train_pca, X_test_pca, _, _ = train_test_split(X_pca, y, test_size=0.2, random_state=42)
    
    # Train RF on Original
    with mlflow.start_run(run_name="RF_FullFeatures"):
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        model.fit(X_train_orig, y_train)
        acc = accuracy_score(y_test, model.predict(X_test_orig))
        mlflow.log_params({"features": "full", "n_estimators": 100})
        mlflow.log_metric("accuracy", acc)
        mlflow.log_metric("n_features", X_scaled.shape[1])
        print(f"RF Full Features Acc: {acc:.4f}")
        
    # Train RF on PCA
    with mlflow.start_run(run_name="RF_PCA_Reduced"):
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        model.fit(X_train_pca, y_train)
        acc = accuracy_score(y_test, model.predict(X_test_pca))
        mlflow.log_params({"features": "pca_5", "n_estimators": 100})
        mlflow.log_metric("accuracy", acc)
        mlflow.log_metric("n_features", 5)
        print(f"RF PCA(5) Acc: {acc:.4f}")

if __name__ == "__main__":
    X, y = load_data()
    print("Visualizing with PCA and t-SNE...")
    visualize_reduction(X, y, method="PCA")
    visualize_reduction(X, y, method="TSNE")
    
    print("Comparing models with/without dimensionality reduction...")
    experiment_with_reduction(X, y)
    print("Dimensionality reduction tasks completed.")
