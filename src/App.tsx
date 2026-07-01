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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 2rem', height: '100%', color: 'var(--text-dim)', background: '#000' }}>
          <h1 style={{ color: 'var(--text)', marginBottom: '0.5rem', fontSize: '2.5rem', alignSelf: 'flex-start', maxWidth: '800px', width: '100%', margin: '0 auto' }}>Welcome to your Dashboard</h1>
          <p style={{ marginBottom: '2rem', alignSelf: 'flex-start', maxWidth: '800px', width: '100%', margin: '0 auto 2rem auto' }}>Manage your Walrus Memory account and delegate keys</p>
          
          <div style={{ 
            background: '#e9f85c', 
            color: '#000', 
            padding: '1rem', 
            borderRadius: '4px', 
            width: '100%', 
            maxWidth: '800px', 
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <span style={{ fontWeight: 500 }}>No Walrus Memory account found for this wallet. Create a delegate key to get started.</span>
          </div>

          <button 
            style={{
              background: '#111',
              border: '1px solid #222',
              borderRadius: '8px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '800px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: isCreatingBrain ? 'wait' : 'pointer',
              color: 'var(--text)',
              textAlign: 'left',
              transition: 'background 0.2s',
            }}
            onClick={handleCreateBrain}
            disabled={isCreatingBrain}
            onMouseOver={(e) => e.currentTarget.style.background = '#1a1a1a'}
            onMouseOut={(e) => e.currentTarget.style.background = '#111'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ 
                border: '1px solid #333', 
                borderRadius: '50%', 
                width: '40px', 
                height: '40px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                🗝️
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Create a delegate key</div>
                <div style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  {isCreatingBrain ? 'Generating and registering a new SDK key...' : 'Generate and register a new SDK key'}
                </div>
              </div>
            </div>
            <span style={{ fontSize: '1.5rem', color: '#666' }}>→</span>
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
