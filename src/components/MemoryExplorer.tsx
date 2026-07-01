import { useState } from 'react';
import { useTheme } from '../lib/theme';

import type { MemoryItem } from '../types';

export function MemoryExplorer({ 
  account, 
  memories, 
  setMemories 
}: { 
  account?: string, 
  memories: MemoryItem[], 
  setMemories: React.Dispatch<React.SetStateAction<MemoryItem[]>> 
}) {
  const { theme } = useTheme();
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const handleDecay = () => {
    setMemories(prev => prev.map(mem => {
      if (mem.ns !== 'NS_BRAIN_episodic' || !mem.importance) return mem;
      const newImportance = Math.max(0, mem.importance - 20);
      let newTier = mem.tier;
      if (newImportance < 30) newTier = 'archived';
      else if (newImportance < 50) newTier = 'cold';
      else if (newImportance < 80) newTier = 'warm';
      return { ...mem, importance: newImportance, tier: newTier };
    }));
  };

  const filteredMemories = memories.filter(m => {
    if (filter !== 'ALL' && m.ns !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return m.concept.toLowerCase().includes(query) || m.actor?.toLowerCase().includes(query);
    }
    return true;
  });

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <h2>Memory Vault Explorer {account ? `(${account.slice(0, 6)}...${account.slice(-4)})` : ''}</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['ALL', 'NS_BRAIN_identity', 'NS_BRAIN_episodic', 'NS_BRAIN_semantic', 'NS_BRAIN_procedural'].map(f => (
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
        <input 
          type="text" 
          placeholder="Recall API: Search by actor, event, or concept..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            fontFamily: 'monospace'
          }}
        />
        <button 
          className="btn btn--secondary" 
          onClick={handleDecay}
          title="Simulate time passing to decay episodic memories"
        >
          ⏳ Run Decay Cycle
        </button>
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
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                {mem.ns} • {mem.tier.toUpperCase()} TIER 
                {mem.timestamp && ` • ${new Date(mem.timestamp).toLocaleTimeString()}`}
                {mem.actor && ` • Actor: ${mem.actor}`}
              </div>
              <div style={{ fontWeight: 'bold' }}>{mem.concept}</div>
              {mem.importance !== undefined && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                  Importance: {mem.importance}/100 
                  <div style={{ width: '100px', height: '4px', background: '#333', marginTop: '2px', borderRadius: '2px' }}>
                    <div style={{ width: `${mem.importance}%`, height: '100%', background: mem.importance > 50 ? '#00d4ff' : '#555', borderRadius: '2px' }} />
                  </div>
                </div>
              )}
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
