import mlflow
import pandas as pd

# Set MLflow tracking URI
mlflow.set_tracking_uri("sqlite:///preprocessing/mlflow.db")

def get_results():
    experiment = mlflow.get_experiment_by_name("Student_Performance_Analysis")
    if experiment is None:
        print("Experiment not found.")
        return
        
    runs = mlflow.search_runs(experiment_ids=[experiment.experiment_id])
    
    # Identify metric and param columns dynamically
    metric_cols = [c for c in runs.columns if c.startswith('metrics.')]
    param_cols = [c for c in runs.columns if c.startswith('params.')]
    run_name_col = ['run_name'] if 'run_name' in runs.columns else []
    
    actual_cols = run_name_col + param_cols + metric_cols
    
    # Sort by accuracy if it exists
    acc_col = 'metrics.accuracy'
    if acc_col in runs.columns:
        results = runs[actual_cols].sort_values(by=acc_col, ascending=False)
    else:
        results = runs[actual_cols]
    
    print("\nTop 10 Experiments by Accuracy:")
    print(results.head(10).to_string(index=False))
    
    results.to_csv("data/experiment_results.csv", index=False)
    print("\nFull results saved to data/experiment_results.csv")

if __name__ == "__main__":
    get_results()
