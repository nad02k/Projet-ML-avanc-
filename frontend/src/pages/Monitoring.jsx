import { useState, useEffect, useCallback } from 'react';
import {
    fetchDriftLatest,
    runDriftCheck,
    fetchMlflowStatus,
    startMlflowUi,
} from '../services/api';
import {
    Activity, AlertTriangle, CheckCircle, Loader2, RefreshCw,
    FileText, Zap, ExternalLink, ShieldCheck, HelpCircle, BarChart3
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import toast from 'react-hot-toast';

const ALERT_STYLES = {
    ok: { color: '#10b981', label: 'Stable', icon: ShieldCheck, bg: 'rgba(16, 185, 129, 0.1)' },
    warning: { color: '#f59e0b', label: 'Warning', icon: AlertTriangle, bg: 'rgba(245, 158, 11, 0.1)' },
    critical: { color: '#ef4444', label: 'Critical drift', icon: AlertTriangle, bg: 'rgba(239, 68, 68, 0.1)' },
};

export default function Monitoring() {
    const [drift, setDrift] = useState(null);
    const [mlflow, setMlflow] = useState(null);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [d, m] = await Promise.all([fetchDriftLatest(), fetchMlflowStatus()]);
            setDrift(d);
            setMlflow(m);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleRun = async () => {
        setRunning(true);
        const t = toast.loading('Running drift detection (Evidently + KS-test)…');
        try {
            const r = await runDriftCheck(true);
            setDrift(r);
            if (r.retrain_triggered) {
                toast.success(`Drift ${r.drift_share_pct}% — Automatic retraining triggered!`, { id: t });
            } else {
                toast.success(`Drift check completed: ${r.drift_share_pct}%`, { id: t });
            }
        } catch (e) {
            toast.error(e.message, { id: t });
        } finally {
            setRunning(false);
        }
    };

    const alert = drift?.alert_level ? ALERT_STYLES[drift.alert_level] : null;
    const AlertIcon = alert?.icon || Activity;

    // Prepare data for KS p-value Recharts bar chart
    const ksChartData = drift?.ks_results ? drift.ks_results.map(row => ({
        name: row.feature,
        pValue: row.p_value,
        ksStat: row.ks_stat,
        drifted: row.drifted ? 1 : 0
    })) : [];

    // Prepare data for Mean Values Shift Recharts bar chart
    const meanChartData = [];
    if (drift?.reference_mean_sample && drift?.current_mean_sample) {
        Object.keys(drift.reference_mean_sample).forEach(feature => {
            meanChartData.push({
                name: feature,
                reference: drift.reference_mean_sample[feature],
                current: drift.current_mean_sample[feature]
            });
        });
    }

    return (
        <div className="space-y-8 animate-fade-up">
            {/* Header */}
            <div className="section-header">
                <div>
                    <h1 className="page-title">Data Drift Monitoring</h1>
                    <p className="page-subtitle">Partie 6 — Détection de drift (Evidently, Kolmogorov-Smirnov) & ré-entraînement</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary" onClick={load} disabled={loading || running}>
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button className="btn-primary" onClick={handleRun} disabled={running}>
                        {running ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                        Run drift check
                    </button>
                </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {loading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="stat-card animate-pulse h-24" />
                    ))
                ) : drift?.status === 'empty' ? (
                    <div className="col-span-4 glass-card p-8 text-center text-slate-500">
                        No drift analysis yet. Click &quot;Run drift check&quot; to simulate production distribution shifts.
                    </div>
                ) : (
                    <>
                        {/* Alert Level Card */}
                        <div className="stat-card flex flex-col justify-between" style={{ borderLeft: `4px solid ${alert?.color}` }}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-xs text-slate-500 font-medium">Alert Level</div>
                                    <div className="text-xl font-bold mt-1" style={{ color: alert?.color }}>
                                        {alert?.label}
                                    </div>
                                </div>
                                <div className="p-2 rounded-lg" style={{ backgroundColor: alert?.bg, color: alert?.color }}>
                                    <AlertIcon size={20} />
                                </div>
                            </div>
                            <div className="text-xs text-slate-400 mt-2">
                                Overall dataset drift status
                            </div>
                        </div>

                        {/* Drift Share Card */}
                        <div className="stat-card flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-xs text-slate-500 font-medium">Drift Share</div>
                                    <div className="text-2xl font-bold mt-1 text-accent">
                                        {drift?.drift_share_pct ?? 0}%
                                    </div>
                                </div>
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                    <Activity size={20} />
                                </div>
                            </div>
                            <div className="text-xs text-slate-400 mt-2">
                                Retrain trigger threshold is &gt; {(drift?.seuil_critical ?? 0.3) * 100}%
                            </div>
                        </div>

                        {/* Columns Drifted Card */}
                        <div className="stat-card flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-xs text-slate-500 font-medium">Columns Drifted</div>
                                    <div className="text-2xl font-bold mt-1 text-slate-800 dark:text-slate-200">
                                        {drift?.drifted_columns ?? 0}/{drift?.total_columns ?? 0}
                                    </div>
                                </div>
                                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                                    <BarChart3 size={20} />
                                </div>
                            </div>
                            <div className="text-xs text-slate-400 mt-2">
                                Proportion of drifted features
                            </div>
                        </div>

                        {/* Retrain Triggered Card */}
                        <div className="stat-card flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-xs text-slate-500 font-medium">Auto-Retrain Triggered</div>
                                    <div className="text-lg font-bold mt-1">
                                        {drift?.retrain_triggered ? (
                                            <span className="text-rose-500 flex items-center gap-1.5 animate-pulse">
                                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Yes (Active)
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 flex items-center gap-1.5">
                                                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" /> No (Idle)
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="p-2 rounded-lg bg-teal-500/10 text-teal-500">
                                    <Zap size={20} />
                                </div>
                            </div>
                            <div className="text-xs text-slate-400 mt-2">
                                Triggers AutoML training sweep
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Recharts Visualizations */}
            {!loading && drift?.status !== 'empty' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* KS p-value bar chart */}
                    <div className="glass-card p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-sm text-slate-700 dark:text-slate-200">Kolmogorov-Smirnov p-values per Feature</h2>
                            <span className="text-xs text-slate-400">Drift active if p-value &lt; 0.05</span>
                        </div>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={ksChartData}
                                    margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis 
                                        dataKey="name" 
                                        tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                                        axisLine={{ stroke: 'var(--border)' }}
                                        tickLine={false}
                                    />
                                    <YAxis 
                                        tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                                        axisLine={{ stroke: 'var(--border)' }}
                                        tickLine={false}
                                        domain={[0, 1]}
                                    />
                                    <Tooltip 
                                        contentStyle={{
                                            backgroundColor: 'var(--bg-surface)',
                                            borderColor: 'var(--border)',
                                            borderRadius: '8px',
                                            color: 'var(--text-primary)',
                                            fontSize: '12px'
                                        }}
                                    />
                                    <ReferenceLine y={0.05} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'p=0.05 limit', position: 'top', fill: '#ef4444', fontSize: 10 }} />
                                    <Bar dataKey="pValue" radius={[4, 4, 0, 0]}>
                                        {ksChartData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={entry.pValue < 0.05 ? '#ef4444' : '#10b981'} 
                                                fillOpacity={0.8}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Reference vs Current Mean comparison */}
                    <div className="glass-card p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-sm text-slate-700 dark:text-slate-200">Distribution Mean Shift (Sample Features)</h2>
                            <span className="text-xs text-slate-400">Reference vs Simulated Current</span>
                        </div>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={meanChartData}
                                    margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis 
                                        dataKey="name" 
                                        tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                                        axisLine={{ stroke: 'var(--border)' }}
                                        tickLine={false}
                                    />
                                    <YAxis 
                                        tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                                        axisLine={{ stroke: 'var(--border)' }}
                                        tickLine={false}
                                    />
                                    <Tooltip 
                                        contentStyle={{
                                            backgroundColor: 'var(--bg-surface)',
                                            borderColor: 'var(--border)',
                                            borderRadius: '8px',
                                            color: 'var(--text-primary)',
                                            fontSize: '12px'
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }} />
                                    <Bar dataKey="reference" fill="#3b82f6" name="Reference (Train Data)" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
                                    <Bar dataKey="current" fill="#f59e0b" name="Current (Simulated Shift)" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Evidently HTML Report Section */}
            {!loading && drift?.evidently_available && drift?.report_url && (
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <FileText size={18} className="text-indigo-500" /> Evidently HTML Interactive Report
                        </h2>
                        <a
                            href="/api/drift/report"
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary text-xs flex items-center gap-1.5"
                        >
                            <ExternalLink size={12} /> Open Report In New Tab
                        </a>
                    </div>
                    <iframe
                        title="Evidently Drift Report"
                        src="/api/drift/report"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner"
                        style={{ height: '480px', background: '#fff' }}
                    />
                </div>
            )}

            {/* KS features table */}
            {!loading && drift?.ks_results?.length > 0 && (
                <div className="glass-card p-6">
                    <h2 className="font-bold mb-4 text-slate-800 dark:text-slate-200">Kolmogorov-Smirnov Statistical Feature Analysis</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                                    <th className="py-2.5">Feature</th>
                                    <th>KS Statistic</th>
                                    <th>p-value (Significance)</th>
                                    <th>Status</th>
                                    <th className="text-right">Action Threshold</th>
                                </tr>
                            </thead>
                            <tbody>
                                {drift.ks_results.map(row => (
                                    <tr key={row.feature} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                        <td className="py-3 font-mono font-medium">{row.feature}</td>
                                        <td className="font-mono">{row.ks_stat}</td>
                                        <td className="font-mono">{row.p_value}</td>
                                        <td>
                                            {row.drifted ? (
                                                <span className="badge badge-red font-semibold text-xs animate-pulse">DRIFT DETECTED</span>
                                            ) : (
                                                <span className="badge badge-green font-semibold text-xs">STABLE</span>
                                            )}
                                        </td>
                                        <td className="text-right text-slate-500 font-mono text-xs">
                                            {row.drifted ? 'Needs Retraining' : 'No Action'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Footer with configurations */}
            {!loading && drift?.status !== 'empty' && (
                <div className="glass-card p-6 text-sm text-slate-600 dark:text-slate-400 space-y-3">
                    <div className="flex flex-wrap gap-x-8 gap-y-2">
                        <p><strong>Warning Threshold:</strong> &gt; {(drift?.seuil_warning ?? 0.15) * 100}%</p>
                        <p><strong>Critical/Retrain Threshold:</strong> &gt; {(drift?.seuil_critical ?? 0.3) * 100}%</p>
                        <p><strong>MLflow Experiment Name:</strong> <code className="text-accent">monitoring_drift</code></p>
                    </div>
                    
                    {mlflow?.running ? (
                        <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>MLflow Tracking Server: </span>
                            <a href={mlflow.url} target="_blank" rel="noreferrer" className="text-accent hover:underline flex items-center gap-1">
                                {mlflow.url} <ExternalLink size={12} />
                            </a>
                        </div>
                    ) : (
                        <div className="pt-2 border-t border-border/40 flex justify-between items-center">
                            <span className="text-slate-400">MLflow tracking is not currently running.</span>
                            <button className="btn-secondary text-xs" onClick={async () => {
                                const t = toast.loading("Launching MLflow tracking server...");
                                try {
                                    await startMlflowUi(true);
                                    toast.success("MLflow UI started successfully!", { id: t });
                                    load();
                                } catch (e) {
                                    toast.error(e.message, { id: t });
                                }
                            }}>
                                Start MLflow UI
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
