import { useState, useEffect } from 'react';

export type Theme = 'autobots' | 'matrix' | 'cyberpunk' | 'dracula' | 'light';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('walrus_forum_theme') as Theme;
    return savedTheme || 'matrix';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('walrus_forum_theme', theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return { theme, setTheme };
}
