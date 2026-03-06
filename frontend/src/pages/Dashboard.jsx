import { useState } from 'react';
import {
    Brain, BarChart3, FlaskConical, Database,
    TrendingUp, CheckCircle, Clock, Zap, ArrowUpRight,
    Activity
} from 'lucide-react';
import { MODEL_COMPARISON, MOCK_EXPERIMENTS } from '../data/constants';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, Cell
} from 'recharts';

const STATS = [
    { label: 'Best Accuracy', value: '88.9%', delta: '+1.7%', icon: TrendingUp, color: '#6366f1' },
    { label: 'Models Trained', value: '12', delta: '+3 today', icon: Brain, color: '#22d3ee' },
    { label: 'Experiments', value: '24', delta: '+6 this week', icon: FlaskConical, color: '#10b981' },
    { label: 'Dataset Size', value: '649', delta: '33 features', icon: Database, color: '#f59e0b' },
];

const RECENT_ACTIVITY = [
    { text: 'XGBoost training complete — 88.9% accuracy', time: '2 min ago', icon: CheckCircle, color: '#10b981' },
    { text: 'Random Forest hyperparams saved (GridSearch)', time: '18 min ago', icon: CheckCircle, color: '#10b981' },
    { text: 'New dataset uploaded: student-clean.csv', time: '1h ago', icon: Database, color: '#22d3ee' },
    { text: 'AutoML run started (9 algorithms)', time: '2h ago', icon: Zap, color: '#f59e0b' },
    { text: 'Model v1.3 exported (joblib)', time: '3h ago', icon: Activity, color: '#6366f1' },
];

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

export default function Dashboard() {
    return (
        <div className="space-y-8 animate-fade-up">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                <p style={{ color: '#475569', fontSize: 14, marginTop: 4 }}>
                    ML Studio — Student Performance Prediction
                </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                {STATS.map((s, i) => (
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
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="glass-card p-8 lg:col-span-2">
                    <div className="section-header mb-6">
                        <div>
                            <div className="section-title">Model Comparison</div>
                            <div className="section-subtitle">Accuracy vs F1-Score across all trained models</div>
                        </div>
                        <button className="btn-secondary text-xs">
                            <ArrowUpRight size={13} /> View All
                        </button>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={MODEL_COMPARISON} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
                            <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[70, 95]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <RTooltip content={<CustomTooltip />} />
                            <Bar dataKey="accuracy" name="Accuracy" radius={[4, 4, 0, 0]} fill="#6366f1">
                                {MODEL_COMPARISON.map((_, idx) => (
                                    <Cell key={idx} fill={idx === 0 ? '#6366f1' : 'rgba(99,102,241,0.45)'} />
                                ))}
                            </Bar>
                            <Bar dataKey="f1" name="F1-Score" radius={[4, 4, 0, 0]} fill="#22d3ee">
                                {MODEL_COMPARISON.map((_, idx) => (
                                    <Cell key={idx} fill={idx === 0 ? '#22d3ee' : 'rgba(34,211,238,0.4)'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
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
                        {RECENT_ACTIVITY.map((a, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                    style={{ background: `${a.color}22` }}>
                                    <a.icon size={13} style={{ color: a.color }} />
                                </div>
                                <div>
                                    <div className="text-xs font-medium text-slate-900 leading-relaxed">{a.text}</div>
                                    <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>{a.time}</div>
                                </div>
                            </div>
                        ))}
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
                            {MOCK_EXPERIMENTS.slice(0, 4).map((e) => (
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
            </div>
        </div>
    );
}
