import { useState, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useBrain } from '../contexts/BrainContext';
import { useTheme } from '../lib/theme';
import { useToast } from '../lib/toast';

function graphColors(theme: string) {
  if (theme === 'autobots') return { bg: '#050a1f', node: '#00d4ff', link: '#ff003c', text: '#ffffff' };
  if (theme === 'matrix') return { bg: '#000000', node: '#00ff41', link: '#00a618', text: '#00ff41' };
  return { bg: '#1a1b26', node: '#7aa2f7', link: '#bb9af7', text: '#c0caf5' };
}

export function LibraryView() {
  const { brain } = useBrain();
  const { theme } = useTheme();
  const toast = useToast();
  const [graph, setGraph] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [nt, setNt] = useState(''); const [nc, setNc] = useState(''); const [ntags, setNtags] = useState('');
  const [saving, setSaving] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 520 });

  const load = () => {
    if (!brain) return;
    setLoading(true);
    brain.fetchLibraryNeurons().then(setGraph).catch(() => setGraph({ nodes: [], links: [] })).finally(() => setLoading(false));
  };
  useEffect(load, [brain]);

  useEffect(() => {
    const on = () => { if (wrapRef.current) setDims({ width: wrapRef.current.clientWidth, height: wrapRef.current.clientHeight }); };
    on(); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on);
  }, [loading]);

  const openNode = (node: any) => {
    setSelected(node); setHistory([]);
    if (brain) brain.fetchBookHistory(node.id).then(setHistory).catch(() => setHistory([]));
  };

  const addBook = async () => {
    if (!brain || !nt.trim() || !nc.trim()) return toast('error', 'Title and content required');
    setSaving(true);
    try {
      await brain.createBook(nt.trim(), nc.trim(), ntags.split(',').map(s => s.trim()).filter(Boolean));
      toast('success', 'Book shelved');
      setShowAdd(false); setNt(''); setNc(''); setNtags('');
      load();
    } catch (e: any) { toast('error', `Failed: ${e.message || e}`); }
    setSaving(false);
  };

  const c = graphColors(theme);
  const q = query.toLowerCase();
  const matches = (n: any) => q && (n.label?.toLowerCase().includes(q) || (n.tags || []).some((t: string) => t.toLowerCase().includes(q)));

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2>🧠 Neuron Library</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {graph.nodes.length} neurons · {graph.links.length} synapse{graph.links.length !== 1 ? 's' : ''}. Each book is a neuron; links are lineage (reused knowledge).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input className="input" placeholder="🔍 Search books…" value={query} onChange={e => setQuery(e.target.value)} style={{ width: '200px' }} />
          <button className="btn" onClick={() => setShowAdd(true)}>+ Add book</button>
        </div>
      </div>

      <div ref={wrapRef} style={{ flex: 1, marginTop: '1rem', position: 'relative', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>Loading neurons…</div>
        ) : graph.nodes.length === 0 ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontStyle: 'italic' }}>// Library empty — add a book or run the Promotion Engine.</div>
        ) : (
          <ForceGraph2D
            width={dims.width} height={dims.height} graphData={graph} backgroundColor={c.bg}
            nodeLabel="label" nodeRelSize={5} linkWidth={1.5} linkColor={() => c.link}
            linkDirectionalArrowLength={4} linkDirectionalArrowRelPos={1}
            d3AlphaDecay={0.05} d3VelocityDecay={0.25}
            onNodeClick={openNode}
            nodeCanvasObject={(node: any, ctx, scale) => {
              const r = 4 + (node.val || 1);
              ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
              ctx.fillStyle = matches(node) ? '#ffd700' : c.node;
              ctx.fill();
              if (scale > 1.3 || matches(node)) {
                ctx.font = `${11 / scale + 3}px monospace`; ctx.fillStyle = c.text; ctx.textAlign = 'center';
                ctx.fillText((node.label || '').slice(0, 22), node.x, node.y + r + 8);
              }
            }}
          />
        )}
      </div>

      {/* Book detail panel */}
      {selected && (
        <div style={{ position: 'absolute', top: '5.5rem', right: '1rem', bottom: '1rem', width: '360px', background: 'var(--bg-elevated, #12131a)', border: '1px solid var(--primary)', borderRadius: '8px', padding: '1rem', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1rem' }}>📖 {selected.label}</h3>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '0.25rem 0 0.75rem' }}>
            v{selected.version} · {(selected.tags || []).join(', ') || 'no tags'} · {selected.origin || '?'}
          </div>
          <div style={{ fontSize: '0.85rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', padding: '0.5rem', background: 'rgba(0,0,0,0.25)', borderRadius: '4px', maxHeight: '180px', overflowY: 'auto' }}>
            {selected.content || '(no content)'}
          </div>
          <h4 style={{ fontSize: '0.85rem', margin: '1rem 0 0.5rem' }}>📜 Book history ({history.length})</h4>
          {history.length === 0 ? <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Loading…</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', borderLeft: '2px solid var(--border)', paddingLeft: '0.75rem' }}>
              {[...history].reverse().map((v, i) => (
                <div key={i} style={{ fontSize: '0.75rem' }}>
                  <strong style={{ color: 'var(--primary)' }}>v{v.version}</strong>
                  <span style={{ color: 'var(--text-dim)' }}> · {v.changed_at ? new Date(v.changed_at).toLocaleDateString() : 'seed'}</span>
                  <div style={{ color: 'var(--text-dim)' }}>{(v.content || '').slice(0, 60)}…</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add book modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '520px', maxWidth: '90vw', padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0 }}>+ Add a book (neuron)</h3>
            <input className="input" placeholder="Title" value={nt} onChange={e => setNt(e.target.value)} style={{ width: '100%', marginBottom: '0.5rem' }} />
            <input className="input" placeholder="Tags (comma-separated)" value={ntags} onChange={e => setNtags(e.target.value)} style={{ width: '100%', marginBottom: '0.5rem' }} />
            <textarea className="input" placeholder="Content (the distilled knowledge / .md)" value={nc} onChange={e => setNc(e.target.value)} style={{ width: '100%', height: '160px', marginBottom: '1rem' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn--secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn" onClick={addBook} disabled={saving}>{saving ? 'Shelving…' : 'Shelve book'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
