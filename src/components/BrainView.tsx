import { useState, useEffect } from 'react';
import { useBrain } from '../contexts/BrainContext';

const short = (a?: string) => (a && a.startsWith('0x') && a.length > 12 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a || '—');

export function BrainView() {
  const { brain } = useBrain();
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!brain) return;
    let alive = true;
    brain.fetchIdentityHistory()
      .then((v) => { if (alive) { setVersions(v); setLoading(false); } })
      .catch(() => { if (alive) { setVersions([]); setLoading(false); } });
    return () => { alive = false; };
  }, [brain]);

  const current = versions[versions.length - 1];

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
        <h2>🪪 Brain Identity</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Who this brain is, and how it has evolved over time (append-only, immutable).
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--primary)' }}>Reading identity from Walrus…</div>
      ) : !current ? (
        <div style={{ padding: '2rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
          // No identity recorded yet. Run <code>init-brain-identity</code>.
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Identity card (reads V2 sections, falls back to flat v1/v2) */}
          {(() => {
            const persona = current.persona || {};
            const ownership = current.ownership || {};
            const runtime = current.runtime || {};
            const collab = current.collaborators || {};
            const isV2 = !!(current.persona || current.runtime);
            const chip = (t: string) => (
              <span key={t} style={{ fontSize: '0.75rem', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-dim)' }}>{t}</span>
            );
            const Section = ({ title, items }: { title: string; items: string[] }) => (
              items.length ? (
                <div>
                  <div style={{ color: 'var(--primary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>{title}</div>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.85rem', lineHeight: 1.6 }}>
                    {items.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </div>
              ) : null
            );
            return (
              <>
                <div style={{ border: '1px solid var(--primary)', borderRadius: '8px', padding: '1.25rem', background: 'var(--bg-elevated, rgba(0,0,0,0.25))' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {persona.agent_name || current.agent_name || 'Agent'} <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 400 }}>· v{current.version}{isV2 ? ' · Universal' : ''}</span>
                  </div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '1rem' }}>{persona.role || current.agent_description || ''}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: '0.5rem', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Project</span><span>{current.project_name || '—'}</span>
                    {persona.goal ? <><span style={{ color: 'var(--text-dim)' }}>Goal</span><span>{persona.goal}</span></> : null}
                    <span style={{ color: 'var(--text-dim)' }}>Dev wallet</span><span style={{ fontFamily: 'monospace' }}>{short(ownership.dev_wallet || current.dev_wallet)}</span>
                    <span style={{ color: 'var(--text-dim)' }}>SuiNS</span><span>{ownership.project_sui_name || current.project_sui_name || '—'}</span>
                    <span style={{ color: 'var(--text-dim)' }}>Site object</span><span style={{ fontFamily: 'monospace' }}>{short(ownership.walrus_site_object_id || current.walrus_site_object_id)}</span>
                  </div>
                </div>

                {isV2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>🌐 Universal Identity — any model reads its soul in its own format.</div>
                    <Section title="Persona · Lore" items={persona.lore || []} />
                    <Section title="Persona · Style" items={persona.style || []} />
                    <Section title="Runtime · Safety constraints" items={runtime.safety_constraints || []} />
                    {(runtime.tech_stack || []).length ? (
                      <div>
                        <div style={{ color: 'var(--primary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Runtime · Tech / Capabilities</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>{[...(runtime.tech_stack || []), ...(runtime.capabilities || [])].map(chip)}</div>
                      </div>
                    ) : null}
                    {(collab.allowed_models || []).length ? (
                      <div>
                        <div style={{ color: 'var(--primary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Collaborators · Allowed models</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>{(collab.allowed_models || []).map(chip)}</div>
                      </div>
                    ) : null}
                  </div>
                )}
              </>
            );
          })()}

          {/* Development history timeline */}
          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>📖 Development History ({versions.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '2px solid var(--border)', paddingLeft: '1rem' }}>
              {[...versions].reverse().map((v, i) => (
                <div key={i} style={{ position: 'relative', padding: '0.6rem 0.8rem', border: '1px solid var(--border)', borderRadius: '6px', background: i === 0 ? 'rgba(0,255,65,0.05)' : 'transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <strong style={{ color: 'var(--primary)' }}>v{v.version}{i === 0 ? ' · current' : ''}</strong>
                    <span style={{ color: 'var(--text-dim)' }}>{v.changed_at ? new Date(v.changed_at).toLocaleDateString() : 'seed'}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>project: “{v.project_name || '?'}”</div>
                  {(v.changed_fields || []).length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>changed: {v.changed_fields.join(', ')}{v.signature ? ' · 🔏 signed' : ''}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
