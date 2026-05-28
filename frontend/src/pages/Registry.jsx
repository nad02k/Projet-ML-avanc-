import { useState, useEffect, useCallback } from 'react';
import {
    fetchRegistryModels,
    fetchRegistryBestRun,
    registerBestModel,
    promoteModelVersion,
    fetchMlflowStatus,
    startMlflowUi,
    fetchServingStatus,
    startModelServing,
    servingPredict,
} from '../services/api';
import {
    Package, Upload, ArrowUpCircle, ExternalLink, Loader2,
    CheckCircle, AlertTriangle, Server, Play
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Registry() {
    const [models, setModels] = useState([]);
    const [bestRun, setBestRun] = useState(null);
    const [mlflow, setMlflow] = useState(null);
    const [serving, setServing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const [m, ml, sv] = await Promise.all([
                fetchRegistryModels(),
                fetchMlflowStatus(),
                fetchServingStatus(),
            ]);
            setModels(m.models || []);
            setMlflow(ml);
            setServing(sv);
            try {
                const b = await fetchRegistryBestRun();
                setBestRun(b);
            } catch {
                setBestRun(null);
            }
        } catch (e) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const handleRegister = async () => {
        setBusy('register');
        try {
            const r = await registerBestModel();
            toast.success(r.message || `Registered v${r.version} → ${r.stage}`);
            refresh();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy('');
        }
    };

    const handlePromote = async (name, version) => {
        setBusy(`promote-${version}`);
        try {
            await promoteModelVersion(name, version, 'Production');
            toast.success(`Version ${version} → Production`);
            refresh();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy('');
        }
    };

    const handleStartMlflow = async () => {
        setBusy('mlflow');
        try {
            const r = await startMlflowUi(true);
            if (r.status === 'running') {
                toast.success('MLflow UI is running');
                window.open(r.url, '_blank');
            } else {
                toast.error(r.message || 'MLflow failed to start');
            }
            refresh();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy('');
        }
    };

    const handleStartServing = async () => {
        setBusy('serve');
        try {
            const r = await startModelServing();
            if (r.status === 'running') {
                toast.success(`Serving on port ${r.port}`);
            } else {
                toast.error(r.message || 'Start serving failed — register Production model first');
            }
            refresh();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy('');
        }
    };

    const handleTestServing = async () => {
        if (!bestRun) {
            toast.error('No best run / features');
            return;
        }
        setBusy('test');
        try {
            const r = await servingPredict({});
            toast.success(`Prediction: ${JSON.stringify(r)}`);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy('');
        }
    };

    const primary = models.find(m => m.name === 'mon_modele_production') || models[0];

    return (
        <div className="space-y-8 animate-fade-up">
            <div className="section-header">
                <div>
                    <h1 className="page-title">Model Registry</h1>
                    <p className="page-subtitle">Partie 3 — Enregistrement, Staging, Production (MLflow)</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary" onClick={handleStartMlflow} disabled={busy === 'mlflow'}>
                        {busy === 'mlflow' ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                        Open MLflow UI
                    </button>
                    <button className="btn-primary" onClick={handleRegister} disabled={busy === 'register'}>
                        {busy === 'register' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        Register best run
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-5">
                    <div className="text-xs font-bold uppercase text-slate-400 mb-2">MLflow UI</div>
                    {loading ? <Loader2 className="animate-spin" /> : (
                        <>
                            <div className={`flex items-center gap-2 ${mlflow?.running ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {mlflow?.running ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                                <span className="font-semibold">{mlflow?.running ? 'Running' : 'Stopped'}</span>
                            </div>
                            {mlflow?.url && (
                                <a href={mlflow.url} target="_blank" rel="noreferrer" className="text-sm text-accent mt-2 block">
                                    {mlflow.url}
                                </a>
                            )}
                        </>
                    )}
                </div>
                <div className="glass-card p-5">
                    <div className="text-xs font-bold uppercase text-slate-400 mb-2">Best run</div>
                    {bestRun ? (
                        <>
                            <div className="text-2xl font-bold text-emerald-600">{(bestRun.accuracy * 100).toFixed(1)}%</div>
                            <div className="text-xs text-slate-500 font-mono mt-1">{bestRun.run_id?.slice(0, 12)}…</div>
                        </>
                    ) : (
                        <div className="text-sm text-slate-500">Train a model first</div>
                    )}
                </div>
                <div className="glass-card p-5">
                    <div className="text-xs font-bold uppercase text-slate-400 mb-2">Native serving (:1234)</div>
                    {serving?.running ? (
                        <div className="text-sm text-emerald-600 font-semibold">Active — {serving.invocations}</div>
                    ) : (
                        <div className="text-sm text-slate-500">Not running</div>
                    )}
                    <button className="btn-secondary w-full mt-3 text-xs" onClick={handleStartServing} disabled={busy === 'serve'}>
                        <Server size={12} /> Start MLflow serve
                    </button>
                </div>
            </div>

            {primary && (
                <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Package className="text-accent" />
                        <h2 className="font-bold text-lg">{primary.name}</h2>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">{primary.description || '—'}</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-400 border-b">
                                    <th className="py-2">Version</th>
                                    <th>Stage</th>
                                    <th>Run ID</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {(primary.versions || []).map(v => (
                                    <tr key={v.version} className="border-b border-slate-100">
                                        <td className="py-3 font-mono">v{v.version}</td>
                                        <td><span className="badge badge-purple">{v.stage}</span></td>
                                        <td className="font-mono text-xs text-slate-500">{v.run_id?.slice(0, 10)}…</td>
                                        <td>
                                            {v.stage !== 'Production' && (
                                                <button
                                                    className="btn-secondary text-xs"
                                                    disabled={busy === `promote-${v.version}`}
                                                    onClick={() => handlePromote(primary.name, v.version)}
                                                >
                                                    <ArrowUpCircle size={12} /> Production
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!loading && models.length === 0 && (
                <div className="glass-card p-10 text-center text-slate-500">
                    No registered models. Click &quot;Register best run&quot; after training.
                </div>
            )}

            <div className="glass-card p-6">
                <h3 className="font-bold mb-2">Partie 4 — Test serving</h3>
                <p className="text-sm text-slate-500 mb-4">Requires Production model and `mlflow models serve` on port 1234.</p>
                <button className="btn-primary" onClick={handleTestServing} disabled={busy === 'test'}>
                    <Play size={14} /> POST /invocations
                </button>
            </div>
        </div>
    );
}
