import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { NS_01_LobbyChat } from './components/NS_01_LobbyChat';
import { NS_02_NewsFeed } from './components/NS_02_NewsFeed';
import { NS_02_ForumPosts } from './components/NS_02_ForumPosts';
import { NS_19_XTimeline } from './components/NS_19_XTimeline';
import { NS_04_GameEvents } from './components/NS_04_GameEvents';
import { NS_07_Moderation } from './components/NS_07_Moderation';
import { ToastProvider, NotifierBinder } from './lib/toast';
import { ConnectButton } from '@mysten/dapp-kit';
import { useTheme } from './lib/theme';
import { ThemeSelector } from './components/ThemeSelector';

function AppShell() {
  const [activeTab, setActiveTab] = useState('NS_02_NEWS');
  const { theme, setTheme } = useTheme();

  const renderContent = () => {
    switch (activeTab) {
      case 'NS_01': return <NS_01_LobbyChat />;
      case 'NS_02_NEWS': return <NS_02_NewsFeed />;
      case 'NS_02_FORUM': return <NS_02_ForumPosts />;
      case 'NS_19_X': return <NS_19_XTimeline />;
      case 'NS_04_EVENTS': return <NS_04_GameEvents />;
      case 'NS_07': return <NS_07_Moderation />;
      default: return <NS_02_NewsFeed />;
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
            <img src="/favicon.svg" width={44} height={44} alt="Mini Forum" />
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
              {'>'} Mini Forum
            </div>
            <div style={{
              fontSize: '0.8rem',
              color: 'var(--text-dim)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              {'>'} by Team Autobots
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <ThemeSelector currentTheme={theme} onSelectTheme={setTheme} />
          <ConnectButton className="btn btn--secondary" />
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <main style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '0 1.65rem 1.65rem 1.65rem', gap: '1.1rem' }}>
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
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
