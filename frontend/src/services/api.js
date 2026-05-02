/**
 * api.js — Central API service layer.
 * All backend calls go through here.
 * Requests go to /api/* which Vite proxies to Flask on :5000.
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

// ── Health ─────────────────────────────────────────────────────────────── //
export const checkHealth = () => _get("/health");

// ── Dashboard ──────────────────────────────────────────────────────────── //
export const fetchDashboard = () => _get("/dashboard");

// ── Dataset ────────────────────────────────────────────────────────────── //
export const fetchDataset = () => _get("/dataset");

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
