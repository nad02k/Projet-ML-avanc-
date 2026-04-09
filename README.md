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

## 🚀 Getting Started

### 1. Running the Frontend (ML Studio)

Ensure you have [Node.js](https://nodejs.org/) installed, then navigate to the frontend directory:

```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:5173`.

### 2. Exploring the Data & ML Experiments

You can explore the full machine learning workflow (preprocessing, dimensionality reduction, and model training) in the interactive Jupyter notebooks:
- **`preprocessing/data_preprocessing.ipynb`**: Original data exploration and cleaning.
- **`student_performance_modeling.ipynb`**: Comprehensive dimensionality reduction analysis (PCA/t-SNE) and systematic model training with MLflow.

If you have MLflow installed over Python, you can view the experiment logs by running the tracking UI in the `preprocessing/` folder:

```bash
cd preprocessing
mlflow ui --backend-store-uri sqlite:///mlflow.db
```

This will launch the MLflow tracking UI, typically available at `http://127.0.0.1:5000`.

## 🤝 Contributing

Contributions to the ML models, preprocessing pipelines, or the React frontend are welcome. Please ensure that you test your changes locally before submitting a pull request.
