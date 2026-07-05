import React from 'react';
import { useCurrentAccount, ConnectButton } from '@mysten/dapp-kit';
import { useBrain } from '../contexts/BrainContext';

export function BrainManager({ children }: { children: React.ReactNode }) {
  const account = useCurrentAccount();
  const { brain, accountId, hasDeviceKey, isLoading, createBrain, authorizeDevice, error } = useBrain();

  if (!account) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem', textAlign: 'center' }}>
        <h2>🧠 Welcome to the Eternal Library</h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', maxWidth: '420px' }}>
          On-chain knowledge storage &amp; retrieval for agents. Connect your Sui wallet to browse the shelf — every finished project becomes a book so the next one never starts from scratch.
        </p>
        <ConnectButton />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>Synchronizing Brain State...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem' }}>
        <h2 style={{ color: '#ff4444' }}>⚠️ Initialization Error</h2>
        <p style={{ color: 'var(--text-dim)' }}>{error}</p>
        <button className="btn" style={{ marginTop: '1rem' }} onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  // State 1: No MemWal Account at all
  if (!accountId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem', textAlign: 'center' }}>
        <h2>🌱 Initialize Your Brain</h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', maxWidth: '400px' }}>
          It looks like you don't have a decentralized Agent Brain yet. 
          Initialize one now to start building your cognitive footprint on Walrus.
        </p>
        <button className="btn btn--primary" onClick={createBrain} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
          Initialize Brain (Approve Tx)
        </button>
      </div>
    );
  }

  // State 2: Account exists, but no delegate key in THIS browser
  if (!hasDeviceKey) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem', textAlign: 'center' }}>
        <h2>🔐 Authorize This Device</h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', maxWidth: '400px' }}>
          We found your Agent Brain! However, this browser/device hasn't been authorized to manage it yet.
        </p>
        <button className="btn btn--primary" onClick={authorizeDevice} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
          Authorize Device (Approve Tx)
        </button>
      </div>
    );
  }

  // State 3: Brain is ready
  if (brain) {
    return <>{children}</>;
  }

  return null;
}
