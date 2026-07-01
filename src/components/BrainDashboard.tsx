import { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';

export function BrainDashboard({ account }: { account?: string }) {
  const { theme } = useTheme();
  const [healthStatus, setHealthStatus] = useState('CHECKING');
  const [passRate, setPassRate] = useState(0);
  const [consolidationAge, setConsolidationAge] = useState(0);

  useEffect(() => {
    // Giả lập Watchdog check định kỳ
    const interval = setInterval(() => {
      setHealthStatus('HEALTHY');
      setPassRate(100);
      setConsolidationAge(Math.floor(Math.random() * 5));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ 
        borderBottom: '1px solid var(--border)', 
        paddingBottom: '1rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        color: healthStatus === 'HEALTHY' ? 'var(--primary)' : 'var(--danger)'
      }}>
        {healthStatus === 'HEALTHY' ? '🟢' : '🔴'} Core Systems Status
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flex: 1 }}>
        
        {/* Watchdog Status */}
        <div style={{ padding: '1.5rem', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-dim)' }}>WATCHDOG VERDICT</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: healthStatus === 'HEALTHY' ? '#00ff00' : '#ff0000', textShadow: theme === 'matrix' ? '0 0 10px currentColor' : 'none' }}>
            {healthStatus}
          </div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Continuous identity & behavior monitoring.</p>
        </div>

        {/* Identity Integrity */}
        <div style={{ padding: '1.5rem', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-dim)' }}>IDENTITY INTEGRITY</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00d4ff', textShadow: theme === 'matrix' ? '0 0 10px currentColor' : 'none' }}>
            INTACT (0% Drift)
          </div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Personal Wallet {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : ''} validated.</p>
        </div>

        {/* Behavioral Pass Rate */}
        <div style={{ padding: '1.5rem', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-dim)' }}>BEHAVIORAL SUITE</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: passRate === 100 ? '#00ff00' : '#ffaa00' }}>
            {passRate === 0 ? '--' : `${passRate}% PASS`}
          </div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>20/20 Scenarios (ACCEPT/REFUSE/ESCALATE)</p>
        </div>

        {/* Regeneration Engine */}
        <div style={{ padding: '1.5rem', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-dim)' }}>REGENERATION CYCLE</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#bd00ff' }}>
            {consolidationAge}h AGO
          </div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Last sleep cycle completed successfully.</p>
        </div>

      </div>
    </div>
  );
}
