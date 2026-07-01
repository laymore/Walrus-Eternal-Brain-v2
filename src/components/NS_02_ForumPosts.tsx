import React, { useState, useEffect, useMemo } from 'react';
import { useCurrentAccount, useSignPersonalMessage } from '../lib/dappKitMock';
import {
  fetchForumPosts,
  publishForumPost,
  canonicalForumMessage,
  canonicalModerationMessage,
  fetchModerationEntries,
  DEV_WALLET,
  type ForumPostHydrated,
} from '../lib/memwal';
import { verifyAuthor } from '../lib/verify';
import { useToast } from '../lib/toast';
import { Search, Plus, User, Clock, ShieldCheck, ShieldAlert, EyeOff, Eye } from 'lucide-react';
import { WalletIdentity } from './WalletIdentity';

type HydratedWithVerify = ForumPostHydrated & { verified?: boolean };

export const NS_02_ForumPosts: React.FC = () => {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const toast = useToast();
  const [posts, setPosts] = useState<HydratedWithVerify[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('general');
  const [isPublishing, setIsPublishing] = useState(false);
  const [adminViewEnabled, setAdminViewEnabled] = useState(false);

  const isDev = currentAccount?.address.toLowerCase() === DEV_WALLET?.toLowerCase();

  useEffect(() => { loadPosts(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const loadPosts = async (query = '') => {
    setLoading(true);
    const [rawPosts, mods] = await Promise.all([
      fetchForumPosts(query),
      fetchModerationEntries(),
    ]);

    // Only honor mod entries signed by DEV_WALLET. Verify each signature first.
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

    // Latest action wins per target.
    const latest = new Map<string, 'HIDE' | 'UNHIDE'>();
    const sortedMods = verifiedMods
      .filter((m): m is NonNullable<typeof m> => !!m)
      .sort((a, b) => a.timestamp - b.timestamp);
    for (const m of sortedMods) {
      latest.set(m.targetBlobId, m.type === 'MOD_HIDE' ? 'HIDE' : 'UNHIDE');
    }
    const hiddenSet = new Set(
      [...latest.entries()].filter(([, v]) => v === 'HIDE').map(([k]) => k),
    );
    setHidden(hiddenSet);

    // Verify signatures (best-effort, runs in background — non-blocking render)
    setPosts(rawPosts.map(p => ({ ...p, verified: undefined })));
    setLoading(false);

    rawPosts.forEach((p) => {
      const msg = canonicalForumMessage(p);
      verifyAuthor(msg, p.signature, p.author).then((ok) => {
        setPosts(prev => prev.map(x => x.postId === p.postId ? { ...x, verified: ok } : x));
      });
    });
  };

  const handlePublish = async () => {
    if (!currentAccount) return toast('error', 'Connect wallet first');
    if (!newTitle.trim() || !newContent.trim()) return toast('error', 'Title and content required');
    setIsPublishing(true);
    try {
      const tags = newTags.split(',').map(t => t.trim()).filter(Boolean);
      const postId = crypto.randomUUID();
      const timestamp = Date.now();
      const canonical = canonicalForumMessage({
        postId, title: newTitle, content: newContent,
        author: currentAccount.address, tags, timestamp,
      });
      const sigRes = await signPersonalMessage({ message: new TextEncoder().encode(canonical) });

      await publishForumPost({
        postId, title: newTitle, content: newContent,
        author: currentAccount.address, tags, timestamp,
        signature: sigRes.signature,
      });

      setShowModal(false);
      setNewTitle('');
      setNewContent('');
      setNewTags('general');
      toast('success', 'Post published');
      await loadPosts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast('error', `Publish failed: ${msg}`);
    }
    setIsPublishing(false);
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
      
      toast('success', `Post ${actionStr.toLowerCase()}`);
      await loadPosts(searchQuery);
    } catch (err) {
      toast('error', `Moderation failed: ${err}`);
    }
  };

  const filteredPosts = useMemo(() => {
    let list = posts;
    if (!adminViewEnabled) {
      list = list.filter(p => !hidden.has(p.blobId));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
    }
    return list;
  }, [posts, hidden, adminViewEnabled, searchQuery]);

  return (
    <div className="matrix-panel animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-matrix-dim)', paddingBottom: '0.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', textTransform: 'uppercase' }}>&gt; FORUM_POSTS (NS_02)</h2>
          {hidden.size > 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {hidden.size} post{hidden.size > 1 ? 's' : ''} hidden by moderation
            </span>
          )}
          {isDev && (
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={adminViewEnabled} onChange={e => setAdminViewEnabled(e.target.checked)} />
                [ADMIN_VIEW] Show Hidden Posts
              </label>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <input
              className="input-field"
              placeholder="Search parameters..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadPosts(searchQuery)}
              style={{ paddingLeft: '35px', background: 'var(--bg-color)' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--border-matrix-dim)' }} />
          </div>
          <button
            className="btn-primary"
            onClick={() => { if (currentAccount) setShowModal(true); }}
            disabled={!currentAccount}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: currentAccount ? 1 : 0.5, cursor: currentAccount ? 'pointer' : 'not-allowed' }}
          >
            <Plus size={16} /> {currentAccount ? 'CREATE_THREAD' : 'CONNECT_REQUIRED'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
        {loading
          ? <p style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>// Initializing data stream...</p>
          : (
            <>
              {filteredPosts.length === 0 && <p style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>// No records found in memory sector...</p>}
              {filteredPosts.map((post) => (
                <div key={post.postId} style={{ padding: '1.5rem', background: 'var(--bg-matrix)', border: '1px solid var(--border-matrix-dim)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '1.2rem', textTransform: 'uppercase' }}>{post.title}</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>SIM: {(post.similarity * 100).toFixed(0)}%</span>
                  </div>
                  <p style={{ color: 'var(--text-primary)', margin: '0 0 1.5rem 0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{post.content}</p>
                  {post.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                      {post.tags.map(t => (
                        <span key={t} style={{ fontSize: '0.7rem', padding: '2px 8px', border: '1px solid var(--border-matrix-dim)', color: 'var(--text-secondary)' }}>#{t}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-matrix-dim)', paddingTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><User size={14} /> [<WalletIdentity address={post.author} />]</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> {post.date}</span>
                      {post.verified === true && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-primary)' }}>
                          <ShieldCheck size={14} /> VERIFIED
                        </span>
                      )}
                      {post.verified === false && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#fbbf24' }}>
                          <ShieldAlert size={14} /> UNVERIFIED
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {isDev && (
                        hidden.has(post.blobId) ? (
                          <button onClick={() => handleModerate(post.blobId, false)} style={{ background: 'none', border: '1px solid var(--border-matrix-dim)', color: '#10b981', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Eye size={12} /> RESTORE
                          </button>
                        ) : (
                          <button onClick={() => handleModerate(post.blobId, true)} style={{ background: 'none', border: '1px solid var(--border-matrix-dim)', color: '#ef4444', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <EyeOff size={12} /> HIDE
                          </button>
                        )
                      )}
                      <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>blob: {post.blobId.slice(0,8)}...</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="matrix-panel" style={{ padding: '2rem', width: '100%', maxWidth: '600px' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', textTransform: 'uppercase' }}>&gt; INIT_NEW_THREAD</h2>
            <input className="input-field" placeholder="THREAD_TITLE" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ marginBottom: '1rem' }} />
            <textarea className="input-field" placeholder="THREAD_CONTENT_BUFFER" value={newContent} onChange={e => setNewContent(e.target.value)} style={{ height: '150px', resize: 'vertical', marginBottom: '1rem' }} />
            <input className="input-field" placeholder="TAGS (comma-separated)" value={newTags} onChange={e => setNewTags(e.target.value)} style={{ marginBottom: '1.5rem' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>ABORT</button>
              <button className="btn-primary" onClick={handlePublish} disabled={isPublishing}>{isPublishing ? 'UPLOADING...' : 'SIGN_AND_COMMIT'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
