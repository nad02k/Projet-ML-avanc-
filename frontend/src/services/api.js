/**
 * api.js — Central API service layer.
 * All backend calls go through here.
 * Requests go to /api/* which Vite proxies to Flask on :5001.
 */

const BASE = "/api";

async function _get(path) {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

async function _post(path, body) {
    const res = await fetch(`${BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

async function _postFile(path, file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BASE}${path}`, {
        method: "POST",
        body: formData,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

// ── Health ─────────────────────────────────────────────────────────────── //
export const checkHealth = () => _get("/health");

// ── Dashboard ──────────────────────────────────────────────────────────── //
export const fetchDashboard = () => _get("/dashboard");

// ── Dataset ────────────────────────────────────────────────────────────── //
export const fetchDataset = () => _get("/dataset");
export const uploadDataset = (file) => _postFile("/dataset/upload", file);

// ── Experiments ────────────────────────────────────────────────────────── //
export const fetchExperiments = () => _get("/experiments");

// ── Visualizations ─────────────────────────────────────────────────────── //
export const fetchVisualizations = () => _get("/visualizations");

// ── Train ──────────────────────────────────────────────────────────────── //
/**
 * @param {string} modelId  - e.g. "rf", "svm", "lr"
 * @param {object} params   - hyperparameter map
 */
export const trainModel = (modelId, params) =>
    _post("/train", { model_id: modelId, params });

// ── Tune ───────────────────────────────────────────────────────────────── //
export const tuneModel = (modelId, method) =>
    _post("/tune", { model_id: modelId, method });

// ── AutoML ─────────────────────────────────────────────────────────────── //
export const startAutoML = () => _post("/automl/run", {});
export const pollAutoML  = (jobId) => _get(`/automl/status/${jobId}`);

// ── Predict ────────────────────────────────────────────────────────────── //
export const predictModel = (modelId, features) =>
    _post("/predict", { model_id: modelId, features });

// ── MLflow UI ──────────────────────────────────────────────────────────── //
export const fetchMlflowStatus = () => _get("/mlflow/status");
export const startMlflowUi = (force = true) => _post("/mlflow/start", { force });

// ── Model Registry (Partie 3) ──────────────────────────────────────────── //
export const fetchRegistryModels = () => _get("/registry/models");
export const fetchRegistryBestRun = () => _get("/registry/best-run");
export const registerBestModel = (opts = {}) => _post("/registry/register", opts);
export const promoteModelVersion = (name, version, stage = "Production") =>
    _post("/registry/promote", { name, version, stage });

// ── Data drift (Partie 6) ──────────────────────────────────────────────── //
export const fetchDriftLatest = () => _get("/drift/latest");
export const runDriftCheck = (triggerRetrain = true) =>
    _post("/drift/run", { trigger_retrain: triggerRetrain });

// ── MLflow serving (Partie 4) ──────────────────────────────────────────── //
export const fetchServingStatus = () => _get("/serving/status");
export const startModelServing = (name = "mon_modele_production", stage = "Production") =>
    _post("/serving/start", { name, stage });
export const servingPredict = (features) => _post("/serving/predict", { features });

// ── CI/CD Quality Gate (Partie 5) ──────────────────────────────────────── //
export const fetchCicdStatus = () => _get("/cicd/status");
export const runCicdPipeline = () => _post("/cicd/run", {});
export const fetchCicdHistory = () => _get("/cicd/history");
