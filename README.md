# Projet ML Avancé - ML Studio

An advanced machine learning project featuring a full-featured React frontend (ML Studio) for data visualization, model management, and experiment tracking. The project includes data preprocessing pipelines, exploratory data analysis, and integrates with MLflow for robust experiment tracking.

## 📂 Project Structure

- **`data/`**: Contains the datasets used for the project (including the UCI Student Performance datasets: `student-mat.csv`, `student-por.csv`, etc.).
- **`preprocessing/`**: Contains Jupyter notebooks (e.g., `data_preprocessing.ipynb`) for data cleaning, preprocessing, and exploratory analysis. This directory also houses the MLflow SQLite tracking database (`mlflow.db`) and the `mlruns/` directory for experiment logs.
- **`models/`**: Stores serialized trained machine learning models and preprocessing artifacts (e.g., `scaler.pkl`).
- **`frontend/`**: A modern React web application built with Vite, serving as the user interface for the ML Studio. It includes dedicated sections for:
  - Dashboard
  - Model Selection and Comparison
  - Data Visualization
  - Experiment Tracking
  - AutoML Configuration

## 🛠️ Technologies Used

### Frontend
- **React 19** & **Vite**
- **Tailwind CSS** & **Headless UI** for styling and UI components
- **Recharts** for data visualization
- **React Router** for navigation
- **React Hot Toast** for notifications

### Machine Learning & Data Processing
- **Python** & **Jupyter Notebooks** for interactive data science
- **MLflow** for experiment tracking and model registry
- **Scikit-learn** (implied) for modeling and preprocessing

## 🚀 Getting Started (ML Studio app)

### Prerequisites

- Python 3.10+ and Node.js 18+
- Dataset artifacts in `data/` (`active_dataset.csv`, `splits.pkl`) — upload a CSV in the UI or run `preprocessing/data_preprocessing.ipynb`

### 1. Python environment

```powershell
cd D:\Projet_ML_avance
python -m venv .venv
.\.venv\Scripts\pip install -r backend\requirements.txt
```

### 2. Backend (Flask + MLflow)

```powershell
.\start-backend.ps1
```

- API: `http://localhost:5001/api/health`
- MLflow UI: `http://localhost:5000` (SQLite store: `mlflow.db` at project root)

### 3. Frontend

In a second terminal:

```powershell
.\start-frontend.ps1
```

Open **http://localhost:5173** — Vite proxies `/api` to the backend on port **5001**.

### 4. Exploring notebooks & ML experiments

You can explore the full machine learning workflow (preprocessing, dimensionality reduction, and model training) in the interactive Jupyter notebooks:
- **`preprocessing/data_preprocessing.ipynb`**: Original data exploration and cleaning.
- **`student_performance_modeling.ipynb`**: Comprehensive dimensionality reduction analysis (PCA/t-SNE) and systematic model training with MLflow.

Or launch MLflow UI only:

```powershell
.\.venv\Scripts\python.exe -m mlflow ui --port 5000 --backend-store-uri sqlite:///D:/Projet_ML_avance/mlflow.db
```

## 🤝 Contributing

Contributions to the ML models, preprocessing pipelines, or the React frontend are welcome. Please ensure that you test your changes locally before submitting a pull request.
