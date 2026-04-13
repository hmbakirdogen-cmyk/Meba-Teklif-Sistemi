import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { THEME_STORAGE_KEY, ThemeContext, type Tema } from './themeContextStore';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      const t: Tema = saved === 'dark' ? 'dark' : 'light';
      // Apply immediately in the initializer to prevent flash-of-light-mode
      document.documentElement.setAttribute('data-theme', t);
      return t;
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem(THEME_STORAGE_KEY, tema);
  }, [tema]);

  const temaToggle = () => setTema((t) => (t === 'light' ? 'dark' : 'light'));
  const value = useMemo(
    () => ({ tema, temaToggle, isDark: tema === 'dark' }),
    [tema],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
