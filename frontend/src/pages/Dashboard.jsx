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
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <div style={{ color: '#475569', fontSize: 12, marginBottom: 4 }}>{label}</div>
                {payload.map((p, i) => (
                    <div key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>
                        {p.name}: {p.value}%
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
        { label: 'Best Accuracy', value: `${data.stats.best_accuracy}%`, delta: 'top model', icon: TrendingUp, color: '#6366f1' },
        { label: 'Models Available', value: String(data.stats.models_trained), delta: 'algorithms', icon: Brain, color: '#22d3ee' },
        { label: 'Experiments', value: String(data.stats.experiments), delta: 'total runs', icon: FlaskConical, color: '#10b981' },
        { label: 'Dataset Size', value: String(data.stats.dataset_size), delta: `${data.stats.n_features} features`, icon: Database, color: '#f59e0b' },
    ] : [];

    return (
        <div className="space-y-8 animate-fade-up">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                <p style={{ color: '#475569', fontSize: 14, marginTop: 4 }}>
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
                                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis domain={[70, 100]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <RTooltip content={<CustomTooltip />} />
                                <Bar dataKey="accuracy" name="Accuracy" radius={[4, 4, 0, 0]}>
                                    {(data?.model_comparison || []).map((entry, idx) => (
                                        <Cell key={idx} fill={idx === 0 ? '#6366f1' : 'rgba(99,102,241,0.45)'} />
                                    ))}
                                </Bar>
                                <Bar dataKey="f1" name="F1-Score" radius={[4, 4, 0, 0]}>
                                    {(data?.model_comparison || []).map((entry, idx) => (
                                        <Cell key={idx} fill={idx === 0 ? '#22d3ee' : 'rgba(34,211,238,0.4)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                        {[['#6366f1', 'Accuracy'], ['#22d3ee', 'F1-Score']].map(([c, l]) => (
                            <div key={l} className="flex items-center gap-1.5 text-xs" style={{ color: '#475569' }}>
                                <div className="w-3 h-3 rounded-sm" style={{ background: c }} />
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
                                        <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>{exp.date}</div>
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
                                        <td><span className="font-mono text-xs" style={{ color: '#6366f1' }}>{e.id}</span></td>
                                        <td className="font-medium text-slate-900">{e.model}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="progress-bar w-16">
                                                    <div className="progress-fill" style={{ width: `${e.accuracy * 100}%` }} />
                                                </div>
                                                <span style={{ color: '#059669', fontSize: 12, fontWeight: 600 }}>
                                                    {(e.accuracy * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ color: '#475569' }}>{(e.f1 * 100).toFixed(1)}%</td>
                                        <td><span className="badge badge-purple">{e.tuning}</span></td>
                                        <td style={{ color: '#475569' }}><Clock size={11} className="inline mr-1" />{e.duration}</td>
                                        <td><span className="badge badge-cyan">{e.version}</span></td>
                                        <td style={{ color: '#64748b', fontSize: 12 }}>{e.date}</td>
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
