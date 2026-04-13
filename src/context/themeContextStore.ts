import { createContext } from 'react';

export type Tema = 'light' | 'dark';

export interface ThemeContextValue {
  tema: Tema;
  temaToggle: () => void;
  isDark: boolean;
}

export const THEME_STORAGE_KEY = 'meba_tema';

export const ThemeContext = createContext<ThemeContextValue>({
  tema: 'light',
  temaToggle: () => {},
  isDark: false,
});
