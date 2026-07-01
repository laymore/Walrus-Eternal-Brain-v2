import { Paintbrush } from 'lucide-react';
import type { Theme } from '../lib/theme';
import { useState, useRef, useEffect } from 'react';

interface ThemeSelectorProps {
  currentTheme: Theme;
  onSelectTheme: (theme: Theme) => void;
}

const THEMES: { id: Theme; label: string }[] = [
  { id: 'autobots', label: 'Robot' },
  { id: 'matrix', label: 'Matrix CRT' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'dracula', label: 'Dracula Dark' },
  { id: 'light', label: 'Clean Light' },
];

export function ThemeSelector({ currentTheme, onSelectTheme }: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button 
        className="btn btn--secondary" 
        style={{ padding: '0.4rem 0.8rem', minWidth: 'auto', gap: '0.5rem' }}
        onClick={() => setIsOpen(!isOpen)}
        title="Change Theme"
      >
        <Paintbrush size={16} />
        <span style={{ fontSize: '0.75rem', display: 'none' }} className="theme-label">
          Theme
        </span>
      </button>

      {isOpen && (
        <div className="matrix-panel" style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '0.5rem',
          minWidth: '160px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                onSelectTheme(theme.id);
                setIsOpen(false);
              }}
              style={{
                background: currentTheme === theme.id ? 'var(--green-subtle)' : 'transparent',
                color: currentTheme === theme.id ? 'var(--text-bright)' : 'var(--text)',
                border: 'none',
                borderLeft: currentTheme === theme.id ? '3px solid var(--green)' : '3px solid transparent',
                padding: '0.75rem 1rem',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (currentTheme !== theme.id) e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                if (currentTheme !== theme.id) e.currentTarget.style.background = 'transparent';
              }}
            >
              {theme.label}
            </button>
          ))}
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @media (min-width: 768px) {
          .theme-label { display: inline !important; }
        }
      `}} />
    </div>
  );
}
