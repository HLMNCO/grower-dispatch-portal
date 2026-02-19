import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('p2p-theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('p2p-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('p2p-theme', 'light');
    }
  }, [isDark]);

  return { isDark, toggle: () => setIsDark(d => !d) };
}
