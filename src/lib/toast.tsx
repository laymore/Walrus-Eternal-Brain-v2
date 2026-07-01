import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type ToastKind = 'info' | 'error' | 'success';
type Toast = { id: number; kind: ToastKind; text: string };

const ToastCtx = createContext<(kind: ToastKind, text: string) => void>(() => {});

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, text: string) => {
    const id = ++counter;
    setToasts(t => [...t, { id, kind, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div style={{
        position: 'fixed', bottom: '1rem', right: '1rem', display: 'flex',
        flexDirection: 'column', gap: '0.5rem', zIndex: 9999, maxWidth: '420px',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: '0.75rem 1rem',
            background: 'rgba(0,0,0,0.92)',
            border: `1px solid ${t.kind === 'error' ? '#ef4444' : t.kind === 'success' ? 'var(--text-primary)' : 'var(--border-matrix-dim)'}`,
            borderLeft: `4px solid ${t.kind === 'error' ? '#ef4444' : t.kind === 'success' ? 'var(--text-primary)' : 'var(--text-secondary)'}`,
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            fontFamily: 'inherit',
          }}>
            <strong style={{ textTransform: 'uppercase', marginRight: '0.5rem' }}>
              [{t.kind.toUpperCase()}]
            </strong>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

// Global notifier so non-React modules (lib/memwal.ts) can push toasts
let globalNotifier: ((kind: ToastKind, text: string) => void) | null = null;
export function setGlobalNotifier(fn: (kind: ToastKind, text: string) => void) {
  globalNotifier = fn;
}
export function notify(kind: ToastKind, text: string) {
  if (globalNotifier) globalNotifier(kind, text);
  else if (kind === 'error') console.error(text);
  else console.log(`[${kind}] ${text}`);
}

export function NotifierBinder() {
  const push = useToast();
  useEffect(() => { setGlobalNotifier(push); }, [push]);
  return null;
}
