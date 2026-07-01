import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Newspaper, ExternalLink, RefreshCw, Clock } from 'lucide-react';
import { newsClient } from '../lib/memwal';

interface NewsItem {
  text: string;
  timestamp: number;
  type: 'news';
  source: 'twitter' | 'rss' | 'manual';
  source_url?: string;
  source_handle?: string;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function extractNews(results: any[]): NewsItem[] {
  const items: NewsItem[] = [];
  for (const blob of results || []) {
    try {
      const parsed = typeof blob.text === 'string' ? JSON.parse(blob.text) : blob.text;
      if (parsed.type === 'news') {
        items.push(parsed);
      } else if (typeof parsed.text === 'string' && parsed.text.includes('[NEWS]')) {
        // Fallback: detect [NEWS] prefix
        items.push({
          text: parsed.text.replace(/^\[NEWS\]\s*/, ''),
          timestamp: parsed.timestamp || Date.now(),
          type: 'news',
          source: 'rss',
          source_url: parsed.source_url,
          source_handle: parsed.source_handle,
        });
      }
    } catch {
      // Try plain text
      if (typeof blob.text === 'string' && blob.text.startsWith('[NEWS]')) {
        items.push({
          text: blob.text.replace(/^\[NEWS\]\s*/, ''),
          timestamp: Date.now(),
          type: 'news',
          source: 'rss',
        });
      }
    }
  }
  return items;
}

export const NS_02_NewsFeed: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch more and filter client-side
      const result = await newsClient.recall({ query: 'news Sui Walrus DeepBook', limit: 100 });
      const items = extractNews(result.results || []);
      items.sort((a, b) => b.timestamp - a.timestamp);
      setNews(items.slice(0, 50));
      setError(null);
    } catch (err: any) {
      console.error('[NewsFeed] fetch error:', err);
      setError(err.message || 'Failed to load news');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
    intervalRef.current = window.setInterval(fetchNews, 5 * 60 * 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [fetchNews]);

  return (
    <div className="tab-panel">
      <div className="tab-panel-header">
        <div className="tab-panel-header-left">
          <Newspaper size={18} />
          <span>📰 News & Updates</span>
        </div>
        <div className="tab-panel-header-right">
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginRight: '0.75rem' }}>
            From Sui ecosystem feeds · Auto-refresh 5 min
          </span>
          <button className="btn btn--secondary btn--sm" onClick={fetchNews} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 0.5rem' }}>
        {loading && news.length === 0 && (
          <div className="tab-panel-empty">
            <Clock size={32} />
            <span>Fetching latest news...</span>
          </div>
        )}

        {error && (
          <div className="tab-panel-empty" style={{ color: 'var(--red, #ff4444)' }}>
            <span>⚠️ {error}</span>
          </div>
        )}

        {!loading && !error && news.length === 0 && (
          <div className="tab-panel-empty">
            <Newspaper size={32} />
            <span>No news yet. Scraper will fetch the latest from Sui ecosystem soon.</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {news.map((item, i) => (
            <div key={`${item.timestamp}-${i}`} className="matrix-panel" style={{
              padding: '0.75rem 1rem',
              borderLeft: `3px solid ${
                item.source === 'rss' ? 'var(--green)' : 'var(--text-dim)'
              }`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.8rem',
                    color: 'var(--text)',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {item.text}
                  </div>
                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn--ghost btn--sm"
                      style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <ExternalLink size={11} />
                      View source
                    </a>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                    {item.source_handle || (item.source === 'rss' ? 'Sui Blog' : '')}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                    {formatTime(item.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
