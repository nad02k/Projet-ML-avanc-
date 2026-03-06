import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { MOCK_DATASET } from '../data/constants';
import {
    Upload, Filter, Trash2, RefreshCw,
    Download, CheckCircle, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const COLUMN_TYPES = {
    school: 'cat', sex: 'cat', age: 'num', address: 'cat',
    famsize: 'cat', G1: 'num', G2: 'num', G3: 'num', pass: 'target',
};

const PAGE_SIZE = 10;

export default function Data() {
    const [page, setPage] = useState(0);
    const [filterClass, setFilterClass] = useState('All');
    const [missings] = useState(0);
    const [duplicates, setDuplicates] = useState(2);
    const [uploadedFile, setUploadedFile] = useState(null);

    const onDrop = useCallback(files => {
        const file = files[0];
        if (file) {
            setUploadedFile(file);
            toast.success(`Uploaded: ${file.name}`);
        }
    }, []);
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop, accept: { 'text/csv': ['.csv'] }, multiple: false
    });

    const filteredRows = MOCK_DATASET.rows.filter(row => {
        if (filterClass === 'Pass') return row[8] === 1;
        if (filterClass === 'Fail') return row[8] === 0;
        return true;
    });
    const pageRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);

    return (
        <div className="space-y-10 animate-fade-up">
            {/* Header */}
            <div>
                <h1 className="page-title">Dataset</h1>
                <p className="page-subtitle">Student performance data — 649 rows, 9 features</p>
            </div>

            {/* Top summary bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Rows', value: filteredRows.length, color: '#2563eb' },
                    { label: 'Features', value: MOCK_DATASET.columns.length, color: '#0891b2' },
                    { label: 'Missing Values', value: missings, color: missings > 0 ? '#d97706' : '#059669' },
                    { label: 'Duplicates', value: duplicates, color: duplicates > 0 ? '#d97706' : '#059669' },
                ].map(s => (
                    <div key={s.label} className="stat-card text-center">
                        <div className="text-3xl font-bold mb-2" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filter + Export row */}
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
                                {MOCK_DATASET.columns.map(c => (
                                    <th key={c}>
                                        <span style={{ textTransform: 'capitalize' }}>{c}</span>
                                        <span className="ml-1.5 px-1.5 py-0.5 rounded font-medium" style={{
                                            fontSize: 10,
                                            background: COLUMN_TYPES[c] === 'num' ? '#eff6ff'
                                                : COLUMN_TYPES[c] === 'target' ? '#f0fdf4' : '#fffbeb',
                                            color: COLUMN_TYPES[c] === 'num' ? '#2563eb'
                                                : COLUMN_TYPES[c] === 'target' ? '#059669' : '#d97706',
                                        }}>
                                            {COLUMN_TYPES[c]}
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
                                    {MOCK_DATASET.columns.map((c, ci) => {
                                        const val = row[ci];
                                        if (c === 'pass') return (
                                            <td key={c}>
                                                <span className={`badge ${val === 1 ? 'badge-green' : 'badge-red'}`}>
                                                    {val === 1 ? '✓ Pass' : '✗ Fail'}
                                                </span>
                                            </td>
                                        );
                                        return <td key={c} style={{ color: 'var(--text-primary)' }}>{val}</td>;
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
                        {Array.from({ length: totalPages }).map((_, p) => (
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

            {/* Bottom actions: Upload + Clean side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Upload */}
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
                        <button className="btn-primary mx-auto">
                            <Upload size={14} /> Choose File
                        </button>
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
                            <button className="btn-primary text-sm" onClick={() => toast.success('Model tested!')}>
                                Test Model
                            </button>
                        </div>
                    )}
                </div>

                {/* Data Quality */}
                <div className="glass-card p-7">
                    <h2 className="section-title mb-2">Data Quality</h2>
                    <p className="section-subtitle mb-6">Fix issues in your dataset before training</p>

                    <div className="space-y-5">
                        {/* Missing values */}
                        <div className="p-5 rounded-xl" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle size={16} style={{ color: missings > 0 ? '#d97706' : '#059669' }} />
                                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Missing Values</span>
                                </div>
                                <span className={`badge ${missings > 0 ? 'badge-yellow' : 'badge-green'}`}>
                                    {missings === 0 ? '✓ None' : `${missings} found`}
                                </span>
                            </div>
                            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                                {missings > 0 ? 'Missing values detected. Drop those rows or fill them with median/mean values.' : 'No missing values — your dataset is clean!'}
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

                        {/* Duplicates */}
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
                                {duplicates > 0 ? `${duplicates} duplicate rows detected. Remove them to avoid bias in your model.` : 'No duplicates found!'}
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
