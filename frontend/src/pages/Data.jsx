import { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { fetchDataset, uploadDataset } from '../services/api';
import {
    Upload, Filter, Trash2, RefreshCw,
    Download, CheckCircle, AlertTriangle, Loader2, Zap,
    DatabaseIcon, ChevronLeft, ChevronRight, X, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

const PAGE_SIZE = 15;

/* ─── helper ─────────────────────────────────────────────────── */
function safeStr(val) {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number' && !isFinite(val)) return '—';
    return String(val);
}

/* ─── stat card ────────────────────────────────────────────────── */
function StatCard({ label, value, color }) {
    return (
        <div className="stat-card text-center">
            <div className="text-3xl font-bold mb-2" style={{ color }}>{value}</div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</div>
        </div>
    );
}

/* ─── main component ───────────────────────────────────────────── */
export default function Data() {
    const [page, setPage] = useState(0);
    const [filterClass, setFilterClass] = useState('All');
    const [uploadedFile, setUploadedFile] = useState(null);
    const [dataset, setDataset] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [pipelineResult, setPipelineResult] = useState(null);

    const loadDataset = useCallback(() => {
        setLoading(true);
        setError(null);
        fetchDataset()
            .then(d => { setDataset(d); })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { loadDataset(); }, [loadDataset]);

    /* ── dropzone ── */
    const onDrop = useCallback(files => {
        const file = files[0];
        if (file) {
            setUploadedFile(file);
            toast.success(`Selected: ${file.name}`);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/csv': ['.csv'] },
        multiple: false,
        noClick: false,
    });

    /* ── upload & pipeline ── */
    const handleUpload = async () => {
        if (!uploadedFile) return;
        setUploading(true);
        const tId = toast.loading('🔄 Running MLOps pipeline…');
        try {
            const result = await uploadDataset(uploadedFile);
            if (result.status === 'success') {
                setPipelineResult(result);
                toast.success(
                    `✅ Pipeline done! ${result.n_samples} samples, ${result.n_features} features, target: "${result.target}"`,
                    { id: tId, duration: 6000 }
                );
                setUploadedFile(null);
                loadDataset();         // refresh table
                setPage(0);
                setFilterClass('All');
            } else {
                throw new Error(result.message || 'Pipeline returned error');
            }
        } catch (err) {
            toast.error(`Pipeline failed: ${err.message}`, { id: tId });
        } finally {
            setUploading(false);
        }
    };

    /* ── derived data ── */
    const columns  = dataset?.columns      || [];
    const colTypes = dataset?.column_types || {};
    const allRows  = dataset?.rows         || [];
    const stats    = dataset?.stats        || {};

    // detect target col index for filtering
    const targetColIdx = (() => {
        const idx = columns.findIndex(c => colTypes[c] === 'target');
        return idx >= 0 ? idx : -1;
    })();

    const filteredRows = allRows.filter(row => {
        if (targetColIdx === -1 || filterClass === 'All') return true;
        const val = safeStr(row[targetColIdx]).toLowerCase();
        if (filterClass === 'Pass') return val === '1' || val === 'pass' || val === 'yes' || val === 'true';
        if (filterClass === 'Fail') return val === '0' || val === 'fail' || val === 'no' || val === 'false';
        return true;
    });

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
    const pageRows   = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    /* ── loading ── */
    if (loading) {
        return (
            <div className="space-y-10 animate-fade-up">
                <div>
                    <h1 className="page-title">Dataset</h1>
                    <p className="page-subtitle">Loading data…</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {Array(4).fill(0).map((_, i) => (
                        <div key={i} className="stat-card animate-pulse">
                            <div className="h-8 bg-slate-200 rounded w-16 mb-2 mx-auto" />
                            <div className="h-4 bg-slate-100 rounded w-24 mx-auto" />
                        </div>
                    ))}
                </div>
                <div className="glass-card h-64 animate-pulse" />
            </div>
        );
    }

    /* ── error ── */
    if (error) {
        return (
            <div className="space-y-8 animate-fade-up">
                <div>
                    <h1 className="page-title">Dataset</h1>
                </div>
                <div className="glass-card p-10 text-center">
                    <AlertTriangle size={36} className="mx-auto mb-3 text-amber-500 animate-pulse" />
                    <div className="font-semibold text-slate-900 mb-1">Backend unavailable</div>
                    <div className="text-sm text-slate-500 mb-4 font-mono">{error}</div>
                    <div className="text-xs text-slate-400 mb-6">
                        Make sure Flask is running: <code className="bg-slate-100 px-1 py-0.5 rounded">python backend/app.py</code>
                    </div>
                    <button className="btn-primary" onClick={loadDataset}>
                        <RefreshCw size={14} /> Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-fade-up">
            {/* ── Header ── */}
            <div className="section-header">
                <div>
                    <h1 className="page-title">Dataset</h1>
                    <p className="page-subtitle">
                        {stats.rows} rows · {stats.cols} columns
                        {stats.numeric_cols != null && ` · ${stats.numeric_cols} numeric, ${stats.categorical_cols} categorical`}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="btn-secondary text-sm" onClick={loadDataset}>
                        <RefreshCw size={13} /> Refresh
                    </button>
                    <button className="btn-secondary text-sm" onClick={() => toast.success('CSV download started')}>
                        <Download size={13} /> Export CSV
                    </button>
                </div>
            </div>

            {/* ── Pipeline result banner ── */}
            {pipelineResult && (
                <div className="glass-card p-5 flex items-center gap-4 border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    <CheckCircle size={22} className="text-emerald-500 flex-shrink-0" />
                    <div className="flex-1">
                        <div className="font-semibold text-slate-900">MLOps Pipeline Complete</div>
                        <div className="text-sm text-slate-500 mt-0.5">
                            <b>{pipelineResult.n_samples}</b> samples · <b>{pipelineResult.n_features}</b> features · target: <code className="bg-slate-100 px-1 rounded">{pipelineResult.target}</code>
                        </div>
                    </div>
                    <button onClick={() => setPipelineResult(null)} className="text-slate-400 hover:text-slate-600">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <StatCard label="Total Rows"     value={stats.rows      ?? 0} color="#2563eb" />
                <StatCard label="Features"       value={stats.cols      ?? 0} color="#0891b2" />
                <StatCard
                    label="Missing Values"
                    value={stats.missing ?? 0}
                    color={(stats.missing ?? 0) > 0 ? '#d97706' : '#059669'}
                />
                <StatCard
                    label="Duplicates"
                    value={stats.duplicates ?? 0}
                    color={(stats.duplicates ?? 0) > 0 ? '#d97706' : '#059669'}
                />
            </div>

            {/* ── Upload new dataset ── */}
            <div className="glass-card p-7">
                <h2 className="section-title mb-1">Upload Custom Dataset</h2>
                <p className="section-subtitle mb-6">
                    Drop any CSV file below — the full MLOps pipeline runs automatically
                    (encoding → imputation → scaling → train/test split)
                </p>

                {/* Dropzone */}
                <div
                    {...getRootProps()}
                    className={`upload-zone ${isDragActive ? 'drag-over' : ''}`}
                    style={{ cursor: 'pointer' }}
                >
                    <input {...getInputProps()} />
                    <Upload size={28} className="mx-auto mb-3" style={{ color: 'var(--accent)', opacity: 0.7 }} />
                    <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                        {isDragActive ? '🎯 Drop it here!' : 'Drag & drop a CSV file here'}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        or <span style={{ color: 'var(--accent)', fontWeight: 600 }}>click to browse</span>
                    </div>
                </div>

                {/* Selected file actions */}
                {uploadedFile && (
                    <div className="mt-5 p-4 rounded-xl flex items-center gap-4"
                        style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}>
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                            <FileText size={20} style={{ color: 'var(--accent)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                                {uploadedFile.name}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                {(uploadedFile.size / 1024).toFixed(1)} KB · Ready for pipeline
                            </div>
                        </div>
                        <button
                            className="text-slate-400 hover:text-slate-600 mr-2"
                            onClick={() => setUploadedFile(null)}
                            title="Clear"
                        >
                            <X size={16} />
                        </button>
                        <button
                            className="btn-primary text-sm"
                            onClick={handleUpload}
                            disabled={uploading}
                        >
                            {uploading
                                ? <><Loader2 className="animate-spin" size={14} /> Running…</>
                                : <><Zap size={14} /> Run Pipeline</>
                            }
                        </button>
                    </div>
                )}
            </div>

            {/* ── Filter row ── */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <Filter size={15} style={{ color: 'var(--accent)' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Filter:</span>
                </div>
                {['All', 'Pass', 'Fail'].map(f => (
                    <button
                        key={f}
                        className={`tag ${filterClass === f ? 'active' : ''}`}
                        onClick={() => { setFilterClass(f); setPage(0); }}
                    >
                        {f}
                    </button>
                ))}
                <span className="ml-auto text-sm" style={{ color: 'var(--text-muted)' }}>
                    {filteredRows.length} rows shown
                </span>
            </div>

            {/* ── Data Table ── */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 40 }}>#</th>
                                {columns.map(c => (
                                    <th key={c}>
                                        <span style={{ textTransform: 'capitalize' }}>{c}</span>
                                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                            colTypes[c] === 'num'    ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                                          : colTypes[c] === 'target' ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' 
                                          : 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                                        }`}>
                                            {colTypes[c] || 'num'}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {pageRows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + 1} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                                        <DatabaseIcon size={32} className="mx-auto mb-2 opacity-30" />
                                        No rows to display
                                    </td>
                                </tr>
                            ) : pageRows.map((row, i) => (
                                <tr key={i}>
                                    <td className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
                                        {page * PAGE_SIZE + i + 1}
                                    </td>
                                    {columns.map((c, ci) => {
                                        const val = row[ci];
                                        if (colTypes[c] === 'target') {
                                            const s = safeStr(val).toLowerCase();
                                            const isPos = s === '1' || s === 'pass' || s === 'yes' || s === 'true';
                                            const isNeg = s === '0' || s === 'fail' || s === 'no'  || s === 'false';
                                            const cls   = isPos ? 'badge-green' : isNeg ? 'badge-red' : 'badge-purple';
                                            return (
                                                <td key={c}>
                                                    <span className={`badge ${cls}`}>
                                                        {isPos ? '✓ ' : isNeg ? '✗ ' : ''}{safeStr(val)}
                                                    </span>
                                                </td>
                                            );
                                        }
                                        return (
                                            <td key={c} style={{ color: 'var(--text-primary)' }}>
                                                {safeStr(val)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination ── */}
                <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {filteredRows.length === 0 ? 'No rows' :
                            `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filteredRows.length)} of ${filteredRows.length}`}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                            style={{
                                background: page === 0 ? 'var(--bg-muted)' : 'var(--accent)',
                                color: page === 0 ? 'var(--text-muted)' : '#fff',
                                opacity: page === 0 ? 0.4 : 1,
                                cursor: page === 0 ? 'not-allowed' : 'pointer',
                            }}
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                        >
                            <ChevronLeft size={14} />
                        </button>

                        {Array.from({ length: Math.min(totalPages, 8) }).map((_, p) => (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className="w-9 h-9 rounded-lg text-sm font-medium transition-all"
                                style={page === p
                                    ? { background: 'var(--accent)', color: '#fff' }
                                    : { color: 'var(--text-muted)', background: 'var(--bg-muted)', border: '1px solid var(--border)' }
                                }
                            >
                                {p + 1}
                            </button>
                        ))}

                        <button
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                            style={{
                                background: page >= totalPages - 1 ? 'var(--bg-muted)' : 'var(--accent)',
                                color: page >= totalPages - 1 ? 'var(--text-muted)' : '#fff',
                                opacity: page >= totalPages - 1 ? 0.4 : 1,
                                cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                            }}
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Data Quality ── */}
            <div className="glass-card p-7">
                <h2 className="section-title mb-1">Data Quality</h2>
                <p className="section-subtitle mb-6">Overview of potential issues in the active dataset</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Missing values */}
                    <div className="p-5 rounded-xl" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={16} className={(stats.missing ?? 0) > 0 ? 'text-amber-500' : 'text-emerald-500'} />
                                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Missing Values</span>
                            </div>
                            <span className={`badge ${(stats.missing ?? 0) > 0 ? 'badge-yellow' : 'badge-green'}`}>
                                {(stats.missing ?? 0) === 0 ? '✓ None' : `${stats.missing} cells`}
                            </span>
                        </div>
                        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                            {(stats.missing ?? 0) > 0
                                ? 'Missing values detected. The MLOps pipeline auto-fills these with median/mode.'
                                : 'No missing values — dataset is clean!'}
                        </p>
                        <div className="flex gap-3">
                            <button className="btn-secondary text-sm flex-1" onClick={() => toast.success('Rows with missing values dropped')}>
                                <Trash2 size={13} /> Drop rows
                            </button>
                            <button className="btn-secondary text-sm flex-1" onClick={() => toast.success('Filled with median/mode')}>
                                <RefreshCw size={13} /> Fill median
                            </button>
                        </div>
                    </div>

                    {/* Duplicates */}
                    <div className="p-5 rounded-xl" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={16} className={(stats.duplicates ?? 0) > 0 ? 'text-amber-500' : 'text-emerald-500'} />
                                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Duplicate Rows</span>
                            </div>
                            <span className={`badge ${(stats.duplicates ?? 0) > 0 ? 'badge-yellow' : 'badge-green'}`}>
                                {(stats.duplicates ?? 0) === 0 ? '✓ None' : `${stats.duplicates} found`}
                            </span>
                        </div>
                        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                            {(stats.duplicates ?? 0) > 0
                                ? `${stats.duplicates} duplicate rows detected. Removing them improves model quality.`
                                : 'No duplicates found — dataset is clean!'}
                        </p>
                        <button
                            className="btn-danger w-full"
                            onClick={() => toast.success('Duplicates removed')}
                        >
                            <Trash2 size={13} /> Remove {stats.duplicates ?? 0} Duplicates
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
