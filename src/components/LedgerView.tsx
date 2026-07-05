import { useState, useEffect } from 'react';
import { useBrain } from '../contexts/BrainContext';

const KIND_ICON: Record<string, string> = {
  'book shelved': '📖',
  'book evolved': '📝',
  'synapse formed': '🔗',
};

export function LedgerView() {
  const { brain } = useBrain();
  const [shelf, setShelf] = useState<any[]>([]);
  const [traces, setTraces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!brain) return;
    let alive = true;
    brain.fetchLedger()
      .then((l: any) => { if (alive) { setShelf(l.shelf); setTraces(l.traces); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [brain]);

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
        <h2>📋 Library Ledger</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          What the librarian has been doing — shelf events and recent working traces, with model provenance.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--primary)' }}>Reading the ledger…</div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          {/* Shelf events */}
          <div>
            <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.75rem' }}>📚 Shelf events ({shelf.length})</h3>
            {shelf.length === 0 && <div style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: '0.85rem' }}>// No shelf activity yet.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {shelf.map((e, i) => (
                <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '0.6rem 0.8rem', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{KIND_ICON[e.kind] || '•'} {e.kind}</span>
                    <span style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{e.ts ? new Date(e.ts).toLocaleDateString() : ''}</span>
                  </div>
                  <div style={{ marginTop: '0.2rem', wordBreak: 'break-word' }}>{e.label}</div>
                  {e.detail && <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '0.15rem' }}>{e.detail}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Recent traces */}
          <div>
            <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.75rem' }}>🧾 Recent working traces ({traces.length})</h3>
            {traces.length === 0 && <div style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: '0.85rem' }}>// No traces in the current Thinking Brain namespace.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {traces.map((t, i) => (
                <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '0.6rem 0.8rem', fontSize: '0.82rem' }}>
                  <span style={{ color: '#ffcc33', fontWeight: 600, marginRight: '0.5rem' }}>[{t.model}]</span>
                  <span style={{ color: 'var(--text-dim)' }}>{t.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
