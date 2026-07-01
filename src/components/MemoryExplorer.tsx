import { useState } from 'react';
import { useTheme } from '../lib/theme';

const MOCK_MEMORIES = [
  { id: 'cell_178', ns: 'NS_BRAIN_identity', concept: 'Dev Wallet', tier: 'hot', confidence: 1.0, type: 'TRUST' },
  { id: 'cell_179', ns: 'NS_BRAIN_semantic', concept: 'Eternal Architecture', tier: 'warm', confidence: 0.9, type: 'TRUST' },
  { id: 'cell_180', ns: 'NS_BRAIN_procedural', concept: 'UI Build Protocol', tier: 'cold', confidence: 0.7, type: 'VERIFY' },
  { id: 'cell_181', ns: 'NS_BRAIN_episodic', concept: 'Crash Error Log', tier: 'hot', confidence: 0.95, type: 'TRUST' },
  { id: 'cell_182', ns: 'NS_BRAIN_semantic', concept: 'Unknown User Pref', tier: 'archived', confidence: 0.3, type: 'REFUSE' },
];

export function MemoryExplorer() {
  const { theme } = useTheme();
  const [filter, setFilter] = useState('ALL');

  const filteredMemories = filter === 'ALL' ? MOCK_MEMORIES : MOCK_MEMORIES.filter(m => m.ns === filter);

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <h2>Memory Vault Explorer</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['ALL', 'NS_BRAIN_identity', 'NS_BRAIN_semantic', 'NS_BRAIN_procedural'].map(f => (
            <button 
              key={f} 
              className={filter === f ? 'btn btn--primary' : 'btn btn--secondary'}
              onClick={() => setFilter(f)}
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
            >
              {f.replace('NS_BRAIN_', '')}
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
        {filteredMemories.map(mem => (
          <div key={mem.id} style={{ 
            padding: '1rem', 
            marginBottom: '0.75rem', 
            background: 'var(--bg-elevated)', 
            border: `1px solid ${mem.type === 'TRUST' ? '#00ff0055' : mem.type === 'VERIFY' ? '#ffaa0055' : '#ff000055'}`,
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>{mem.ns} • {mem.tier.toUpperCase()} TIER</div>
              <div style={{ fontWeight: 'bold' }}>{mem.concept}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ 
                color: mem.type === 'TRUST' ? '#00ff00' : mem.type === 'VERIFY' ? '#ffaa00' : '#ff0000',
                fontWeight: 'bold',
                textShadow: theme === 'matrix' ? '0 0 5px currentColor' : 'none'
              }}>
                {mem.type === 'TRUST' ? '🟢 TRUST' : mem.type === 'VERIFY' ? '🟡 VERIFY' : '🔴 REFUSE'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Conf: {mem.confidence.toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
