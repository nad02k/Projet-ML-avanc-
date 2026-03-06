import { useState } from 'react';
import { ALGORITHMS } from '../data/constants';
import {
    Search, Info, CheckCircle2, GitCompare,
    BookOpen, ChevronDown, ChevronUp, Star, HardDrive
} from 'lucide-react';

function AlgoCard({ algo, selected, comparing, onSelect, onCompare, onViewDocs }) {
    const [showDocs, setShowDocs] = useState(false);

    return (
        <div
            className={`glass-card p-6 lg:p-8 cursor-pointer transition-all duration-200 ${selected ? 'border-blue-500/50' : ''}`}
            style={selected ? { borderColor: '#3b82f6', background: '#eff6ff' } : {}}
        >
            {/* Card header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="text-2xl">{algo.icon}</div>
                    <div>
                        <div className="font-bold text-slate-900 text-sm">{algo.name}</div>
                        <span className={`badge ${algo.badge} mt-1`}>{algo.category}</span>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                    <button
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${selected ? 'bg-blue-100 border-blue-400' : 'border-slate-200 hover:border-blue-300'
                            }`}
                        onClick={() => onSelect(algo.id)}
                        title="Select model"
                    >
                        <CheckCircle2 size={14} style={{ color: selected ? '#3b82f6' : '#94a3b8' }} />
                    </button>
                    <button
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${comparing ? 'bg-cyan-50 border-cyan-400' : 'border-slate-200 hover:border-cyan-300'
                            }`}
                        onClick={() => onCompare(algo.id)}
                        title="Add to comparison"
                    >
                        <GitCompare size={13} style={{ color: comparing ? '#06b6d4' : '#94a3b8' }} />
                    </button>
                </div>
            </div>

            {/* Description */}
            <p className="text-xs leading-relaxed mb-3" style={{ color: '#475569' }}>
                {algo.description}
            </p>

            {/* Pros / Cons */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                    <div className="text-xs font-semibold mb-1" style={{ color: '#059669' }}>✓ Pros</div>
                    {algo.pros.map(p => (
                        <div key={p} className="text-xs mb-0.5" style={{ color: '#475569' }}>• {p}</div>
                    ))}
                </div>
                <div>
                    <div className="text-xs font-semibold mb-1" style={{ color: '#dc2626' }}>✗ Cons</div>
                    {algo.cons.map(c => (
                        <div key={c} className="text-xs mb-0.5" style={{ color: '#475569' }}>• {c}</div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-200 mt-4">
                <button
                    className="btn-secondary text-xs flex-1"
                    onClick={() => setShowDocs(!showDocs)}
                >
                    <BookOpen size={12} />
                    {showDocs ? 'Hide Docs' : 'Docs'}
                    {showDocs ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
                <button className="btn-primary text-xs flex-1" onClick={() => onSelect(algo.id)}>
                    {selected ? '✓ Selected' : 'Select'}
                </button>
            </div>

            {/* Extended docs */}
            {showDocs && (
                <div className="mt-4 p-4 rounded-lg text-xs leading-relaxed bg-slate-50 border border-slate-200" style={{ color: '#475569' }}>
                    <div className="font-semibold text-slate-900 mb-1.5">{algo.name} — Documentation</div>
                    <p>{algo.description}</p>
                    <div className="mt-3">
                        <span className="font-semibold" style={{ color: '#2563eb' }}>{algo.hyperparams.length} hyperparameters</span>
                        {' '}configurable in the Configuration tab.
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                        {algo.hyperparams.map(h => (
                            <span key={h.id} className="tag">{h.id}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Models({ selected, setSelected, comparing, setComparing }) {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    const categories = ['All', ...new Set(ALGORITHMS.map(a => a.category))];
    const filtered = ALGORITHMS.filter(a => {
        const matchCat = activeCategory === 'All' || a.category === activeCategory;
        const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
            a.short.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
    });

    const handleSelect = (id) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };
    const handleCompare = (id) => {
        setComparing(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    return (
        <div className="space-y-8 animate-fade-up">
            {/* Header */}
            <div className="section-header">
                <div>
                    <h1 className="page-title">Model Selection</h1>
                    <p className="page-subtitle">Choose one or more algorithms to train and compare</p>
                </div>
                <div className="flex items-center gap-2">
                    {selected.length > 0 && (
                        <span className="badge badge-green">
                            <CheckCircle2 size={11} /> {selected.length} selected
                        </span>
                    )}
                    {comparing.length > 0 && (
                        <span className="badge badge-cyan">
                            <GitCompare size={11} /> {comparing.length} comparing
                        </span>
                    )}
                </div>
            </div>

            {/* Training mode toggle */}
            <div className="glass-card p-6 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                    <HardDrive size={16} style={{ color: '#2563eb' }} />
                    <span className="text-sm font-semibold text-slate-900">Training Mode</span>
                </div>
                {['Train from scratch', 'Load pre-trained model'].map((mode, i) => (
                    <label key={i} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="train-mode" defaultChecked={i === 0}
                            className="accent-blue-600" />
                        <span className="text-sm font-medium text-slate-700">{mode}</span>
                    </label>
                ))}
                <div className="ml-auto text-xs" style={{ color: '#64748b' }}>
                    <Star size={12} className="inline mr-1 text-yellow-400" />
                    Pre-trained models available for RF, XGBoost & SVM
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-48">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} />
                    <input
                        type="text"
                        className="form-input pl-9"
                        placeholder="Search algorithms…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="tabs">
                    {categories.map(c => (
                        <button
                            key={c}
                            className={`tab-btn ${activeCategory === c ? 'active' : ''}`}
                            onClick={() => setActiveCategory(c)}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            {/* Algorithm grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                {filtered.map(algo => (
                    <AlgoCard
                        key={algo.id}
                        algo={algo}
                        selected={selected.includes(algo.id)}
                        comparing={comparing.includes(algo.id)}
                        onSelect={handleSelect}
                        onCompare={handleCompare}
                    />
                ))}
                {filtered.length === 0 && (
                    <div className="col-span-3 text-center py-16" style={{ color: '#475569' }}>
                        <Brain size={40} className="mx-auto mb-3 opacity-30" />
                        <div>No algorithms match your search.</div>
                    </div>
                )}
            </div>

            {/* Comparison panel */}
            {comparing.length > 1 && (
                <div className="glass-card p-6 lg:p-8 mt-12">
                    <div className="section-title mb-6">Side-by-Side Comparison</div>
                    <div className="scroll-x">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Property</th>
                                    {comparing.map(id => {
                                        const a = ALGORITHMS.find(x => x.id === id);
                                        return <th key={id}>{a?.icon} {a?.short}</th>;
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ['Category', a => a.category],
                                    ['Hyperparameters', a => a.hyperparams.length],
                                    ['Best for', a => a.pros[0]],
                                    ['Main weakness', a => a.cons[0]],
                                ].map(([label, fn]) => (
                                    <tr key={label}>
                                        <td className="font-medium" style={{ color: '#475569' }}>{label}</td>
                                        {comparing.map(id => {
                                            const a = ALGORITHMS.find(x => x.id === id);
                                            return <td key={id}>{a ? fn(a) : '—'}</td>;
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
