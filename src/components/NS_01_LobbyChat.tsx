import React, { useState, useEffect, useRef } from 'react';
import { useCurrentAccount, useSignPersonalMessage } from '../lib/dappKitMock';
import {
  fetchChatMessages,
  publishChatMessage,
  canonicalChatMessage,
  canonicalModerationMessage,
  fetchModerationEntries,
  DEV_WALLET,
  type ChatMessage,
} from '../lib/memwal';
import { verifyAuthor } from '../lib/verify';
import { useToast } from '../lib/toast';
import { ShieldCheck, EyeOff, Eye } from 'lucide-react';
import { WalletIdentity } from './WalletIdentity';

type MsgUI = ChatMessage & { verified?: boolean };

const POLL_MS = 90000;
const COOLDOWN_MS = 90000;

export const NS_01_LobbyChat: React.FC = () => {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const toast = useToast();
  const [messages, setMessages] = useState<MsgUI[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [localLogs, setLocalLogs] = useState<{timestamp: number, author: string, content: string, isSystem?: boolean}[]>([]);
  const [adminViewEnabled, setAdminViewEnabled] = useState(false);
  const lastSentRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  const isDev = currentAccount?.address.toLowerCase() === DEV_WALLET?.toLowerCase();

  useEffect(() => {
    loadChat();
    const interval = setInterval(loadChat, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const loadChat = async () => {
    const [msgs, mods] = await Promise.all([
      fetchChatMessages(),
      fetchModerationEntries()
    ]);

    const verifiedMods = await Promise.all(
      mods.map(async (m) => {
        if (!DEV_WALLET || m.admin.toLowerCase() !== DEV_WALLET) return null;
        const canonical = canonicalModerationMessage({
          targetBlobId: m.targetBlobId,
          action: m.type === 'MOD_HIDE' ? 'HIDE' : 'UNHIDE',
          timestamp: m.timestamp,
        });
        const ok = await verifyAuthor(canonical, m.signature, m.admin);
        return ok ? m : null;
      }),
    );

    const latest = new Map<string, 'HIDE' | 'UNHIDE'>();
    const sortedMods = verifiedMods
      .filter((m): m is NonNullable<typeof m> => !!m)
      .sort((a, b) => a.timestamp - b.timestamp);
    for (const m of sortedMods) {
      latest.set(m.targetBlobId, m.type === 'MOD_HIDE' ? 'HIDE' : 'UNHIDE');
    }
    const hiddenSet = new Set([...latest.entries()].filter(([, v]) => v === 'HIDE').map(([k]) => k));
    setHidden(hiddenSet);

    let jammerList: string[] = [];
    try {
      const jammerStr = localStorage.getItem('ZION_JAMMER');
      if (jammerStr) {
        const parsed = JSON.parse(jammerStr);
        if (Array.isArray(parsed)) jammerList = parsed;
      }
    } catch { /* corrupted localStorage */ }

    setMessages(msgs.filter(m => !jammerList.includes(m.author)).map(m => ({ ...m })));
    msgs.forEach(m => {
      if (!m.signature) return;
      const canonical = canonicalChatMessage(m);
      verifyAuthor(canonical, m.signature, m.author).then(ok => {
        setMessages(prev =>
          prev.map(x => (x.author === m.author && x.timestamp === m.timestamp ? { ...x, verified: ok } : x)),
        );
      });
    });
  };

  const handleSend = async () => {
    if (!currentAccount) return toast('error', 'Connect wallet first');
    const content = newMessage.trim();
    if (!content) return;

    if (content.startsWith('/')) {
      handleCommand(content);
      return;
    }

    const now = Date.now();
    if (now - lastSentRef.current < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastSentRef.current)) / 1000);
      return toast('info', `Cooldown: wait ${remaining}s before sending again`);
    }

    setIsSending(true);
    try {
      const timestamp = Date.now();
      const canonical = canonicalChatMessage({ author: currentAccount.address, content, timestamp });
      const sigRes = await signPersonalMessage({ message: new TextEncoder().encode(canonical) });
      await publishChatMessage(currentAccount.address, content, timestamp, sigRes.signature);
      lastSentRef.current = Date.now();
      setNewMessage('');
      await loadChat();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast('error', `Send failed: ${msg}`);
    }
    setIsSending(false);
  };

  const handleCommand = async (cmd: string) => {
    if (!currentAccount) return toast('error', 'Connect wallet first');
    setNewMessage('');
    
    const ts = Date.now();
    setLocalLogs(prev => [...prev, { timestamp: ts, author: currentAccount.address, content: cmd }]);
    setTimeout(() => {
      if (cmd.startsWith('/trigger_debate')) {
        const topic = cmd.replace('/trigger_debate', '').trim() || 'the latest forum activity';
        const lines = [
          `[AGENT:ALPHA] Initiating debate on ${topic}. My thesis: decentralized memory wins on resilience.`,
          `[AGENT:BETA] Counter: resilience is moot without moderation. Spam will drown signal.`,
          `[AGENT:ALPHA] Moderation is already signed by the dev AdminCap — verifiable, not arbitrary.`,
          `[AGENT:BETA] Conceded. Synthesis: signed soft-moderation + on-chain provenance is the pragmatic middle.`,
        ];
        lines.forEach((content, i) =>
          setTimeout(() =>
            setLocalLogs(prev => [...prev, { timestamp: Date.now(), author: 'SYSTEM', content, isSystem: true }]),
            i * 700),
        );
        return;
      }

      let sysRes = '';
      if (cmd.startsWith('/deploy')) sysRes = '[SYSTEM] Packaging static site... Uploading to Walrus Sites... Success!';
      else if (cmd.startsWith('/connect')) sysRes = `[SYSTEM] Handshake established with ${cmd.split(' ')[1] || 'peer'}. P2P channel open.`;
      else if (cmd.startsWith('/pair')) sysRes = '[SYSTEM] MCP Bridge connected. Local agent has permissions to request wallet signatures.';
      else if (cmd.startsWith('/remember')) sysRes = '[SYSTEM] Memory sealed and stored in MemWal MCP Server.';
      else if (cmd.startsWith('/help')) sysRes = '[SYSTEM] Commands: /deploy /connect <peer> /pair /remember /trigger_debate [topic] /help';
      else sysRes = `[SYSTEM] Command not recognized: ${cmd}. Try /help`;

      setLocalLogs(prev => [...prev, { timestamp: Date.now(), author: 'SYSTEM', content: sysRes, isSystem: true }]);
    }, 600);
  };

  const handleModerate = async (targetBlobId: string, isHide: boolean) => {
    if (!currentAccount || !isDev) return;
    try {
      const timestamp = Date.now();
      const actionStr = isHide ? 'HIDE' : 'UNHIDE';
      const typeStr = isHide ? 'MOD_HIDE' : 'MOD_UNHIDE';
      const canonical = canonicalModerationMessage({
        targetBlobId,
        action: actionStr,
        timestamp
      });
      const sigRes = await signPersonalMessage({ message: new TextEncoder().encode(canonical) });
      
      const { publishModerationEntry } = await import('../lib/memwal');
      await publishModerationEntry({
        type: typeStr,
        targetBlobId,
        admin: currentAccount.address,
        timestamp,
        signature: sigRes.signature
      });
      
      toast('success', `Message ${actionStr.toLowerCase()}`);
      await loadChat();
    } catch (err) {
      toast('error', `Moderation failed: ${err}`);
    }
  };

  return (
    <div className="matrix-panel animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-matrix-dim)', paddingBottom: '0.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', textTransform: 'uppercase' }}>&gt; LOBBY_CHAT (NS_01)</h2>
          {isDev && (
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={adminViewEnabled} onChange={e => setAdminViewEnabled(e.target.checked)} />
                [ADMIN_VIEW] Show Hidden
              </label>
            </div>
          )}
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>POLL: {POLL_MS / 1000}s | COOLDOWN: {COOLDOWN_MS / 1000}s</span>
      </div>

      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem', fontFamily: 'inherit' }}>
        {messages.length === 0 && localLogs.length === 0 && <p style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>// No data found in NS_01...</p>}
        {
          [...messages.map(m => ({...m, isLocal: false})), ...localLogs.map(l => ({...l, isLocal: true}))]
          .sort((a, b) => a.timestamp - b.timestamp)
          .map((msg: any, i) => {
          const isHidden = msg.blobId && hidden.has(msg.blobId);
          if (isHidden && !adminViewEnabled) {
            return (
              <div key={`${msg.author}-${msg.timestamp}-${i}`} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.9rem', alignItems: 'baseline', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                <span>[{new Date(msg.timestamp).toLocaleTimeString()}]</span>
                <span>//* [Message redacted by admin] *//</span>
              </div>
            );
          }

          return (
            <div key={`${msg.author}-${msg.timestamp}-${i}`} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.9rem', alignItems: 'center', opacity: isHidden ? 0.5 : 1 }}>
              <span style={{ color: 'var(--text-secondary)', minWidth: '60px' }}>
                [{new Date(msg.timestamp).toLocaleTimeString()}]
              </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                &lt;<WalletIdentity address={msg.author} />&gt;:
              </span>
              <span style={{ color: msg.isSystem ? 'var(--text-dim)' : 'var(--text-primary)' }}>{msg.content}</span>
              {msg.verified === true && (
                <ShieldCheck size={12} style={{ color: 'var(--text-primary)', opacity: 0.7 }} />
              )}
              {isDev && msg.blobId && (
                <button 
                  onClick={() => handleModerate(msg.blobId!, !isHidden)} 
                  style={{ background: 'none', border: 'none', color: isHidden ? '#10b981' : '#ef4444', cursor: 'pointer', padding: 0, marginLeft: '0.5rem', display: 'flex', alignItems: 'center' }}
                  title={isHidden ? "Restore Message" : "Hide Message"}
                >
                  {isHidden ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px dashed var(--border-matrix-dim)', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', background: 'rgba(0,0,0,0.8)', border: '1px solid var(--border-matrix-dim)' }}>
          <span style={{ color: 'var(--text-primary)', paddingLeft: '10px' }}>$</span>
          <input
            className="input-field"
            style={{ flex: 1, opacity: currentAccount ? 1 : 0.5, border: 'none', background: 'transparent' }}
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder={currentAccount ? 'Enter command...' : 'Connect wallet to broadcast...'}
            onKeyDown={e => { if (e.key === 'Enter' && currentAccount && !isSending) handleSend(); }}
            disabled={!currentAccount || isSending}
          />
        </div>
        <button
          className="btn-primary"
          onClick={handleSend}
          disabled={!currentAccount || isSending}
          style={{ opacity: currentAccount ? 1 : 0.5, cursor: currentAccount ? 'pointer' : 'not-allowed' }}
        >
          {isSending ? 'SIGNING...' : 'SIGN_&_EXECUTE'}
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.5rem' }}>
         <button 
           className="btn-secondary" 
           onClick={() => handleCommand('/trigger_debate')}
           style={{ fontSize: '0.75rem', padding: '4px 8px' }}
         >
           [TRIGGER AGENT DEBATE]
         </button>
      </div>
    </div>
  );
};
