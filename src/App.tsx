import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { BrainDashboard } from './components/BrainDashboard';
import { MemoryExplorer } from './components/MemoryExplorer';
import { StimulusTerminal } from './components/StimulusTerminal';
import { MiniForumSandbox } from './components/MiniForumSandbox';
import { ToastProvider, NotifierBinder } from './lib/toast';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { useTheme } from './lib/theme';
import { ThemeSelector } from './components/ThemeSelector';
import { WalletIdentity } from './components/WalletIdentity';

function AppShell() {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const { theme, setTheme } = useTheme();
  const account = useCurrentAccount();
  const [hasBrain, setHasBrain] = useState(false);
  const [isCreatingBrain, setIsCreatingBrain] = useState(false);

  // Reset brain state if account changes
  useEffect(() => {
    if (!account) setHasBrain(false);
  }, [account]);

  const handleCreateBrain = () => {
    setIsCreatingBrain(true);
    setTimeout(() => {
      setHasBrain(true);
      setIsCreatingBrain(false);
    }, 2000);
  };

  const renderContent = () => {
    if (!account) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧠</div>
          <h2 style={{ marginBottom: '1rem', color: 'var(--text)' }}>Connect Wallet to Access Your Brain</h2>
          <p style={{ maxWidth: '400px', textAlign: 'center', marginBottom: '2rem' }}>
            The Eternal Agent Brain requires a Web3 Wallet to establish your secure identity and load your MemWal namespaces.
          </p>
          <ConnectButton className="btn btn--primary" />
        </div>
      );
    }

    if (!hasBrain) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧬</div>
          <h2 style={{ marginBottom: '1rem', color: 'var(--text)' }}>No Personal Brain Found</h2>
          <p style={{ maxWidth: '400px', textAlign: 'center', marginBottom: '2rem' }}>
            Wallet <strong>{account.address.slice(0, 6)}...{account.address.slice(-4)}</strong> does not have an initialized MemWal Brain. Create one to begin.
          </p>
          <button 
            className="btn btn--primary" 
            onClick={handleCreateBrain}
            disabled={isCreatingBrain}
          >
            {isCreatingBrain ? 'Initializing Namespaces...' : 'Create Personal Brain'}
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'DASHBOARD': return <BrainDashboard account={account.address} />;
      case 'VAULT': return <MemoryExplorer account={account.address} />;
      case 'TERMINAL': return <StimulusTerminal account={account.address} />;
      case 'SANDBOX': return <MiniForumSandbox />;
      default: return <BrainDashboard account={account.address} />;
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
        {account && hasBrain && <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />}
        <div style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: (!account || !hasBrain) ? 'var(--bg-elevated)' : 'transparent',
          borderRadius: (!account || !hasBrain) ? '8px' : '0',
          border: (!account || !hasBrain) ? '1px solid var(--border)' : 'none',
        }}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <NotifierBinder />
      <AppShell />
    </ToastProvider>
  );
}

export default App;
