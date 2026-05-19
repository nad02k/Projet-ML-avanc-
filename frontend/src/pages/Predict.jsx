import { useState, useEffect } from 'react';
import { fetchDataset, predictModel } from '../services/api';
import { 
    Zap, Brain, Play, RefreshCw, 
    AlertTriangle, CheckCircle, Info, ArrowRight,
    Loader2, Target, Gauge
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Predict() {
    const [dataset, setDataset] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [selectedModel, setSelectedModel] = useState('rf');
    const [inputs, setInputs] = useState({});
    const [prediction, setPrediction] = useState(null);
    const [predicting, setPredicting] = useState(false);

    const MODELS = [
        { id: 'rf',  name: 'Random Forest' },
        { id: 'lr',  name: 'Logistic Regression' },
        { id: 'svm', name: 'SVM' },
        { id: 'knn', name: 'KNN' },
        { id: 'gb',  name: 'Gradient Boosting' },
        { id: 'ada', name: 'AdaBoost' },
        { id: 'xgb', name: 'XGBoost' },
        { id: 'nn',  name: 'Neural Network' },
    ];

    useEffect(() => {
        fetchDataset()
            .then(d => {
                setDataset(d);
                // Initialize inputs with default values
                if (d.columns) {
                    const initial = {};
                    d.columns.forEach(col => {
                        if (d.column_types[col] !== 'target') {
                            initial[col] = d.column_types[col] === 'num' ? 0 : '';
                        }
                    });
                    setInputs(initial);
                }
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const handleInputChange = (col, val, type) => {
        setInputs(prev => ({
            ...prev,
            [col]: type === 'num' ? (val === '' ? '' : Number(val)) : val
        }));
    };

    const handlePredict = async () => {
        setPredicting(true);
        setPrediction(null);
        try {
            const res = await predictModel(selectedModel, inputs);
            setPrediction(res);
            toast.success('Prediction generated!');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setPredicting(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4 animate-fade-up">
            <Loader2 className="animate-spin text-blue-600" size={32} />
            <p className="text-slate-500 font-medium">Loading model metadata...</p>
        </div>
    );

    if (error || !dataset || dataset.columns.length === 0) return (
        <div className="glass-card p-10 text-center animate-fade-up">
            <AlertTriangle size={36} className="mx-auto mb-3 text-amber-600" />
            <div className="font-semibold text-slate-900 mb-1">Inference Engine Offline</div>
            <p className="text-sm text-slate-500 mb-6">
                Please upload a dataset and run the pipeline first to enable predictions.
            </p>
            <button className="btn-primary" onClick={() => window.location.href='/data'}>
                Go to Dataset
            </button>
        </div>
    );

    const featureCols = dataset.columns.filter(c => dataset.column_types[c] !== 'target');

    return (
        <div className="space-y-8 animate-fade-up">
            <div className="section-header">
                <div>
                    <h1 className="page-title">Model Testing</h1>
                    <p className="page-subtitle">Real-time inference on trained models</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ── Left Column: Configuration ── */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Brain size={18} className="text-[var(--accent)]" />
                            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Select Model</h2>
                        </div>
                        
                        <div className="space-y-2">
                            {MODELS.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setSelectedModel(m.id)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border cursor-pointer ${
                                        selectedModel === m.id 
                                        ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)] shadow-sm font-semibold' 
                                        : 'bg-transparent border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] hover:border-[var(--border-hover)]'
                                    }`}
                                >
                                    <span className="font-medium text-sm">{m.name}</span>
                                    {selectedModel === m.id && <CheckCircle size={14} />}
                                </button>
                            ))}
                        </div>
                        
                        <div className="mt-6 p-4 bg-[var(--bg-muted)] rounded-xl border border-[var(--border)]">
                            <div className="flex gap-3 text-xs text-[var(--text-muted)] leading-relaxed">
                                <Info size={14} className="flex-shrink-0 text-[var(--accent)]" />
                                <span>Ensures the model is trained before testing. If you get an error, visit the Model Hub to train this algorithm first.</span>
                            </div>
                        </div>
                    </div>

                    {/* Prediction Result Card */}
                    {prediction && (
                        <div className="glass-card p-6 animate-fade-in">
                            <div className="flex items-center gap-2 mb-6 text-[var(--text-muted)]">
                                <Target size={18} className="text-[var(--accent)] animate-pulse" />
                                <h2 className="font-bold text-xs uppercase tracking-wider">Prediction Result</h2>
                            </div>
                            
                            <div className="text-center py-4">
                                <div className="flex flex-col items-center justify-center my-4">
                                    <span className="text-[10px] text-[var(--text-muted)] mb-2 font-bold tracking-widest uppercase">Predicted Outcome</span>
                                    <div className={`px-8 py-3.5 rounded-2xl text-3xl font-black tracking-widest shadow-lg transition-all ${
                                        (prediction.prediction === 1 || prediction.prediction === '1' || String(prediction.prediction).toLowerCase() === 'pass')
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/25 shadow-emerald-500/5'
                                            : (prediction.prediction === 0 || prediction.prediction === '0' || String(prediction.prediction).toLowerCase() === 'fail')
                                            ? 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/25 shadow-rose-500/5'
                                            : 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-500/25 shadow-indigo-500/5'
                                    }`}>
                                        {prediction.prediction === 1 || prediction.prediction === '1' || String(prediction.prediction).toLowerCase() === 'pass'
                                            ? 'PASS'
                                            : prediction.prediction === 0 || prediction.prediction === '0' || String(prediction.prediction).toLowerCase() === 'fail'
                                            ? 'FAIL'
                                            : String(prediction.prediction).toUpperCase()
                                        }
                                    </div>
                                </div>
                                <div className="text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-center gap-1.5 bg-white/5 py-1.5 px-4 rounded-full w-fit mx-auto border border-[var(--border)] shadow-sm mt-4">
                                    <Gauge size={14} className="text-[var(--text-muted)]" />
                                    Confidence: <span className="font-bold text-[var(--text-primary)]">{prediction.probability ? (prediction.probability[prediction.prediction] * 100).toFixed(1) : '100'}%</span>
                                </div>
                            </div>
                            
                            <div className="mt-6 pt-6 border-t border-[var(--border)] space-y-3">
                                {prediction.probability && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold uppercase text-[var(--text-muted)]">
                                            <span>Probability Distribution</span>
                                        </div>
                                        <div className="h-3 w-full bg-white/10 dark:bg-slate-800/50 rounded-full overflow-hidden flex shadow-inner">
                                            <div 
                                                className="h-full bg-emerald-500 transition-all duration-500" 
                                                style={{ width: `${prediction.probability[1] * 100}%` }} 
                                            />
                                            <div 
                                                className="h-full bg-rose-500 transition-all duration-500" 
                                                style={{ width: `${prediction.probability[0] * 100}%` }} 
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] font-bold">
                                            <span className="text-emerald-600">Pass: {(prediction.probability[1] * 100).toFixed(0)}%</span>
                                            <span className="text-rose-600">Fail: {(prediction.probability[0] * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Right Column: Input Features ── */}
                <div className="lg:col-span-2">
                    <div className="glass-card p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-2">
                                <Zap size={18} className="text-amber-500 animate-pulse" />
                                <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Input Features</h2>
                            </div>
                            <button 
                                onClick={handlePredict}
                                disabled={predicting}
                                className="btn-primary cursor-pointer group"
                            >
                                {predicting ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <>Run Inference <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                            {featureCols.map(col => (
                                <div key={col} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">
                                            {col.replace(/_/g, ' ')}
                                        </label>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-muted)]">
                                            {dataset.column_types[col]}
                                        </span>
                                    </div>
                                    
                                    {dataset.column_types[col] === 'num' ? (
                                        <input
                                            type="number"
                                            value={inputs[col] ?? ''}
                                            onChange={(e) => handleInputChange(col, e.target.value, 'num')}
                                            className="form-input rounded-xl px-4 py-3 text-sm"
                                            placeholder="Enter numeric value..."
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            value={inputs[col] ?? ''}
                                            onChange={(e) => handleInputChange(col, e.target.value, 'cat')}
                                            className="form-input rounded-xl px-4 py-3 text-sm"
                                            placeholder="Enter category name..."
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 pt-8 border-t border-[var(--border)]">
                            <div className="flex items-start gap-4 p-5 rounded-2xl bg-[var(--accent-soft)] border border-[var(--border)]">
                                <Info size={20} className="text-[var(--accent)] mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">How it works</h4>
                                    <p className="text-xs text-[var(--text-secondary)]/80 leading-relaxed">
                                        The inputs above are processed through the same pipeline used during training. 
                                        Numerical values are scaled, and categorical labels are aligned with the One-Hot encoding schema. 
                                        If you enter a category the model hasn't seen, it will be handled as 0 in the alignment matrix.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
