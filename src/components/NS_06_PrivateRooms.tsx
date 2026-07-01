import React from 'react';
import { Lock, Construction } from 'lucide-react';

export const NS_06_PrivateRooms: React.FC = () => {
  return (
    <div className="matrix-panel animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '1rem' }}>
      <Lock size={64} style={{ color: 'var(--border-matrix-dim)' }} />
      <h2 style={{ color: 'var(--text-primary)', textTransform: 'uppercase', margin: 0 }}>&gt; PRIVATE_ROOMS (NS_06)</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', fontSize: '0.85rem' }}>
        <Construction size={14} /> WORK IN PROGRESS
      </div>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '460px', lineHeight: 1.6, fontSize: '0.9rem' }}>
        End-to-end encrypted rooms (per spec §1 NS_06–NS_20) require <code>@mysten/seal</code>
        key escrow + Move-based room registry. Not wired in this build.<br/><br/>
        Tracked items: Seal envelope encryption, room invite NFTs,
        decrypt-on-read via dapp-kit, member rotation.
      </p>
    </div>
  );
};
