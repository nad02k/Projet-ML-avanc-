import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Brain, Settings, Database,
    BarChart3, FlaskConical, Zap, ChevronLeft,
    ChevronRight, Menu, GraduationCap, Sun, Moon,
    Eye, Package, Activity, GitBranch
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const NAV_ITEMS = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/automl', icon: Zap, label: 'AutoML' },
    { to: '/experiments', icon: FlaskConical, label: 'Experiments' },
    { to: '/registry', icon: Package, label: 'Registry' },
    { to: '/monitoring', icon: Activity, label: 'Drift' },
    { to: '/cicd', icon: GitBranch, label: 'CI/CD Gate' },
    { to: '/models', icon: Brain, label: 'Model Hub' },
    { to: '/config', icon: Settings, label: 'Train Models' },
    { to: '/predict', icon: Eye, label: 'Test Model' },
    { to: '/data', icon: Database, label: 'Dataset' },
    { to: '/visualize', icon: BarChart3, label: 'Insights' },
];

export default function Layout({ children }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { dark, toggle } = useTheme();

    return (
        <div className="flex h-screen overflow-hidden relative" style={{ background: 'var(--bg-root)' }}>
            {/* Ambient premium background glow blobs */}
            <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] bg-glow-indigo animate-blob-1 pointer-events-none z-0" />
            <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] bg-glow-cyan animate-blob-2 pointer-events-none z-0" />
            <div className="absolute top-[30%] left-[25%] w-[500px] h-[500px] bg-glow-rose animate-blob-3 pointer-events-none z-0" />

            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 z-20 bg-black/60" onClick={() => setMobileOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed md:relative z-30 h-full flex flex-col transition-all duration-300 ease-in-out
                ${collapsed ? 'w-16' : 'w-62'}
                ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `} style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}>

                {/* Logo */}
                <div style={{ borderBottom: '1px solid var(--border)' }} className="flex items-center gap-3 px-5 py-5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-600">
                        <GraduationCap size={17} color="white" />
                    </div>
                    {!collapsed && (
                        <div>
                            <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>ML Studio</div>
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Advanced Platform</div>
                        </div>
                    )}
                    <button
                        className="ml-auto hidden md:flex items-center justify-center w-7 h-7 rounded-md transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onClick={() => setCollapsed(!collapsed)}
                    >
                        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                    {!collapsed && (
                        <div className="px-3 mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted opacity-60">
                            Core Platform
                        </div>
                    )}
                    {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            className={({ isActive }) =>
                                `sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`
                            }
                            title={collapsed ? label : undefined}
                            onClick={() => setMobileOpen(false)}
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon size={19} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />
                                    {!collapsed && <span className="font-medium">{label}</span>}
                                </>
                            )}
                        </NavLink>
                    ))}
                    
                    {/* External Link Section */}
                    <div className="pt-8 mt-8 border-t border-border/40">
                        {!collapsed && (
                            <div className="px-3 mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted opacity-60">
                                External
                            </div>
                        )}
                        <a
                            href="http://localhost:5000"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`sidebar-item group ${collapsed ? 'justify-center px-0' : ''}`}
                            title="MLflow Dashboard — opens on port 5000"
                            onClick={e => {
                                // Try to open and show helpful message if blocked
                                const w = window.open('http://localhost:5000', '_blank');
                                if (!w) {
                                    e.preventDefault();
                                    alert('MLflow UI: open http://localhost:5000 manually.\nMake sure the backend is running (it auto-starts MLflow).');
                                }
                            }}
                        >
                            <FlaskConical size={19} className="flex-shrink-0 text-purple-500 group-hover:scale-110 transition-transform" />
                            {!collapsed && (
                                <div className="flex flex-col">
                                    <span className="font-medium text-text-primary">MLflow Dash</span>
                                    <span className="text-[10px] text-text-muted">localhost:5000</span>
                                </div>
                            )}
                        </a>
                    </div>
                </nav>

                {/* Footer */}
                {!collapsed && (
                    <div className="px-5 py-5" style={{ borderTop: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Active Dataset</span>
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Upload CSV → auto pipeline</div>
                    </div>
                )}
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top bar */}
                <header className="flex items-center justify-between px-8 py-4 flex-shrink-0"
                    style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
                    <button className="md:hidden" style={{ color: 'var(--text-muted)' }} onClick={() => setMobileOpen(true)}>
                        <Menu size={20} />
                    </button>

                    {/* Page breadcrumb placeholder (left) — spacer */}
                    <div className="flex-1" />

                    <div className="flex items-center gap-4">
                        {/* Modern Dark mode toggle */}
                        <button
                            onClick={toggle}
                            className="p-2.5 rounded-xl border border-border bg-bg-surface hover:bg-bg-muted transition-all shadow-sm group"
                            title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {dark ? 
                                <Sun size={18} className="text-amber-400 group-hover:rotate-45 transition-transform" /> : 
                                <Moon size={18} className="text-slate-600 group-hover:-rotate-12 transition-transform" />
                            }
                        </button>

                        <span className="badge badge-green text-xs">● Connected</span>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-blue-600 text-white">
                            ML
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-8 lg:p-10" style={{ background: 'var(--bg-root)' }}>
                    {children}
                </main>
            </div>
        </div>
    );
}
