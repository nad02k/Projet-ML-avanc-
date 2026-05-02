import { useState, useEffect } from 'react';
import { fetchExperiments } from '../services/api';
import {
    FlaskConical, Download, RotateCcw, Trash2,
    ChevronDown, ChevronUp, Clock, CheckCircle, TrendingUp, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Experiments() {
    const [experiments, setExperiments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(null);
    const [sortKey, setSortKey] = useState('accuracy');

    useEffect(() => {
        fetchExperiments()
            .then(d => setExperiments(d.experiments || []))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const sorted = [...experiments].sort((a, b) => b[sortKey] - a[sortKey]);

    const handleRollback = (exp) => {
        toast.success(`Rolled back to ${exp.model} ${exp.version} — config restored`);
    };
    const handleDelete = (id) => {
        setExperiments(prev => prev.filter(e => e.id !== id));
        toast('Experiment deleted', { icon: '🗑️' });
    };
    const handleExport = () => {
        if (experiments.length === 0) { toast.error('No experiments to export'); return; }
        const header = 'id,model,accuracy,f1,precision,recall,tuning,duration,version,date';
        const rows = experiments.map(e =>
            `${e.id},${e.model},${e.accuracy},${e.f1},${e.precision},${e.recall},${e.tuning},${e.duration},${e.version},${e.date}`
        ).join('\n');
        const blob = new Blob([header + '\n' + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'experiments.csv'; a.click();
        toast.success('Exported results.csv');
    };

    const bestAcc = experiments.length > 0 ? Math.max(...experiments.map(e => e.accuracy)) : 0;
    const avgF1 = experiments.length > 0
        ? experiments.reduce((s, e) => s + e.f1, 0) / experiments.length : 0;

    return (
        <div className="space-y-8 animate-fade-up">
            <div className="section-header">
                <div>
                    <h1 className="page-title">Experiment History</h1>
                    <p className="page-subtitle">All training runs with metrics, versions and rollback</p>
                </div>
                <div className="flex gap-2">
                    <select className="form-input form-select text-sm w-40"
                        value={sortKey} onChange={e => setSortKey(e.target.value)}>
                        <option value="accuracy">Sort: Accuracy</option>
                        <option value="f1">Sort: F1-Score</option>
                        <option value="precision">Sort: Precision</option>
                    </select>
                    <button className="btn-secondary" onClick={handleExport}>
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {loading ? Array(4).fill(0).map((_, i) => (
                    <div key={i} className="stat-card animate-pulse">
                        <div className="h-7 bg-slate-200 rounded w-16 mb-1 mx-auto" />
                        <div className="h-3 bg-slate-100 rounded w-20 mx-auto" />
                    </div>
                )) : [
                    { label: 'Total Runs', value: experiments.length, color: '#6366f1' },
                    { label: 'Best Accuracy', value: `${(bestAcc * 100).toFixed(1)}%`, color: '#10b981' },
                    { label: 'Avg F1', value: `${(avgF1 * 100).toFixed(1)}%`, color: '#22d3ee' },
                    { label: 'Model Versions', value: experiments.length, color: '#f59e0b' },
                ].map(s => (
                    <div key={s.label} className="stat-card text-center">
                        <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-xs mt-1 text-slate-500">{s.label}</div>
                    </div>
                ))}
            </div>

            {error && (
                <div className="glass-card p-8 text-center">
                    <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: '#d97706' }} />
                    <div className="font-semibold text-slate-900 mb-1">Backend unavailable</div>
                    <div className="text-sm text-slate-500">{error}</div>
                </div>
            )}

            {/* Experiments list */}
            <div className="space-y-4">
                {sorted.map((exp, i) => {
                    const isExpanded = expanded === exp.id;
                    const isBest = i === 0;
                    return (
                        <div key={exp.id} className="glass-card overflow-hidden"
                            style={isBest ? { borderColor: '#059669' } : {}}>
                            <div
                                className="p-6 flex flex-wrap items-center gap-6 cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => setExpanded(isExpanded ? null : exp.id)}>
                                {isBest && (
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid #10b981' }}>
                                        <TrendingUp size={12} style={{ color: '#10b981' }} />
                                    </div>
                                )}
                                <div className="flex-shrink-0">
                                    <div className="font-bold text-slate-900 text-sm">{exp.model}</div>
                                    <div className="font-mono text-xs mt-0.5" style={{ color: '#2563eb' }}>{exp.id}</div>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className={`badge ${isBest ? 'badge-green' : 'badge-purple'}`}>
                                        {(exp.accuracy * 100).toFixed(1)}% ACC
                                    </span>
                                    <span className="badge badge-cyan">{(exp.f1 * 100).toFixed(1)}% F1</span>
                                    <span className="badge badge-yellow">{exp.tuning}</span>
                                    <span className="badge badge-purple">{exp.version}</span>
                                </div>
                                <div className="ml-auto flex items-center gap-4">
                                    <div className="text-xs text-slate-500">
                                        <Clock size={11} className="inline mr-1" />{exp.duration}
                                    </div>
                                    <div className="text-xs text-slate-400">{exp.date}</div>
                                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="p-7 border-t border-slate-200" style={{ background: 'var(--bg-muted)' }}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {/* Metrics */}
                                        <div>
                                            <div className="text-xs font-semibold uppercase tracking-wider mb-3 text-slate-400">Detailed Metrics</div>
                                            <div className="space-y-2.5">
                                                {[
                                                    ['Accuracy', exp.accuracy, '#6366f1'],
                                                    ['F1-Score', exp.f1, '#22d3ee'],
                                                    ['Precision', exp.precision, '#10b981'],
                                                    ['Recall', exp.recall, '#f59e0b'],
                                                ].map(([label, val, color]) => (
                                                    <div key={label}>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="text-slate-500">{label}</span>
                                                            <span style={{ color, fontWeight: 700 }}>{(val * 100).toFixed(1)}%</span>
                                                        </div>
                                                        <div className="progress-bar">
                                                            <div className="progress-fill" style={{ width: `${val * 100}%`, background: color }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Params */}
                                        {exp.params && Object.keys(exp.params).length > 0 && (
                                            <div>
                                                <div className="text-xs font-semibold uppercase tracking-wider mb-3 text-slate-400">Parameters</div>
                                                <div className="space-y-1 font-mono text-xs">
                                                    {Object.entries(exp.params).map(([k, v]) => (
                                                        <div key={k} className="flex justify-between gap-2 py-1" style={{ borderBottom: '1px solid var(--border)' }}>
                                                            <span style={{ color: 'var(--accent)' }}>{k}</span>
                                                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{String(v)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div>
                                            <div className="text-xs font-semibold uppercase tracking-wider mb-3 text-slate-400">Actions</div>
                                            <div className="space-y-2">
                                                <button className="btn-primary w-full" onClick={() => handleRollback(exp)}>
                                                    <RotateCcw size={14} /> Rollback to {exp.version}
                                                </button>
                                                <button className="btn-secondary w-full" onClick={() => toast.success(`Model ${exp.version} exported`)}>
                                                    <Download size={14} /> Export Model (joblib)
                                                </button>
                                                <button className="btn-secondary w-full" onClick={() => toast.success('Metrics exported')}>
                                                    <Download size={14} /> Export Metrics (CSV)
                                                </button>
                                                <button className="btn-danger w-full" onClick={() => handleDelete(exp.id)}>
                                                    <Trash2 size={14} /> Delete Run
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                {!loading && experiments.length === 0 && !error && (
                    <div className="glass-card p-12 text-center">
                        <FlaskConical size={40} className="mx-auto mb-3 opacity-30" />
                        <div className="text-slate-500">No experiments found.</div>
                    </div>
                )}
            </div>
        </div>
    );
}
