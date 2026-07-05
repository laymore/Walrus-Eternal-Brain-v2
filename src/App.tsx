import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ToastProvider, NotifierBinder } from './lib/toast';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { useTheme } from './lib/theme';
import { ThemeSelector } from './components/ThemeSelector';
import { WalletIdentity } from './components/WalletIdentity';
import { BrainView } from './components/BrainView';
import { LibraryView } from './components/LibraryView';
import { BrainProvider, useBrain } from './contexts/BrainContext';
import { BrainManager } from './components/BrainManager';

function AppShell() {
  const [activeTab, setActiveTab] = useState('BRAIN');
  const { theme, setTheme } = useTheme();
  const account = useCurrentAccount();
  const { brain } = useBrain();

  const renderContent = () => {
    switch (activeTab) {
      case 'BRAIN': return <BrainView />;
      case 'LIBRARY': return <LibraryView />;
      default: return <BrainView />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', animation: theme === 'matrix' ? 'flicker 8s infinite' : 'none' }}>
      {/* ── Terminal Header ─────────────────────────────────────────── */}
      <header className="matrix-panel" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
        padding: '1.1rem 2.2rem',
        margin: '1.1rem 1.65rem',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img src="/favicon.svg" width={44} height={44} alt="Agentic OS" />
          </div>
          <div>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              lineHeight: 1.2,
              fontFamily: theme === 'autobots' ? 'Orbitron, sans-serif' : 'inherit',
              textShadow: '0 0 10px rgba(0,212,255,0.4)',
            }}>
              {'>'} Agentic OS
            </div>
            <div style={{
              fontSize: '0.8rem',
              color: 'var(--text-dim)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              {'>'} Powered by Eternal Brain
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {account && <WalletIdentity address={account.address} />}
          <ThemeSelector currentTheme={theme} onSelectTheme={setTheme} />
          <ConnectButton className="btn btn--secondary" />
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <main style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '0 1.65rem 1.65rem 1.65rem', gap: '1.1rem' }}>
        {account && brain && <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />}
        <div style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: (!account || !brain) ? 'var(--bg-elevated)' : 'transparent',
          borderRadius: (!account || !brain) ? '8px' : '0',
          border: (!account || !brain) ? '1px solid var(--border)' : 'none',
        }}>
          <BrainManager>
            {renderContent()}
          </BrainManager>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <NotifierBinder />
      <BrainProvider>
        <AppShell />
      </BrainProvider>
    </ToastProvider>
  );
}

export default App;
