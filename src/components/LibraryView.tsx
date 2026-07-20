import { useState, useEffect, useRef, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useBrain } from '../contexts/BrainContext';
import { useTheme } from '../lib/theme';

function graphColors(theme: string) {
  if (theme === 'autobots') return { bg: '#050a1f', node: '#00d4ff', link: '#ff003c', text: '#ffffff' };
  if (theme === 'matrix') return { bg: '#000000', node: '#00ff41', link: '#00a618', text: '#00ff41' };
  return { bg: '#1a1b26', node: '#7aa2f7', link: '#bb9af7', text: '#c0caf5' };
}

export function LibraryView() {
  const { brain } = useBrain();
  const { theme } = useTheme();
  const [graph, setGraph] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [health, setHealth] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'library' | 'topology'>('library');
  const [isFullScreen, setIsFullScreen] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 520 });

  useEffect(() => {
    if (!brain) return;
    let alive = true;
    setLoading(true);
    const fetcher = viewMode === 'library' ? brain.fetchLibraryNeurons() : brain.fetchBrainTopology();
    fetcher
      .then((g) => { if (alive) { setGraph(g); setLoading(false); } })
      .catch(() => { if (alive) { setGraph({ nodes: [], links: [] }); setLoading(false); } });
    brain.fetchBrainHealth().then((h: any) => { if (alive) setHealth(h); }).catch(() => {});
    return () => { alive = false; };
  }, [brain, viewMode]);

  useEffect(() => {
    const on = () => { if (wrapRef.current) setDims({ width: wrapRef.current.clientWidth, height: wrapRef.current.clientHeight }); };
    on(); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on);
  }, [loading, isFullScreen]);

  const openNode = (node: any) => {
    setSelected(node); setHistory([]);
    if (brain) brain.fetchBookHistory(node.id).then(setHistory).catch(() => setHistory([]));
  };

  const c = graphColors(theme);
  // Keyword-wake search is disabled as requested, books sleep forever.
  const matches = (_n: any) => false;

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
    <div className="card" style={isFullScreen ? { position: 'fixed', inset: 0, zIndex: 9999, margin: 0, borderRadius: 0, height: '100vh', display: 'flex', flexDirection: 'column' } : { height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>🧠 {viewMode === 'library' ? 'Library — Neuron Map' : 'Brain Topology — Knowledge Graph'}</h2>
          <button className="btn btn--secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => {
            const nextMode = viewMode === 'library' ? 'topology' : 'library';
            setViewMode(nextMode);
            setIsFullScreen(nextMode === 'topology');
          }}>
            {viewMode === 'library' ? '🕸️ VIEW TOPOLOGY (FULLSCREEN)' : '📚 VIEW LIBRARY'}
          </button>
        </div>
      </div>

      {/* Librarian dashboard — what the agent manages, at a glance */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
        {([
          ['📚 books', graph.nodes.filter((n: any) => !n.isGraph).length],
          ['🕸️ graph blobs', graph.nodes.filter((n: any) => n.isGraph).length],
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
            nodeLabel="label" nodeRelSize={5}
            // Emergent [[wiki]] synapses render dimmer + thinner than declared
            // lineage links, so you can tell "mentioned in text" from "reused code".
            linkColor={(l: any) => (l.kind === 'wikilink' ? '#6a6a8a' : c.link)}
            linkWidth={(l: any) => (l.kind === 'wikilink' ? 0.4 : 0.8)}
            linkLineDash={(l: any) => (l.kind === 'wikilink' ? [3, 3] : null)}
            linkDirectionalArrowLength={3} linkDirectionalArrowRelPos={1}
            d3AlphaDecay={0.05} d3VelocityDecay={0.25}
            onNodeClick={openNode}
            onBackgroundClick={() => setSelected(null)}
            // Synapse lines are HIDDEN by default in library mode; but ALWAYS SHOWN in topology mode.
            linkVisibility={(l: any) => {
              if (viewMode === 'topology') return true;
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
                : node.group === 1 ? '#00ff41' // Eternal Library nodes in topology
                : node.group === 2 ? '#ff003c' // Thinking Brain nodes in topology
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
                const caption = node.isGraph ? '🕸️ graph blob' : building ? '🚧 under construction' : woken ? '⏰ awakened' : sleeping ? '😴 sleeping' : '';
                if (caption) {
                  ctx.fillStyle = node.isGraph ? '#00ff41' : building ? '#ffaa00' : woken ? '#ffd700' : '#8a8a8a';
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
              ✓ {selected.isGraph ? 'graph blob' : 'complete'}
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

      {/* Add book modal is hidden as Librarian only monitors agent activities */}
    </div>
  );
}
