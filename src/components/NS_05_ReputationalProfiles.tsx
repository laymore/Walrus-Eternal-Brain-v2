import React, { useState, useEffect } from 'react';
import { useCurrentAccount } from '../lib/dappKitMock';
import {
  fetchPredictions,
  fetchEvents,
  computeReputation,
  type ReputationProfile,
} from '../lib/memwal';
import { Activity, BrainCircuit, Target, AlertTriangle } from 'lucide-react';
import { WalletIdentity } from './WalletIdentity';


export const NS_05_ReputationalProfiles: React.FC = () => {
  const currentAccount = useCurrentAccount();
  const [profiles, setProfiles] = useState<ReputationProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    // Derived entirely from signed predictions + admin-signed match winners.
    const preds = await fetchPredictions();
    const events = await fetchEvents();
    setProfiles(computeReputation(preds, events));
    setLoading(false);
  };

  const avgDrift = profiles.length
    ? (profiles.reduce((a, b) => a + b.driftScore, 0) / profiles.length).toFixed(2)
    : 'N/A';
  const resolvedProfiles = profiles.filter(p => p.resolved > 0);

  return (
    <div className="matrix-panel animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-matrix-dim)', paddingBottom: '0.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', textTransform: 'uppercase' }}>&gt; REPUTATIONAL_PROFILES (NS_05)</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0.35rem 0 0 0', fontSize: '0.8rem' }}>
            Derived on-chain · accuracy, calibration & bias drift from signed predictions
          </p>
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>DERIVED ORACLE</span>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 180px', padding: '1rem', border: '1px solid var(--border-matrix-dim)', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.5rem' }}><BrainCircuit size={14} style={{ display: 'inline' }} /> PROFILES</div>
          <div style={{ color: 'var(--text-primary)', fontSize: '2rem', fontWeight: 'bold' }}>{profiles.length}</div>
        </div>
        <div style={{ flex: '1 1 180px', padding: '1rem', border: '1px solid var(--border-matrix-dim)', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.5rem' }}><Target size={14} style={{ display: 'inline' }} /> WITH RESOLVED PICKS</div>
          <div style={{ color: 'var(--text-primary)', fontSize: '2rem', fontWeight: 'bold' }}>{resolvedProfiles.length}</div>
        </div>
        <div style={{ flex: '1 1 180px', padding: '1rem', border: '1px solid var(--border-matrix-dim)', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.5rem' }}><Activity size={14} style={{ display: 'inline' }} /> AVG BIAS DRIFT</div>
          <div style={{ color: 'var(--text-primary)', fontSize: '2rem', fontWeight: 'bold' }}>{avgDrift}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading && <p style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>// Computing reputation from on-chain ledger...</p>}
        {!loading && profiles.length === 0 && (
          <p style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>// No predictions on-chain yet — make picks in Prediction Ledger or World Cup 2026.</p>
        )}
        {profiles.map((p, i) => {
          const isMe = currentAccount && p.author === currentAccount.address;
          const overconfident = p.calibration > 0.2 && p.resolved >= 2;
          return (
            <div key={p.author} style={{
              border: '1px solid var(--border-matrix-dim)', padding: '1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
              background: isMe ? 'rgba(0,255,65,0.05)' : 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
                <span style={{ color: i < 3 ? '#ffd700' : 'var(--text-secondary)', fontWeight: 'bold', width: '2rem' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
                    <WalletIdentity address={p.author} />{isMe && <span style={{ color: 'var(--text-primary)', marginLeft: '0.5rem', fontSize: '0.7rem' }}>(YOU)</span>}
                  </div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                    {p.correct}/{p.resolved} correct · {p.total} total · last {new Date(p.lastActive).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>ACCURACY</div>
                  <div style={{ color: p.resolved === 0 ? 'var(--text-dim)' : (p.accuracy >= 0.5 ? '#4dff88' : '#ff6688'), fontWeight: 'bold' }}>
                    {p.resolved > 0 ? `${(p.accuracy * 100).toFixed(0)}%` : '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>DRIFT</div>
                  <div style={{ color: p.driftScore > 0.7 ? '#ff003c' : 'var(--text-primary)', fontWeight: 'bold' }}>
                    {p.driftScore.toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: '3.5rem' }}>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>REP</div>
                  <div style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '1.2rem' }}>{p.score}</div>
                </div>
                {overconfident && (
                  <div title="Overconfident: average confidence far exceeds accuracy" style={{ padding: '0.4rem', background: 'rgba(255,0,60,0.1)', border: '1px solid #ff003c', color: '#ff003c', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.35rem', maxWidth: '180px' }}>
                    <AlertTriangle size={13} /> OVERCONFIDENT
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
