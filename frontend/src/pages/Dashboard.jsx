import { useState, useEffect } from 'react';
import {
    Brain, BarChart3, FlaskConical, Database,
    TrendingUp, CheckCircle, Clock, Zap, ArrowUpRight,
    Activity, AlertCircle, Loader2
} from 'lucide-react';
import { fetchDashboard } from '../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, Cell
} from 'recharts';

const ICON_MAP = { TrendingUp, Brain, FlaskConical, Database };
const ACTIVITY_COLOR = ['#10b981', '#22d3ee', '#f59e0b', '#6366f1'];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        return (
            <div className="glass-card !p-3 !bg-white/90 !backdrop-blur-md shadow-xl border-none">
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">{label}</div>
                {payload.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {p.name}: <span className="font-mono">{p.value}%</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

function SkeletonCard() {
    return (
        <div className="stat-card animate-pulse">
            <div className="w-11 h-11 rounded-xl bg-slate-200 mb-4" />
            <div className="h-8 bg-slate-200 rounded w-24 mb-2" />
            <div className="h-4 bg-slate-100 rounded w-32" />
        </div>
    );
}

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDashboard()
            .then(setData)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const stats = data ? [
        { label: 'Top Accuracy', value: `${data.stats.best_accuracy}%`, delta: 'Global Best', icon: TrendingUp, color: '#4f46e5' },
        { label: 'Models', value: String(data.stats.models_trained), delta: 'Trained', icon: Brain, color: '#8b5cf6' },
        { label: 'Runs', value: String(data.stats.experiments), delta: 'Total', icon: FlaskConical, color: '#10b981' },
        { label: 'Features', value: String(data.stats.n_features), delta: 'Inputs', icon: Database, color: '#f59e0b' },
    ] : [];

    return (
        <div className="space-y-8 animate-fade-up">
            <div>
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">
                    ML Studio — Student Performance Prediction
                    {error && <span className="ml-3 text-red-500 text-xs">⚠ Backend offline — showing cached data</span>}
                </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                {loading
                    ? Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
                    : stats.map((s, i) => (
                        <div key={i} className="stat-card" style={{ animationDelay: `${i * 80}ms` }}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                                    style={{ background: `${s.color}22` }}>
                                    <s.icon size={20} style={{ color: s.color }} />
                                </div>
                                <span className="badge badge-purple text-xs">{s.delta}</span>
                            </div>
                            <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
                            <div className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                        </div>
                    ))
                }
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Model comparison chart */}
                <div className="glass-card p-8 lg:col-span-2">
                    <div className="section-header mb-6">
                        <div>
                            <div className="section-title">Model Comparison</div>
                            <div className="section-subtitle">Accuracy vs F1-Score across trained models</div>
                        </div>
                        <button className="btn-secondary text-xs"><ArrowUpRight size={13} /> View All</button>
                    </div>
                    {loading ? (
                        <div className="h-56 bg-slate-100 rounded-xl animate-pulse" />
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={data?.model_comparison || []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
                                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis domain={[70, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <RTooltip content={<CustomTooltip />} />
                                <Bar dataKey="accuracy" name="Accuracy" radius={[6, 6, 0, 0]} barSize={32}>
                                    {(data?.model_comparison || []).map((entry, idx) => (
                                        <Cell key={idx} fill={idx === 0 ? 'var(--accent)' : 'rgba(99, 102, 241, 0.3)'} />
                                    ))}
                                </Bar>
                                <Bar dataKey="f1" name="F1-Score" radius={[6, 6, 0, 0]} barSize={32}>
                                    {(data?.model_comparison || []).map((entry, idx) => (
                                        <Cell key={idx} fill={idx === 0 ? 'var(--accent3)' : 'rgba(6, 182, 212, 0.3)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                        {[['var(--accent)', 'Accuracy'], ['var(--accent3)', 'F1-Score']].map(([c, l]) => (
                            <div key={l} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                <div className="w-3 h-3 rounded-sm animate-pulse" style={{ background: c }} />
                                {l}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent activity */}
                <div className="glass-card p-6 lg:p-8">
                    <div className="section-title mb-6">Recent Activity</div>
                    <div className="space-y-5">
                        {loading
                            ? Array(5).fill(0).map((_, i) => (
                                <div key={i} className="flex items-start gap-3 animate-pulse">
                                    <div className="w-7 h-7 rounded-lg bg-slate-200 flex-shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3 bg-slate-200 rounded w-full" />
                                        <div className="h-2.5 bg-slate-100 rounded w-20" />
                                    </div>
                                </div>
                            ))
                            : (data?.recent_experiments || []).slice(0, 5).map((exp, i) => (
                                <div key={exp.id} className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                        style={{ background: `${ACTIVITY_COLOR[i % ACTIVITY_COLOR.length]}22` }}>
                                        <CheckCircle size={13} style={{ color: ACTIVITY_COLOR[i % ACTIVITY_COLOR.length] }} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-medium text-slate-900 leading-relaxed">
                                            {exp.model} training complete — {(exp.accuracy * 100).toFixed(1)}% accuracy
                                        </div>
                                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{exp.date}</div>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>

            {/* Recent experiments table */}
            <div className="glass-card p-6 lg:p-8">
                <div className="section-header">
                    <div>
                        <div className="section-title">Recent Experiments</div>
                        <div className="section-subtitle">Latest training runs and their metrics</div>
                    </div>
                </div>
                {loading ? (
                    <div className="h-40 bg-slate-50 rounded-xl animate-pulse mt-6" />
                ) : (
                    <div className="scroll-x">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Run ID</th><th>Model</th><th>Accuracy</th>
                                    <th>F1-Score</th><th>Tuning</th><th>Duration</th>
                                    <th>Version</th><th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(data?.recent_experiments || []).slice(0, 5).map((e) => (
                                    <tr key={e.id}>
                                        <td><span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{e.id}</span></td>
                                        <td className="font-medium text-slate-900">{e.model}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="progress-bar w-16">
                                                    <div className="progress-fill" style={{ width: `${e.accuracy * 100}%` }} />
                                                </div>
                                                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                                                    {(e.accuracy * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{(e.f1 * 100).toFixed(1)}%</td>
                                        <td><span className="badge badge-purple">{e.tuning}</span></td>
                                        <td style={{ color: 'var(--text-secondary)' }}><Clock size={11} className="inline mr-1" />{e.duration}</td>
                                        <td><span className="badge badge-cyan">{e.version}</span></td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{e.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
