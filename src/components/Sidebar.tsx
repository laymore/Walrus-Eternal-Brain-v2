import React from 'react';
import { MessageSquare, Newspaper, Trophy, MessageCircle, Shield } from 'lucide-react';
import { useCurrentAccount } from '../lib/dappKitMock';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  { id: 'NS_01', icon: MessageCircle, label: 'Public Chat' },
  { id: 'NS_02_NEWS', icon: Newspaper, label: '📰 News & Updates' },
  { id: 'NS_02_FORUM', icon: MessageSquare, label: '💬 Forum Discussions' },
  { id: 'NS_19_X', icon: () => React.createElement('span', { style: { fontSize: '1rem' } }, '𝗓'), label: '𝗓 Sui Community' },
  { id: 'NS_04_EVENTS', icon: Trophy, label: '🏆 Game Events' },
] as const;

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const account = useCurrentAccount();

  return (
    <nav className="matrix-panel" style={{
      width: '17rem',
      padding: '0.73rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.23rem',
      flexShrink: 0,
    }}>
      <div style={{
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        padding: '0.33rem 0.5rem 0.5rem',
        borderBottom: '1px solid var(--border)',
        marginBottom: '0.33rem',
      }}>
        Channels
      </div>

      {navItems.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          className={`sidebar-btn${activeTab === id ? ' sidebar-btn--active' : ''}`}
          onClick={() => setActiveTab(id)}
        >
          <Icon size={15} />
          {label}
        </button>
      ))}

      {/* Moderation & Jammer — visible to all connected users (admin gets extra features inside) */}
      {account && (
        <button
          className={`sidebar-btn${activeTab === 'NS_07' ? ' sidebar-btn--active' : ''}`}
          onClick={() => setActiveTab('NS_07')}
        >
          <Shield size={15} />
          Moderation
        </button>
      )}

      <div style={{
        marginTop: 'auto',
        fontSize: '0.65rem',
        color: 'var(--text-dim)',
        padding: '0.67rem 0.5rem',
        borderTop: '1px solid var(--border)',
        textAlign: 'center',
        letterSpacing: '0.1em',
        lineHeight: 2,
      }}>
        <div>{'>'} chats.wal.app</div>
        <div>{'>'} Walrus Memory</div>
      </div>
    </nav>
  );
};
