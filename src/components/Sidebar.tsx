

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const tabs = [
    { id: 'BRAIN', label: 'Brain', icon: '🪪' },
    { id: 'LIBRARY', label: 'Neuron Library', icon: '🧠' },
  ];

  return (
    <aside style={{
      width: '260px',
      background: 'var(--bg-elevated)',
      borderRadius: '8px',
      padding: '1.1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      flexShrink: 0,
      border: '1px solid var(--border)',
    }}>
      <div style={{
        fontSize: '0.8rem',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--text-dim)',
        marginBottom: '0.5rem',
        paddingLeft: '0.5rem'
      }}>
        Brain Management
      </div>
      
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
            color: activeTab === tab.id ? '#000' : 'var(--text)',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            textAlign: 'left',
            fontWeight: activeTab === tab.id ? 'bold' : 'normal',
            transition: 'all 0.2s ease'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}

      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center' }}>
          Eternal Agent Brain v1.1
        </div>
      </div>
    </aside>
  );
}
