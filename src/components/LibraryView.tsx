import { useState, useEffect, useRef, useMemo } from 'react';
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
  const [health, setHealth] = useState<any | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 520 });

  // Manual refresh (used after adding a book) — safe to sync-set outside an effect.
  const load = () => {
    if (!brain) return;
    setLoading(true);
    brain.fetchLibraryNeurons().then(setGraph).catch(() => setGraph({ nodes: [], links: [] })).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!brain) return;
    let alive = true;
    brain.fetchLibraryNeurons()
      .then((g) => { if (alive) { setGraph(g); setLoading(false); } })
      .catch(() => { if (alive) { setGraph({ nodes: [], links: [] }); setLoading(false); } });
    brain.fetchBrainHealth().then((h: any) => { if (alive) setHealth(h); }).catch(() => {});
    return () => { alive = false; };
  }, [brain]);

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
  // Keyword-wake search — SAME mechanic the agent uses in consultLibrary:
  // tokenized keywords against tags/title. A match on a sleeping book WAKES it.
  const kws = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  const matches = (n: any) => {
    if (!kws.length) return false;
    const hay = [String(n.label || '').toLowerCase(), ...(n.tags || []).map((t: string) => String(t).toLowerCase())];
    return kws.some((kw) => hay.some((h) => h.includes(kw)));
  };

  const linkEnds = (l: any) => [typeof l.source === 'object' ? l.source.id : l.source, typeof l.target === 'object' ? l.target.id : l.target];
  // Neighbours of the selected neuron (books whose code this one reused / vice-versa).
  const neighborIds = useMemo(() => {
    const s = new Set<string>();
    if (!selected) return s;
    for (const l of graph.links as any[]) {
      const [src, tgt] = linkEnds(l);
      if (src === selected.id) s.add(tgt);
      if (tgt === selected.id) s.add(src);
    }
    return s;
  }, [selected, graph.links]);

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2>🧠 Library — Neuron Map</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {graph.nodes.length} neurons · {graph.links.length} synapse{graph.links.length !== 1 ? 's' : ''}. The <b style={{ color: '#ffcc33' }}>building</b> project glows (🚧); <b style={{ color: '#8a8a8a' }}>sleeping</b> books dim (😴) and wake on a keyword. Click a neuron to reveal its lineage links.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input className="input" placeholder="🔍 Search books…" value={query} onChange={e => setQuery(e.target.value)} style={{ width: '200px' }} />
          <button className="btn" onClick={() => setShowAdd(true)}>+ Add book</button>
        </div>
      </div>

      {/* Librarian dashboard — what the agent manages, at a glance */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
        {([
          ['📚 books', graph.nodes.length],
          ['🚧 building', graph.nodes.filter((n: any) => n.building).length],
          ['😴 sleeping', graph.nodes.filter((n: any) => n.status === 'sleeping').length],
          ['🔗 synapses', graph.links.length],
          ...(health ? [[health.health === 'HEALTHY' ? '🩺 healthy' : '🩺 degraded', `identity ${health.identity?.pass ?? '?'}/${(health.identity?.pass ?? 0) + (health.identity?.fail ?? 0)}`]] : []),
        ] as [string, string | number][]).map(([k, v], i) => (
          <span key={i} style={{ fontSize: '0.75rem', border: '1px solid var(--border)', borderRadius: '4px', padding: '3px 10px', color: 'var(--text-dim)' }}>
            <b style={{ color: 'var(--text)' }}>{String(v)}</b> {k}
          </span>
        ))}
      </div>

      <div ref={wrapRef} style={{ flex: 1, marginTop: '1rem', position: 'relative', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>Loading neurons…</div>
        ) : graph.nodes.length === 0 ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontStyle: 'italic' }}>// Library empty — add a book or run the Promotion Engine.</div>
        ) : (
          <ForceGraph2D
            width={dims.width} height={dims.height} graphData={graph} backgroundColor={c.bg}
            nodeLabel="label" nodeRelSize={5} linkColor={() => c.link}
            linkWidth={0.8} linkDirectionalArrowLength={3} linkDirectionalArrowRelPos={1}
            d3AlphaDecay={0.05} d3VelocityDecay={0.25}
            onNodeClick={openNode}
            onBackgroundClick={() => setSelected(null)}
            // Synapse lines are HIDDEN by default; a neuron's lineage only appears
            // when you click it.
            linkVisibility={(l: any) => {
              if (!selected) return false;
              const [src, tgt] = linkEnds(l);
              return src === selected.id || tgt === selected.id;
            }}
            nodeCanvasObject={(node: any, ctx, scale) => {
              const building = node.building;
              const sleeping = node.status === 'sleeping';
              const woken = sleeping && matches(node); // keyword wakes the book
              const isSel = selected && node.id === selected.id;
              const isNeighbor = neighborIds.has(node.id);
              const faded = (selected && !isSel && !isNeighbor) || (sleeping && !woken && !isSel);
              const r = (4 + (node.val || 1)) * (building ? 1.4 : 1); // building = bigger
              // glow halo for the building (current) project
              if (building) {
                ctx.beginPath(); ctx.arc(node.x, node.y, r + 6, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(255,200,40,0.16)'; ctx.fill();
              }
              ctx.globalAlpha = faded ? (sleeping ? 0.3 : 0.22) : 1;
              ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
              ctx.fillStyle = woken ? '#ffd700'
                : sleeping ? '#5a5a5a'          // grey while asleep
                : matches(node) ? '#ffd700'
                : building ? '#ffcc33'          // brighter for building
                : isSel ? '#ffffff' : c.node;
              ctx.fill();
              if (building || isSel) { ctx.lineWidth = 1.5; ctx.strokeStyle = building ? '#ffd700' : '#ffffff'; ctx.stroke(); }
              if (scale > 1.3 || matches(node) || building || isSel || isNeighbor || woken) {
                ctx.font = `${11 / scale + (building ? 4 : 3)}px monospace`;
                ctx.fillStyle = c.text; ctx.textAlign = 'center';
                ctx.fillText((node.label || '').slice(0, 24), node.x, node.y + r + 8);
                const caption = building ? '🚧 under construction' : woken ? '⏰ awakened' : sleeping ? '😴 sleeping' : '';
                if (caption) {
                  ctx.fillStyle = building ? '#ffaa00' : woken ? '#ffd700' : '#8a8a8a';
                  ctx.fillText(caption, node.x, node.y + r + 8 + 11 / scale + 5);
                }
              }
              ctx.globalAlpha = 1;
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
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '0.25rem 0 0.5rem' }}>
            v{selected.version} · {(selected.tags || []).join(', ') || 'no tags'} · {selected.origin || '?'}
          </div>
          {selected.building ? (
            <div style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 700, color: '#ffaa00', border: '1px solid #ffaa00', borderRadius: '4px', padding: '2px 8px', marginBottom: '0.75rem' }}>
              🚧 UNDER CONSTRUCTION — not finished yet
            </div>
          ) : selected.status === 'sleeping' ? (
            <div style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 700, color: '#8a8a8a', border: '1px solid #8a8a8a', borderRadius: '4px', padding: '2px 8px', marginBottom: '0.75rem' }}>
              😴 SLEEPING — wakes on a keyword
            </div>
          ) : (
            <div style={{ display: 'inline-block', fontSize: '0.72rem', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 8px', marginBottom: '0.75rem' }}>
              ✓ complete
            </div>
          )}
          {neighborIds.size > 0 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
              🔗 Linked to {neighborIds.size} project{neighborIds.size > 1 ? 's' : ''} (shared code) — lineage lines are showing.
            </div>
          )}
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
