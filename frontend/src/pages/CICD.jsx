import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    fetchCicdStatus,
    runCicdPipeline,
    fetchCicdHistory
} from '../services/api';
import {
    GitBranch, ShieldCheck, ShieldAlert, Terminal,
    Play, RefreshCw, Clock, ChevronDown, ChevronUp,
    Cpu, CheckCircle2, XCircle, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CICD() {
    const [status, setStatus] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [expandedRun, setExpandedRun] = useState(null);
    const terminalEndRef = useRef(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [s, h] = await Promise.all([fetchCicdStatus(), fetchCicdHistory()]);
            setStatus(s);
            setHistory(h);
        } catch (e) {
            toast.error("Failed to load CI/CD status: " + e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRunPipeline = async () => {
        setRunning(true);
        const t = toast.loading('Executing CI/CD Pipeline (Quality Gates + API Smoke Tests)...');
        try {
            const result = await runCicdPipeline();
            setStatus(prev => ({
                ...prev,
                last_run: result,
                best_model_accuracy: result.best_accuracy,
                quality_gate_passed: result.gate_passed
            }));
            
            // Reload history to show the latest run
            const newHistory = await fetchCicdHistory();
            setHistory(newHistory);
            
            if (result.status === 'success') {
                toast.success('CI/CD Pipeline Completed: ALL CHECKS PASSED!', { id: t });
            } else {
                toast.error('CI/CD Pipeline Failed: Quality gates or serving checks rejected!', { id: t });
            }
        } catch (e) {
            toast.error(e.message, { id: t });
        } finally {
            setRunning(false);
        }
    };

    const toggleRunLogs = (runId) => {
        if (expandedRun === runId) {
            setExpandedRun(null);
        } else {
            setExpandedRun(runId);
        }
    };

    // Auto-scroll terminal only while a run is actively in progress
    useEffect(() => {
        if (running && terminalEndRef.current) {
            terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [running]);

    const bestAcc = status?.best_model_accuracy ?? 0;
    const threshold = status?.quality_gate_threshold ?? 0.80;
    const ratio = Math.min(100, (bestAcc / 1.0) * 100);
    const thresholdRatio = (threshold / 1.0) * 100;

    return (
        <div className="space-y-8 animate-fade-up">
            {/* Header */}
            <div className="section-header">
                <div>
                    <h1 className="page-title">CI/CD & Quality Gates</h1>
                    <p className="page-subtitle">Partie 5 — Git pre-commit, barrière de qualité & validation d&apos;API</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary" onClick={loadData} disabled={loading || running}>
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button className="btn-primary" onClick={handleRunPipeline} disabled={running}>
                        {running ? <Terminal size={14} className="animate-spin" /> : <Play size={14} />}
                        Run CI/CD checks
                    </button>
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {loading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="stat-card animate-pulse h-24" />
                    ))
                ) : (
                    <>
                        {/* Quality Gate Card */}
                        <div className="stat-card flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-xs text-slate-500 font-medium">Quality Gate</div>
                                    <div className={`text-xl font-bold mt-1 ${status?.quality_gate_passed ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {status?.quality_gate_passed ? 'PASSED' : 'FAILED'}
                                    </div>
                                </div>
                                <div className={`p-2 rounded-lg ${status?.quality_gate_passed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                    {status?.quality_gate_passed ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                                </div>
                            </div>
                            <div className="text-xs text-slate-400 mt-2">
                                Best model vs production gate
                            </div>
                        </div>

                        {/* Git Hooks Card */}
                        <div className="stat-card flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-xs text-slate-500 font-medium">Git Pre-Commit Hook</div>
                                    <div className={`text-xl font-bold mt-1 ${status?.hook_active ? 'text-indigo-400' : 'text-amber-500'}`}>
                                        {status?.hook_active ? 'Active' : 'Inactive'}
                                    </div>
                                </div>
                                <div className={`p-2 rounded-lg ${status?.hook_active ? 'bg-indigo-500/10 text-indigo-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                    <GitBranch size={20} />
                                </div>
                            </div>
                            <div className="text-xs text-slate-400 mt-2">
                                Blocks local commits if gate fails
                            </div>
                        </div>

                        {/* Accuracy Threshold Card */}
                        <div className="stat-card flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-xs text-slate-500 font-medium">Best Run Accuracy</div>
                                    <div className="text-xl font-bold mt-1 text-accent">
                                        {(bestAcc * 100).toFixed(2)}%
                                    </div>
                                </div>
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                    <Cpu size={20} />
                                </div>
                            </div>
                            <div className="text-xs text-slate-400 mt-2">
                                Gate threshold is {(threshold * 100).toFixed(0)}%
                            </div>
                        </div>

                        {/* Last Run Card */}
                        <div className="stat-card flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-xs text-slate-500 font-medium">Last Executed Run</div>
                                    <div className="text-lg font-bold mt-1 flex items-center gap-1.5">
                                        {status?.last_run ? (
                                            status.last_run.status === 'success' ? (
                                                <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={16} /> PASS</span>
                                            ) : (
                                                <span className="text-rose-500 flex items-center gap-1"><XCircle size={16} /> FAIL</span>
                                            )
                                        ) : (
                                            <span className="text-slate-400">None</span>
                                        )}
                                    </div>
                                </div>
                                <div className="p-2 rounded-lg bg-slate-500/10 text-slate-400">
                                    <Clock size={20} />
                                </div>
                            </div>
                            <div className="text-xs text-slate-400 mt-2">
                                {status?.last_run ? `${status.last_run.timestamp}` : 'Never executed'}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Threshold Gauge visualization */}
            {!loading && (
                <div className="glass-card p-6">
                    <h2 className="font-bold text-sm mb-4 text-slate-700 dark:text-slate-200">Quality Gate Gauge (Accuracy Threshold)</h2>
                    <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between text-xs font-semibold">
                            <div className="text-indigo-600 dark:text-indigo-400">0.0%</div>
                            <div className="text-slate-500">Target Gate Threshold: {(threshold * 100).toFixed(0)}%</div>
                            <div className="text-emerald-600 dark:text-emerald-400">100%</div>
                        </div>
                        <div className="overflow-hidden h-4 text-xs rounded-full bg-slate-100 dark:bg-slate-800 relative shadow-inner">
                            {/* Threshold bar separator */}
                            <div 
                                className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10" 
                                style={{ left: `${thresholdRatio}%` }}
                                title={`Threshold: ${(threshold*100).toFixed(0)}%`}
                            />
                            {/* Best run accuracy fill */}
                            <div 
                                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                                    status?.quality_gate_passed ? 'bg-gradient-to-r from-teal-400 to-emerald-500' : 'bg-gradient-to-r from-orange-400 to-rose-500'
                                }`} 
                                style={{ width: `${ratio}%` }}
                            />
                        </div>
                        <div className="flex justify-between items-center text-xs mt-1.5">
                            <span className="text-slate-400">Preprocessed splits validation accuracy</span>
                            <span className={`font-bold ${status?.quality_gate_passed ? 'text-emerald-500' : 'text-rose-500'}`}>
                                Current Best: {(bestAcc * 100).toFixed(2)}% ({status?.quality_gate_passed ? 'Passed' : 'Under threshold'})
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Terminal Panel */}
            <div className="glass-card overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-rose-500" />
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="text-xs font-mono text-slate-400 ml-2">mlops-ci-cd-runner --verbose</span>
                    </div>
                    {status?.last_run && (
                        <div className="text-xs font-mono text-slate-500">
                            Execution time: {status.last_run.duration_seconds}s
                        </div>
                    )}
                </div>
                
                <div className="bg-slate-950 p-6 font-mono text-xs text-slate-300 min-h-[250px] max-h-[380px] overflow-y-auto scrollbar-thin">
                    {running ? (
                        <div className="space-y-2 text-emerald-400 animate-pulse">
                            <div>$ running local pre-commit simulation...</div>
                            <div>$ querying sqlite:///mlflow.db for best run...</div>
                            <div>$ invoking tests/test_api.py...</div>
                            <div className="flex items-center gap-2 mt-4 text-slate-400">
                                <RefreshCw className="animate-spin" size={12} /> Running checks...
                            </div>
                        </div>
                    ) : status?.last_run?.logs ? (
                        <pre className="whitespace-pre-wrap select-text leading-relaxed font-mono">
                            {status.last_run.logs}
                        </pre>
                    ) : (
                        <div className="text-slate-500 text-center py-12 select-none">
                            No active CI/CD execution log. Click &quot;Run CI/CD checks&quot; to run pre-commit validations.
                        </div>
                    )}
                    <div ref={terminalEndRef} />
                </div>
            </div>

            {/* History section */}
            <div className="glass-card p-6">
                <h2 className="font-bold mb-4 text-slate-800 dark:text-slate-200">Execution History</h2>
                {history.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">
                        No pipeline runs recorded yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                                    <th className="py-2.5">Date</th>
                                    <th>Status</th>
                                    <th>Accuracy</th>
                                    <th>Pre-commit Gate</th>
                                    <th>Serving Tests</th>
                                    <th>Duration</th>
                                    <th className="text-right">Logs</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((run) => (
                                    <React.Fragment key={run.id}>
                                        <tr className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                            <td className="py-3 font-medium">{run.timestamp}</td>
                                            <td>
                                                {run.status === 'success' ? (
                                                    <span className="badge badge-green text-xs font-semibold">SUCCESS</span>
                                                ) : (
                                                    <span className="badge badge-red text-xs font-semibold">FAILED</span>
                                                )}
                                            </td>
                                            <td className="font-mono">{(run.best_accuracy * 100).toFixed(1)}%</td>
                                            <td>
                                                {run.gate_passed ? (
                                                    <span className="text-emerald-500 text-xs font-medium flex items-center gap-1">✓ Passed</span>
                                                ) : (
                                                    <span className="text-rose-500 text-xs font-medium flex items-center gap-1">✗ Failed</span>
                                                )}
                                            </td>
                                            <td>
                                                {run.tests_passed ? (
                                                    <span className="text-emerald-500 text-xs font-medium flex items-center gap-1">✓ Passed</span>
                                                ) : (
                                                    <span className="text-rose-500 text-xs font-medium flex items-center gap-1">✗ Failed / Skipped</span>
                                                )}
                                            </td>
                                            <td className="text-slate-500">{run.duration_seconds}s</td>
                                            <td className="text-right">
                                                <button 
                                                    onClick={() => toggleRunLogs(run.id)}
                                                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                                >
                                                    {expandedRun === run.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedRun === run.id && (
                                            <tr>
                                                <td colSpan={7} className="py-3 px-4 bg-slate-950 rounded-lg border border-slate-800">
                                                    <div className="flex justify-between items-center text-slate-500 font-mono text-[10px] pb-2 border-b border-slate-800 mb-2">
                                                        <span>RUN ID: {run.id}</span>
                                                        <span>CONSOLE LOGS</span>
                                                    </div>
                                                    <pre className="text-slate-300 font-mono text-xs whitespace-pre-wrap max-h-60 overflow-y-auto p-1 leading-relaxed">
                                                        {run.logs}
                                                    </pre>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
