import { useState, useEffect, useRef } from 'react';
import { AUTOML_ALGORITHMS } from '../data/constants';
import {
    Zap, Play, CheckCircle, Clock, Trophy, Download,
    BarChart3, RefreshCw, Cpu
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, Cell
} from 'recharts';

const STEPS = [
    'Data validation & preprocessing',
    'Feature engineering',
    'Running algorithm sweep (9 models)',
    'Hyperparameter optimization (Optuna)',
    'Ensemble selection',
    'Final evaluation & ranking',
    'Generating report',
];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        return (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)', fontSize: 12 }}>
                <div style={{ color: '#475569', marginBottom: 4 }}>{label}</div>
                <div style={{ color: '#4f46e5', fontWeight: 700 }}>{(payload[0].value * 100).toFixed(1)}% accuracy</div>
            </div>
        );
    }
    return null;
};

export default function AutoML() {
    const [running, setRunning] = useState(false);
    const [done, setDone] = useState(false);
    const [currentStep, setCurrentStep] = useState(-1);
    const [completedAlgos, setCompletedAlgos] = useState([]);
    const [elapsed, setElapsed] = useState(0);
    const timerRef = useRef(null);
    const startRef = useRef(null);

    const handleStart = () => {
        setRunning(true);
        setDone(false);
        setCurrentStep(0);
        setCompletedAlgos([]);
        setElapsed(0);
        startRef.current = Date.now();

        timerRef.current = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
        }, 1000);

        toast.success('AutoML started! Testing 9 algorithms…');
    };

    useEffect(() => {
        if (!running || currentStep < 0) return;

        const isLastStep = currentStep === STEPS.length - 1;
        const delay = currentStep === 2 ? 3000 : currentStep === 3 ? 3500 : 1500;

        // For step 2 (algo sweep), progressively reveal completed algos
        if (currentStep === 2) {
            AUTOML_ALGORITHMS.forEach((algo, i) => {
                setTimeout(() => {
                    setCompletedAlgos(prev => [...prev, algo]);
                }, (i + 1) * 320);
            });
        }

        const timeout = setTimeout(() => {
            if (isLastStep) {
                setRunning(false);
                setDone(true);
                setCurrentStep(STEPS.length);
                clearInterval(timerRef.current);
                toast.success('AutoML complete! Best model: XGBoost (88.9%)', { duration: 5000 });
            } else {
                setCurrentStep(s => s + 1);
            }
        }, delay);

        return () => clearTimeout(timeout);
    }, [running, currentStep]);

    const handleReset = () => {
        setRunning(false);
        setDone(false);
        setCurrentStep(-1);
        setCompletedAlgos([]);
        setElapsed(0);
        clearInterval(timerRef.current);
    };

    const formatElapsed = (s) => `${Math.floor(s / 60)}m ${s % 60}s`;

    const sortedAlgos = [...AUTOML_ALGORITHMS].sort((a, b) => b.score - a.score);
    const bestModel = sortedAlgos[0];

    return (
        <div className="space-y-8 animate-fade-up">
            <div>
                <h1 className="page-title">AutoML Mode</h1>
                <p className="page-subtitle">One click — automatically test all algorithms and find the best model</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: control + steps */}
                <div className="space-y-6">
                    {/* Launch card */}
                    <div className="glass-card p-8 text-center">
                        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-blue-100">
                            <Zap size={28} style={{ color: '#2563eb' }} />
                        </div>
                        <div className="font-bold text-slate-900 text-lg mb-1">AutoML Engine</div>
                        <div className="text-sm mb-5 text-slate-500">
                            Tests 9 algorithms × Optuna tuning<br />and selects the optimal model
                        </div>

                        {!running && !done && (
                            <button className="btn-primary w-full animate-pulse-glow" onClick={handleStart}>
                                <Play size={16} /> Launch AutoML
                            </button>
                        )}
                        {running && (
                            <div className="space-y-2">
                                <button className="btn-secondary w-full" disabled style={{ opacity: 0.6 }}>
                                    <span className="animate-spin inline-block mr-1">⟳</span> Running…
                                </button>
                                <div className="text-sm text-slate-500">
                                    <Clock size={11} className="inline mr-1" />Elapsed: {formatElapsed(elapsed)}
                                </div>
                            </div>
                        )}
                        {done && (
                            <div className="space-y-2">
                                <button className="btn-primary w-full" onClick={handleReset}>
                                    <RefreshCw size={14} /> Run Again
                                </button>
                                <div className="text-sm" style={{ color: '#059669' }}>
                                    <CheckCircle size={11} className="inline mr-1" />Completed in {formatElapsed(elapsed)}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Overall progress */}
                    {(running || done) && (
                        <div className="glass-card p-6">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-semibold text-slate-900">Overall Progress</span>
                                <span className="text-sm font-bold" style={{ color: '#2563eb' }}>
                                    {done ? 100 : Math.round((currentStep / STEPS.length) * 100)}%
                                </span>
                            </div>
                            <div className="progress-bar mb-4">
                                <div className="progress-fill" style={{
                                    width: done ? '100%' : `${(currentStep / STEPS.length) * 100}%`
                                }} />
                            </div>

                            {/* Step tracker */}
                            <div className="step-tracker">
                                {STEPS.map((step, i) => {
                                    const isDone = done || i < currentStep;
                                    const isActive = i === currentStep && running;
                                    const isPending = !isDone && !isActive;
                                    return (
                                        <div key={i}>
                                            <div className="step-item">
                                                <div className={`step-dot ${isDone ? 'done' : isActive ? 'active' : 'pending'}`}>
                                                    {isDone ? <CheckCircle size={14} /> : isActive
                                                        ? <span className="animate-spin inline-block text-xs">⟳</span>
                                                        : <span style={{ fontSize: 11 }}>{i + 1}</span>}
                                                </div>
                                                <div className="pt-1 pb-2">
                                                    <div className="text-xs font-medium" style={{ color: isDone ? '#0f172a' : isActive ? '#2563eb' : '#94a3b8' }}>
                                                        {step}
                                                    </div>
                                                </div>
                                            </div>
                                            {i < STEPS.length - 1 && (
                                                <div className={`step-line ${isDone ? 'done' : ''}`} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: results */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Algorithm sweep live results */}
                    {(completedAlgos.length > 0 || done) && (
                        <div className="glass-card p-6 lg:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <Cpu size={16} style={{ color: '#2563eb' }} />
                                <div className="font-bold text-slate-900">Algorithm Sweep</div>
                                <span className="badge badge-purple ml-auto">
                                    {done ? AUTOML_ALGORITHMS.length : completedAlgos.length}/{AUTOML_ALGORITHMS.length}
                                </span>
                            </div>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart
                                    data={done ? sortedAlgos : [...completedAlgos].sort((a, b) => b.score - a.score)}
                                    layout="vertical" margin={{ left: 10, right: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.07)" horizontal={false} />
                                    <XAxis type="number" domain={[0.7, 0.95]} tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                                        tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="name" tick={{ fill: '#334155', fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
                                    <RTooltip content={<CustomTooltip />} />
                                    <Bar dataKey="score" radius={[0, 4, 4, 0]} >
                                        {(done ? sortedAlgos : [...completedAlgos].sort((a, b) => b.score - a.score)).map((entry, i) => (
                                            <Cell key={i} fill={i === 0 ? '#6366f1' : 'rgba(99,102,241,0.35)'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Best model recommendation */}
                    {done && (
                        <div className="glass-card p-6 lg:p-8" style={{ borderColor: '#059669', background: '#f0fdf4' }}>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100">
                                    <Trophy size={18} style={{ color: '#059669' }} />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900">Best Model Recommended</div>
                                    <div className="text-sm text-slate-500">Selected by AutoML after full sweep + Optuna tuning</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold" style={{ color: '#059669' }}>
                                        {(bestModel.score * 100).toFixed(1)}%
                                    </div>
                                    <div className="text-xs text-right text-slate-500">accuracy</div>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl mb-5 bg-white border border-slate-200">
                                <div className="text-xl font-bold text-slate-900 mb-1.5">🚀 {bestModel.name}</div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="badge badge-green">Best Accuracy: {(bestModel.score * 100).toFixed(1)}%</span>
                                    <span className="badge badge-cyan">Tuning: Optuna</span>
                                    <span className="badge badge-purple">v1.5-automl</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4 mb-6">
                                {[
                                    ['Accuracy', '88.9%', '#4f46e5'],
                                    ['F1-Score', '87.6%', '#0891b2'],
                                    ['Precision', '88.1%', '#059669'],
                                    ['Recall', '87.2%', '#d97706'],
                                ].map(([l, v, c]) => (
                                    <div key={l} className="text-center p-3 rounded-lg bg-slate-50 border border-slate-200">
                                        <div className="text-base font-bold" style={{ color: c }}>{v}</div>
                                        <div className="text-xs mt-0.5 text-slate-500">{l}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <button className="btn-primary flex-1" onClick={() => toast.success('XGBoost AutoML model deployed!')}>
                                    <Zap size={14} /> Deploy Model
                                </button>
                                <button className="btn-secondary flex-1" onClick={() => toast.success('Model exported as xgboost_automl.joblib')}>
                                    <Download size={14} /> Export (joblib)
                                </button>
                                <button className="btn-secondary" onClick={() => toast.success('Full report exported as PDF')}>
                                    <BarChart3 size={14} /> Report
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Idle state */}
                    {!running && !done && (
                        <div className="glass-card p-12 text-center flex flex-col items-center justify-center" style={{ minHeight: 320 }}>
                            <Zap size={48} className="mb-4 text-blue-200" />
                            <div className="text-lg font-bold text-slate-900 mb-2">Ready to Launch</div>
                            <div className="text-sm max-w-sm text-slate-500">
                                Click <strong className="text-blue-600">Launch AutoML</strong> to automatically test all 9 algorithms,
                                run Optuna hyperparameter tuning, and get the best model recommended for your dataset.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
