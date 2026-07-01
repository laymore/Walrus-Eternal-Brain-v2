import React, { useState, useEffect } from 'react';
import { useCurrentAccount, useSignPersonalMessage } from '../lib/dappKitMock';
import {
  DEV_WALLET,
  fetchModerationEntries,
  publishModerationEntry,
  canonicalModerationMessage,
  type ModEntry,
} from '../lib/memwal';
import { verifyAuthor } from '../lib/verify';
import { useToast } from '../lib/toast';
import { Shield, Lock, EyeOff, Eye } from 'lucide-react';
import { WalletIdentity } from './WalletIdentity';

type EntryUI = ModEntry & { verified?: boolean };

export const NS_07_Moderation: React.FC = () => {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const toast = useToast();
  const [entries, setEntries] = useState<EntryUI[]>([]);
  const [targetBlobId, setTargetBlobId] = useState('');
  const [reason, setReason] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [jammerList, setJammerList] = useState<string[]>([]);
  const [newJammer, setNewJammer] = useState('');
  
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ZION_JAMMER');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setJammerList(parsed);
      }
    } catch { /* corrupted localStorage */ }
  }, []);

  const handleAddJammer = () => {
    const addr = newJammer.trim().toLowerCase();
    if (!addr) return;
    if (!addr.startsWith('0x') || addr.length < 10) return toast('error', 'Invalid wallet address (must start with 0x)');
    if (jammerList.some(j => j.toLowerCase() === addr)) return toast('info', 'Wallet already in Jammer list');
    const newList = [...jammerList, addr];
    setJammerList(newList);
    localStorage.setItem('ZION_JAMMER', JSON.stringify(newList));
    setNewJammer('');
    toast('success', 'Wallet added to Personal Jammer');
  };

  const isAdmin = !!DEV_WALLET && currentAccount?.address?.toLowerCase() === DEV_WALLET;

  useEffect(() => { load(); }, []);

  const load = async () => {
    const list = await fetchModerationEntries();
    setEntries(list.map(e => ({ ...e })));
    list.forEach(e => {
      const canonical = canonicalModerationMessage({
        targetBlobId: e.targetBlobId,
        action: e.type === 'MOD_HIDE' ? 'HIDE' : 'UNHIDE',
        timestamp: e.timestamp,
      });
      // Only signatures from DEV_WALLET count as authentic moderation
      verifyAuthor(canonical, e.signature, e.admin).then(ok => {
        const trustworthy = ok && e.admin.toLowerCase() === DEV_WALLET;
        setEntries(prev => prev.map(x => x.timestamp === e.timestamp && x.targetBlobId === e.targetBlobId
          ? { ...x, verified: trustworthy } : x));
      });
    });
  };

  const handleAction = async (action: 'HIDE' | 'UNHIDE') => {
    if (!isAdmin) return toast('error', 'Admin wallet required');
    const blob = targetBlobId.trim();
    if (!blob) return toast('error', 'Blob ID required');
    setIsPublishing(true);
    try {
      const timestamp = Date.now();
      const canonical = canonicalModerationMessage({ targetBlobId: blob, action, timestamp });
      const sigRes = await signPersonalMessage({ message: new TextEncoder().encode(canonical) });

      await publishModerationEntry({
        type: action === 'HIDE' ? 'MOD_HIDE' : 'MOD_UNHIDE',
        targetBlobId: blob,
        reason: reason.trim() || undefined,
        admin: currentAccount!.address,
        timestamp,
        signature: sigRes.signature,
      });
      toast('success', `${action} entry published for ${blob.slice(0, 12)}...`);
      setTargetBlobId('');
      setReason('');
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast('error', `Moderation failed: ${msg}`);
    }
    setIsPublishing(false);
  };

  if (!isAdmin && !currentAccount) {
    return (
      <div className="matrix-panel animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Lock size={64} style={{ color: 'var(--border-matrix-dim)', marginBottom: '1rem' }} />
        <h2 style={{ color: 'var(--text-primary)', textTransform: 'uppercase' }}>&gt; MODERATION & JAMMER (NS_07)</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '460px', lineHeight: 1.6 }}>
          // Connect wallet to access Personal Jammer.<br/>
          // Admin moderation restricted to dev wallet.<br/>
          // END OF LINE.
        </p>
      </div>
    );
  }

  return (
    <div className="matrix-panel animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <div style={{ borderBottom: '1px solid var(--border-matrix-dim)', paddingBottom: '0.5rem' }}>
        <h2 style={{ margin: 0, color: 'var(--text-primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={20} /> &gt; MODERATION & JAMMER (NS_07)
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
          Zion Sentinel Jammer (Decentralized Mute List) & Firewall.
        </p>
      </div>

      <div className="matrix-panel" style={{ padding: '1rem', background: 'var(--bg-matrix)' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', textTransform: 'uppercase' }}>&gt; PERSONAL_JAMMER (LOCAL MUTE LIST)</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>Blocks all messages from these wallets on your client only.</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input className="input-field" placeholder="WALLET_ADDRESS" value={newJammer} onChange={e => setNewJammer(e.target.value)} style={{ flex: 1 }} />
          <button className="btn-secondary" onClick={handleAddJammer}>BLOCK WALLET</button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {jammerList.map((j, idx) => (
             <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(255, 0, 60, 0.1)', border: '1px solid #ff003c', color: '#ff003c', fontSize: '0.85rem' }}>
                <span>{j}</span>
                <button onClick={() => {
                  const nl = jammerList.filter(x => x !== j);
                  setJammerList(nl);
                  localStorage.setItem('ZION_JAMMER', JSON.stringify(nl));
                }} style={{ background: 'none', border: 'none', color: '#ff003c', cursor: 'pointer', textDecoration: 'underline' }}>UNBLOCK</button>
             </div>
          ))}
        </div>
      </div>

      {isAdmin && (
        <>
          <div className="matrix-panel" style={{ padding: '1rem', background: 'var(--bg-matrix)' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', textTransform: 'uppercase' }}>&gt; GLOBAL_FIREWALL_ACTION (ADMIN)</h3>
            <input className="input-field" placeholder="TARGET_BLOB_ID" value={targetBlobId} onChange={e => setTargetBlobId(e.target.value)} style={{ marginBottom: '0.5rem' }} />
            <input className="input-field" placeholder="REASON (optional)" value={reason} onChange={e => setReason(e.target.value)} style={{ marginBottom: '0.75rem' }} />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => handleAction('UNHIDE')} disabled={isPublishing} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={14} /> UNHIDE
              </button>
              <button className="btn-primary" onClick={() => handleAction('HIDE')} disabled={isPublishing} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <EyeOff size={14} /> {isPublishing ? 'SIGNING...' : 'HIDE'}
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>&gt; GLOBAL_FIREWALL_LOG ({entries.length})</h3>
            {entries.length === 0 && <p style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>// No moderation entries yet...</p>}
            {entries
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((e, i) => (
                <div key={i} style={{
                  padding: '0.75rem', background: 'var(--bg-matrix)',
                  border: '1px solid var(--border-matrix-dim)',
                  borderLeft: `4px solid ${e.type === 'MOD_HIDE' ? '#ef4444' : '#22c55e'}`,
                  fontSize: '0.85rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                      [{e.type}] {e.targetBlobId.slice(0, 24)}...
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                      {new Date(e.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {e.reason && <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>↳ {e.reason}</div>}
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                    admin: [<WalletIdentity address={e.admin} />]
                    {e.verified === true && <span style={{ color: 'var(--text-primary)', marginLeft: '0.5rem' }}>✓ verified</span>}
                    {e.verified === false && <span style={{ color: '#fbbf24', marginLeft: '0.5rem' }}>⚠ unverified — IGNORED by filter</span>}
                  </div>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
};
