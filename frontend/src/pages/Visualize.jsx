import { useState } from 'react';
import {
    CONFUSION_MATRIX, ROC_DATA, MODEL_COMPARISON,
    TRAINING_HISTORY
} from '../data/constants';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RTooltip, ResponsiveContainer, Cell, Legend,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Download, BarChart3, Activity, Target, Radar as RadarIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        return (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)', fontSize: 12 }}>
                <div style={{ color: '#475569', marginBottom: 4 }}>{label}</div>
                {payload.map((p, i) => (
                    <div key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(4) : p.value}</div>
                ))}
            </div>
        );
    }
    return null;
};

function ConfusionMatrix() {
    const { labels, data } = CONFUSION_MATRIX;
    const total = data.flat().reduce((a, b) => a + b, 0);
    const maxVal = Math.max(...data.flat());
    const getColor = (val, i, j) => {
        const intensity = val / maxVal;
        return i === j
            ? `rgba(99,102,241,${0.2 + intensity * 0.6})`
            : `rgba(239,68,68,${0.1 + intensity * 0.5})`;
    };
    return (
        <div>
            <div className="font-bold text-base mb-4" style={{ color: 'var(--text-primary)' }}>Confusion Matrix</div>
            <div className="flex justify-center">
                <div>
                    {/* Header row */}
                    <div className="flex items-center mb-1">
                        <div className="w-16" />
                        <div className="text-xs text-center font-semibold w-full" style={{ color: '#6366f1' }}>Predicted</div>
                    </div>
                    <div className="flex items-center gap-1 mb-1">
                        <div className="w-16" />
                        {labels.map(l => (
                            <div key={l} className="w-16 text-center text-xs font-bold" style={{ color: '#94a3b8' }}>{l}</div>
                        ))}
                    </div>
                    {data.map((row, i) => (
                        <div key={i} className="flex items-center gap-1 mb-1">
                            <div className="w-16 text-right pr-2 text-xs font-bold" style={{ color: '#94a3b8' }}>
                                {i === 0 && <span className="text-xs" style={{ color: '#22d3ee' }}>Actual </span>}
                                {labels[i]}
                            </div>
                            {row.map((val, j) => (
                                <div
                                    key={j}
                                    className="cm-cell"
                                    style={{ background: getColor(val, i, j), border: `1px solid rgba(${i === j ? '37,99,235' : '220,38,38'},0.25)`, color: i === j ? '#1d4ed8' : '#b91c1c' }}
                                    title={`Actual: ${labels[i]}, Predicted: ${labels[j]}, Count: ${val}`}
                                >
                                    <div>
                                        <div style={{ fontSize: 16, fontWeight: 800 }}>{val}</div>
                                        <div style={{ fontSize: 10, opacity: 0.7 }}>{((val / total) * 100).toFixed(0)}%</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ background: 'rgba(99,102,241,0.6)' }} />
                    Correct
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ background: 'rgba(239,68,68,0.4)' }} />
                    Incorrect
                </div>
            </div>
        </div>
    );
}

const RADAR_DATA = MODEL_COMPARISON.slice(0, 4).map(m => ({
    model: m.name,
    Accuracy: m.accuracy,
    F1: m.f1,
    Precision: m.precision,
    Recall: m.recall,
}));

const RADAR_METRICS = [
    { key: 'Accuracy', color: '#6366f1' },
    { key: 'F1', color: '#22d3ee' },
    { key: 'Precision', color: '#10b981' },
    { key: 'Recall', color: '#f59e0b' },
];

export default function Visualize() {
    const [activeChart, setActiveChart] = useState('confusion');

    return (
        <div className="space-y-8 animate-fade-up">
            <div className="section-header">
                <div>
                    <h1 className="page-title">Visualizations</h1>
                    <p className="page-subtitle">Interactive charts for model analysis and comparison</p>
                </div>
                <button className="btn-secondary" onClick={() => toast.success('Charts exported as PNG')}>
                    <Download size={14} /> Export PNG
                </button>
            </div>

            {/* Tab bar */}
            <div className="tabs w-fit">
                {[
                    ['confusion', 'Confusion Matrix', Target],
                    ['roc', 'ROC Curve', Activity],
                    ['performance', 'Performance', BarChart3],
                    ['history', 'Training History', Activity],
                    ['radar', 'Radar', RadarIcon],
                ].map(([id, label, Icon]) => (
                    <button key={id} className={`tab-btn flex items-center gap-1.5 ${activeChart === id ? 'active' : ''}`}
                        onClick={() => setActiveChart(id)}>
                        <Icon size={13} />{label}
                    </button>
                ))}
            </div>

            {/* Confusion Matrix */}
            {activeChart === 'confusion' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
                    {/* Confusion Matrix (Main) */}
                    <div className="glass-card p-6 lg:p-8 xl:col-span-2">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                            <ConfusionMatrix />
                            <div>
                                <div className="text-sm font-semibold text-slate-900 mb-3">Metrics Summary</div>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Accuracy', value: '83.7%', fill: '#6366f1' },
                                        { label: 'Precision', value: '88.0%', fill: '#22d3ee' },
                                        { label: 'Recall', value: '78.6%', fill: '#10b981' },
                                        { label: 'F1-Score', value: '83.0%', fill: '#f59e0b' },
                                        { label: 'Specificity', value: '88.0%', fill: '#8b5cf6' },
                                    ].map(m => (
                                        <div key={m.label}>
                                            <div className="flex justify-between text-xs mb-1" style={{ color: '#475569' }}>
                                                <span>{m.label}</span><span style={{ color: m.fill, fontWeight: 700 }}>{m.value}</span>
                                            </div>
                                            <div className="progress-bar">
                                                <div className="progress-fill" style={{ width: m.value, background: m.fill }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Side metrics/ROC summary */}
                    <div className="space-y-6 lg:space-y-8">
                        <div className="glass-card p-6 lg:p-8">
                            <div className="section-title mb-1">ROC Curve</div>
                            <div className="section-subtitle mb-4">Receiver Operating Characteristic — AUC = 0.934</div>
                            <ResponsiveContainer width="100%" height={320}>
                                <LineChart data={ROC_DATA}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
                                    <XAxis dataKey="fpr" type="number" domain={[0, 1]} tickFormatter={v => v.toFixed(1)}
                                        label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -4, fill: '#475569', fontSize: 12 }}
                                        tick={{ fill: '#475569', fontSize: 11 }} />
                                    <YAxis domain={[0, 1]} tickFormatter={v => v.toFixed(1)}
                                        label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 12 }}
                                        tick={{ fill: '#475569', fontSize: 11 }} />
                                    <RTooltip content={<CustomTooltip />} />
                                    <Line type="monotone" dataKey="tpr" name="TPR" stroke="#6366f1" strokeWidth={2.5}
                                        dot={{ fill: '#6366f1', r: 3 }} activeDot={{ r: 6 }} />
                                    {/* Random classifier diagonal */}
                                    <Line data={[{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }]} type="linear" dataKey="tpr" name="Random"
                                        stroke="#cbd5e1" strokeWidth={1} strokeDasharray="6 4" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                <div className="flex items-center gap-1.5"><div className="w-8 h-0.5 bg-indigo-500" />XGBoost (AUC=0.934)</div>
                                <div className="flex items-center gap-1.5"><div className="w-8 h-0.5 border-t border-slate-600 border-dashed" />Random</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ROC Curve */}
            {activeChart === 'roc' && (
                <div className="glass-card p-6 lg:p-8">
                    <div className="section-title mb-1">ROC Curve</div>
                    <div className="section-subtitle mb-4">Receiver Operating Characteristic — AUC = 0.934</div>
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={ROC_DATA}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
                            <XAxis dataKey="fpr" type="number" domain={[0, 1]} tickFormatter={v => v.toFixed(1)}
                                label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -4, fill: '#475569', fontSize: 12 }}
                                tick={{ fill: '#475569', fontSize: 11 }} />
                            <YAxis domain={[0, 1]} tickFormatter={v => v.toFixed(1)}
                                label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 12 }}
                                tick={{ fill: '#475569', fontSize: 11 }} />
                            <RTooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="tpr" name="TPR" stroke="#6366f1" strokeWidth={2.5}
                                dot={{ fill: '#6366f1', r: 3 }} activeDot={{ r: 6 }} />
                            {/* Random classifier diagonal */}
                            <Line data={[{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }]} type="linear" dataKey="tpr" name="Random"
                                stroke="#cbd5e1" strokeWidth={1} strokeDasharray="6 4" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: '#64748b' }}>
                        <div className="flex items-center gap-1.5"><div className="w-8 h-0.5 bg-indigo-500" />XGBoost (AUC=0.934)</div>
                        <div className="flex items-center gap-1.5"><div className="w-8 h-0.5 border-t border-slate-600 border-dashed" />Random</div>
                    </div>
                </div>
            )}

            {/* Performance comparison */}
            {activeChart === 'performance' && (
                <div className="glass-card p-6 lg:p-8">
                    <div className="section-title mb-1">Model Performance Comparison</div>
                    <div className="section-subtitle mb-6">Accuracy, F1, Precision and Recall across all models</div>
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={MODEL_COMPARISON} margin={{ left: -10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.07)" />
                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[70, 95]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <RTooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ color: '#64748b', fontSize: 12, paddingTop: 12 }} />
                            <Bar dataKey="accuracy" name="Accuracy" fill="#6366f1" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="f1" name="F1-Score" fill="#22d3ee" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="precision" name="Precision" fill="#10b981" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="recall" name="Recall" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Training History */}
            {activeChart === 'history' && (
                <div className="glass-card p-6 lg:p-8">
                    <div className="section-title mb-1">Training History</div>
                    <div className="section-subtitle mb-6">Loss and Accuracy per epoch (Neural Network)</div>
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={TRAINING_HISTORY}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.07)" />
                            <XAxis dataKey="epoch" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Epoch', position: 'insideBottom', offset: -4, fill: '#64748b', fontSize: 12 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <RTooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ color: '#64748b', fontSize: 12, paddingTop: 12 }} />
                            <Line type="monotone" dataKey="trainLoss" name="Train Loss" stroke="#ef4444" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="valLoss" name="Val Loss" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                            <Line type="monotone" dataKey="trainAcc" name="Train Acc" stroke="#6366f1" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="valAcc" name="Val Acc" stroke="#22d3ee" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Radar chart */}
            {activeChart === 'radar' && (
                <div className="glass-card p-6 lg:p-8">
                    <div className="section-title mb-1">Metrics Radar</div>
                    <div className="section-subtitle mb-6">Multi-dimensional performance across top 4 models</div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                        {MODEL_COMPARISON.slice(0, 4).map((m, idx) => (
                            <div key={m.name} className="p-5 rounded-xl glass-card">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-3 h-3 rounded-full" style={{ background: m.color }} />
                                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{m.name}</span>
                                    <span className="badge badge-purple ml-auto">{m.accuracy}%</span>
                                </div>
                                <ResponsiveContainer width="100%" height={160}>
                                    <RadarChart data={[
                                        { subject: 'Accuracy', value: m.accuracy },
                                        { subject: 'F1', value: m.f1 },
                                        { subject: 'Precision', value: m.precision },
                                        { subject: 'Recall', value: m.recall },
                                    ]}>
                                        <PolarGrid stroke="var(--border)" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                                        <PolarRadiusAxis domain={[70, 95]} tick={false} axisLine={false} />
                                        <Radar dataKey="value" stroke={m.color} fill={m.color} fillOpacity={0.2} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
