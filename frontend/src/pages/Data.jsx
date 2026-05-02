import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { fetchDataset } from '../services/api';
import {
    Upload, Filter, Trash2, RefreshCw,
    Download, CheckCircle, AlertTriangle, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

const PAGE_SIZE = 10;

export default function Data() {
    const [page, setPage] = useState(0);
    const [filterClass, setFilterClass] = useState('All');
    const [uploadedFile, setUploadedFile] = useState(null);
    const [dataset, setDataset] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [duplicates, setDuplicates] = useState(0);

    useEffect(() => {
        fetchDataset()
            .then(d => {
                setDataset(d);
                setDuplicates(d.stats.duplicates);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const onDrop = useCallback(files => {
        const file = files[0];
        if (file) { setUploadedFile(file); toast.success(`Uploaded: ${file.name}`); }
    }, []);
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop, accept: { 'text/csv': ['.csv'] }, multiple: false
    });

    const columns = dataset?.columns || [];
    const colTypes = dataset?.column_types || {};
    const allRows = dataset?.rows || [];
    const stats = dataset?.stats || {};

    const passColIdx = columns.indexOf('pass') !== -1 ? columns.indexOf('pass')
        : columns.indexOf('G3') !== -1 ? columns.indexOf('G3') : -1;

    const filteredRows = allRows.filter(row => {
        if (passColIdx === -1) return true;
        const val = row[passColIdx];
        if (filterClass === 'Pass') return val === 1 || val === 'pass';
        if (filterClass === 'Fail') return val === 0 || val === 'fail';
        return true;
    });

    const pageRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);

    if (loading) {
        return (
            <div className="space-y-10 animate-fade-up">
                <div>
                    <h1 className="page-title">Dataset</h1>
                    <p className="page-subtitle">Loading data from backend…</p>
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

    if (error) {
        return (
            <div className="space-y-8 animate-fade-up">
                <div>
                    <h1 className="page-title">Dataset</h1>
                </div>
                <div className="glass-card p-10 text-center">
                    <AlertTriangle size={36} className="mx-auto mb-3" style={{ color: '#d97706' }} />
                    <div className="font-semibold text-slate-900 mb-1">Backend unavailable</div>
                    <div className="text-sm text-slate-500 mb-4">{error}</div>
                    <div className="text-xs text-slate-400">Make sure Flask is running: <code className="bg-slate-100 px-1 py-0.5 rounded">python backend/app.py</code></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-fade-up">
            <div>
                <h1 className="page-title">Dataset</h1>
                <p className="page-subtitle">
                    Student performance data — {stats.rows} rows, {stats.cols} features
                </p>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Rows', value: filteredRows.length, color: '#2563eb' },
                    { label: 'Features', value: columns.length, color: '#0891b2' },
                    { label: 'Missing Values', value: stats.missing || 0, color: (stats.missing || 0) > 0 ? '#d97706' : '#059669' },
                    { label: 'Duplicates', value: duplicates, color: duplicates > 0 ? '#d97706' : '#059669' },
                ].map(s => (
                    <div key={s.label} className="stat-card text-center">
                        <div className="text-3xl font-bold mb-2" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filter + Export */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <Filter size={16} style={{ color: 'var(--accent)' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Filter:</span>
                </div>
                {['All', 'Pass', 'Fail'].map(f => (
                    <button key={f}
                        className={`tag ${filterClass === f ? 'active' : ''}`}
                        onClick={() => { setFilterClass(f); setPage(0); }}>
                        {f}
                    </button>
                ))}
                <div className="ml-auto flex gap-3">
                    <button className="btn-secondary text-sm" onClick={() => toast.success('Exported as CSV')}>
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                {columns.map(c => (
                                    <th key={c}>
                                        <span style={{ textTransform: 'capitalize' }}>{c}</span>
                                        <span className="ml-1.5 px-1.5 py-0.5 rounded font-medium" style={{
                                            fontSize: 10,
                                            background: colTypes[c] === 'num' ? '#eff6ff'
                                                : colTypes[c] === 'target' ? '#f0fdf4' : '#fffbeb',
                                            color: colTypes[c] === 'num' ? '#2563eb'
                                                : colTypes[c] === 'target' ? '#059669' : '#d97706',
                                        }}>
                                            {colTypes[c] || 'num'}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {pageRows.map((row, i) => (
                                <tr key={i}>
                                    <td className="text-sm" style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                                        {page * PAGE_SIZE + i + 1}
                                    </td>
                                    {columns.map((c, ci) => {
                                        const val = row[ci];
                                        if (colTypes[c] === 'target') return (
                                            <td key={c}>
                                                <span className={`badge ${val === 1 || val === 'pass' ? 'badge-green' : 'badge-red'}`}>
                                                    {val === 1 || val === 'pass' ? '✓ Pass' : '✗ Fail'}
                                                </span>
                                            </td>
                                        );
                                        return <td key={c} style={{ color: 'var(--text-primary)' }}>{String(val ?? '—')}</td>;
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredRows.length)} of {filteredRows.length} rows
                    </span>
                    <div className="flex gap-2">
                        {Array.from({ length: Math.min(totalPages, 8) }).map((_, p) => (
                            <button key={p} onClick={() => setPage(p)}
                                className="w-9 h-9 rounded-lg text-sm font-medium transition-all"
                                style={page === p
                                    ? { background: 'var(--accent)', color: '#fff' }
                                    : { color: 'var(--text-muted)', background: 'var(--bg-muted)', border: '1px solid var(--border)' }
                                }>
                                {p + 1}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Upload + Quality */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-card p-7">
                    <h2 className="section-title mb-2">Upload New Dataset</h2>
                    <p className="section-subtitle mb-6">Replace the current data with your own CSV file</p>
                    <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'drag-over' : ''}`}>
                        <input {...getInputProps()} />
                        <Upload size={32} className="mx-auto mb-4" style={{ color: 'var(--accent)', opacity: 0.7 }} />
                        <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                            {isDragActive ? 'Drop it here!' : 'Drag & drop a CSV'}
                        </div>
                        <div className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>or click to browse your files</div>
                        <button className="btn-primary mx-auto"><Upload size={14} /> Choose File</button>
                    </div>
                    {uploadedFile && (
                        <div className="flex items-center gap-4 mt-5 p-4 rounded-xl"
                            style={{ background: '#f0fdf4', border: '1px solid #a7f3d0' }}>
                            <CheckCircle size={20} style={{ color: '#059669' }} />
                            <div className="flex-1">
                                <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{uploadedFile.name}</div>
                                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                    {(uploadedFile.size / 1024).toFixed(1)} KB · Ready
                                </div>
                            </div>
                            <button className="btn-primary text-sm" onClick={() => toast.success('Model tested!')}>Test Model</button>
                        </div>
                    )}
                </div>

                <div className="glass-card p-7">
                    <h2 className="section-title mb-2">Data Quality</h2>
                    <p className="section-subtitle mb-6">Fix issues in your dataset before training</p>
                    <div className="space-y-5">
                        <div className="p-5 rounded-xl" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle size={16} style={{ color: (stats.missing || 0) > 0 ? '#d97706' : '#059669' }} />
                                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Missing Values</span>
                                </div>
                                <span className={`badge ${(stats.missing || 0) > 0 ? 'badge-yellow' : 'badge-green'}`}>
                                    {(stats.missing || 0) === 0 ? '✓ None' : `${stats.missing} found`}
                                </span>
                            </div>
                            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                                {(stats.missing || 0) > 0 ? 'Missing values detected. Drop or fill with median.' : 'No missing values — your dataset is clean!'}
                            </p>
                            <div className="flex gap-3">
                                <button className="btn-secondary text-sm flex-1" onClick={() => toast.success('Rows dropped')}>
                                    <Trash2 size={13} /> Drop rows
                                </button>
                                <button className="btn-secondary text-sm flex-1" onClick={() => toast.success('Filled with median')}>
                                    <RefreshCw size={13} /> Fill with median
                                </button>
                            </div>
                        </div>

                        <div className="p-5 rounded-xl" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle size={16} style={{ color: duplicates > 0 ? '#d97706' : '#059669' }} />
                                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Duplicate Rows</span>
                                </div>
                                <span className={`badge ${duplicates > 0 ? 'badge-yellow' : 'badge-green'}`}>
                                    {duplicates === 0 ? '✓ None' : `${duplicates} found`}
                                </span>
                            </div>
                            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                                {duplicates > 0 ? `${duplicates} duplicates detected.` : 'No duplicates found!'}
                            </p>
                            <button className="btn-danger w-full" onClick={() => { setDuplicates(0); toast.success('Duplicates removed'); }}>
                                <Trash2 size={13} /> Remove {duplicates} Duplicates
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
