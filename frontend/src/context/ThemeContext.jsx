import { createContext, useContext, useState, useEffect } from 'react';

const ThemeCtx = createContext({ dark: false, toggle: () => { } });
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }) {
    const [dark, setDark] = useState(() => {
        try { return localStorage.getItem('ml_theme') === 'dark'; } catch { return false; }
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
        localStorage.setItem('ml_theme', dark ? 'dark' : 'light');
    }, [dark]);

    return (
        <ThemeCtx.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
            {children}
        </ThemeCtx.Provider>
    );
}
