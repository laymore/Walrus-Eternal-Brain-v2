import React, { useEffect, useState } from 'react';
import { ExternalLink, Loader } from 'lucide-react';
import { newsClient } from '../lib/memwal';

const ACCOUNTS = [
  { handle: 'SuiNetwork', title: 'Sui Network' },
  { handle: 'WalrusProtocol', title: 'Walrus Protocol' },
  { handle: 'DeepBookTech', title: 'DeepBook' },
  { handle: 'CetusProtocol', title: 'Cetus' },
  { handle: 'Scallop_io', title: 'Scallop' },
];

/**
 * NS_19_XTimeline — renders embedded X Timelines + fetches latest
 * news posts from NS_02_forum_posts for the same accounts.
 */
export const NS_19_XTimeline: React.FC = () => {
  const [activeHandle, setActiveHandle] = useState(ACCOUNTS[0].handle);
  const [latestNews, setLatestNews] = useState<Record<string, { text: string; url: string }[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load X embed script once
    const existing = document.querySelector('script[src*="x.com/widgets.js"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://platform.x.com/widgets.js';
      script.charset = 'utf-8';
      script.async = true;
      document.head.appendChild(script);
    }

    // Fetch latest news for each account
    async function fetchLatest() {
      setLoading(true);
      try {
        const result = await newsClient.recall({ query: 'news Sui Walrus DeepBook Cetus Scallop', limit: 80 });
        const grouped: Record<string, { text: string; url: string }[]> = {};
        for (const blob of result.results || []) {
          try {
            const p = JSON.parse(blob.text);
            if (p.type === 'news') {
              const key = p.source_handle?.replace('@', '') || 'unknown';
              if (!grouped[key]) grouped[key] = [];
              if (grouped[key].length < 3) {
                grouped[key].push({ text: p.text, url: p.source_url || '' });
              }
            }
          } catch {}
        }
        setLatestNews(grouped);
      } catch (err) {
        console.error('[XTimeline] fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLatest();
  }, []);

  return (
    <div className="tab-panel">
      {/* ── Header ─────────────────────────── */}
      <div className="tab-panel-header">
        <div className="tab-panel-header-left">
          <span style={{ fontSize: '1.1rem' }}>𝕏</span>
          <span>Sui Community Timeline</span>
        </div>
      </div>

      {/* ── Account Pills ──────────────────── */}
      <div style={{
        display: 'flex', gap: '0.35rem', flexWrap: 'wrap',
        padding: '0.5rem 1rem',
        borderBottom: '1px solid var(--border)',
      }}>
        {ACCOUNTS.map(a => (
          <button
            key={a.handle}
            className={`btn btn--pill${activeHandle === a.handle ? ' btn--pill--active' : ''}`}
            onClick={() => setActiveHandle(a.handle)}
          >
            @{a.handle}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', gap: '0.75rem', overflow: 'hidden', padding: '0.5rem' }}>
        {/* ── Left: X Embed ────────────────── */}
        <div className="matrix-panel" style={{
          flex: 1, minWidth: 0, overflow: 'auto',
          padding: '0.5rem',
        }}>
          <div style={{
            fontSize: '0.7rem', color: 'var(--text-dim)',
            marginBottom: '0.5rem', textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            {'>'} Live Timeline: @{activeHandle}
          </div>
          <div style={{ minHeight: '400px' }}>
            <a
              className="twitter-timeline"
              data-height="600"
              data-theme="dark"
              data-link-color="#00ff41"
              href={`https://x.com/${activeHandle}`}
            >
              Posts by @{activeHandle}
            </a>
          </div>
        </div>

        {/* ── Right: Latest News ─────────── */}
        <div className="matrix-panel" style={{
          width: '22rem', flexShrink: 0, overflow: 'auto',
          padding: '0.5rem',
        }}>
          <div style={{
            fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.75rem',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}>
            {loading && <Loader size={12} className="spin" />}
            {'>'} Latest News on Forum
          </div>

          {!loading && Object.keys(latestNews).length === 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', padding: '1rem', textAlign: 'center' }}>
              No news items yet. Scraper will fetch soon.
            </div>
          )}

          {Object.entries(latestNews).map(([handle, items]) => (
            <div key={handle} style={{ marginBottom: '1rem' }}>
              <div style={{
                fontSize: '0.7rem', color: 'var(--green)',
                marginBottom: '0.3rem', fontWeight: 600,
              }}>
                @{handle}
              </div>
              {items.map((item, i) => (
                <div key={i} style={{
                  fontSize: '0.72rem', color: 'var(--text-dim)',
                  lineHeight: 1.4, marginBottom: '0.4rem', paddingLeft: '0.5rem',
                  borderLeft: '1px solid var(--border)',
                }}>
                  <div style={{
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {item.text.length > 120 ? item.text.slice(0, 120) + '...' : item.text}
                  </div>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                       style={{ color: 'var(--green)', opacity: 0.7, fontSize: '0.65rem' }}>
                      <ExternalLink size={10} style={{ display: 'inline', marginRight: '0.2rem' }} />
                      source
                    </a>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
