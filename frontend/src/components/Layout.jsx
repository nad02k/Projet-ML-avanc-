import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Brain, Settings, Database,
    BarChart3, FlaskConical, Zap, ChevronLeft,
    ChevronRight, Menu, GraduationCap, Sun, Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const NAV_ITEMS = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/models', icon: Brain, label: 'Models' },
    { to: '/config', icon: Settings, label: 'Configuration' },
    { to: '/data', icon: Database, label: 'Data' },
    { to: '/visualize', icon: BarChart3, label: 'Visualizations' },
    { to: '/experiments', icon: FlaskConical, label: 'Experiments' },
    { to: '/automl', icon: Zap, label: 'AutoML' },
];

export default function Layout({ children }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { dark, toggle } = useTheme();

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-root)' }}>
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
                <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
                    {!collapsed && (
                        <div className="px-3 mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                            Navigation
                        </div>
                    )}
                    {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            className={({ isActive }) =>
                                `sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`
                            }
                            title={collapsed ? label : undefined}
                            onClick={() => setMobileOpen(false)}
                        >
                            <Icon size={18} className="flex-shrink-0" />
                            {!collapsed && <span>{label}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                {!collapsed && (
                    <div className="px-5 py-5" style={{ borderTop: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>student-clean.csv</span>
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>v1.4 · 649 samples</div>
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
                        {/* Dark mode toggle */}
                        <button
                            onClick={toggle}
                            className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg transition-all"
                            style={{
                                background: 'var(--bg-muted)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-secondary)',
                            }}
                            title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {dark ? <Sun size={14} /> : <Moon size={14} />}
                            {dark ? 'Light' : 'Dark'}
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
