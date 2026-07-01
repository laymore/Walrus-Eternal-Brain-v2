import React, { useState, useEffect, useMemo } from 'react';
import { useCurrentAccount, useSignPersonalMessage } from '../lib/dappKitMock';
import {
  fetchPredictions, publishPrediction, canonicalPrediction, type Prediction,
  fetchEvents,
  DEV_WALLET,
} from '../lib/memwal';
import { useToast } from '../lib/toast';
import { ShieldCheck, Trophy, Flame, Lock, TrendingUp, Swords } from 'lucide-react';
import { verifyAuthor } from '../lib/verify';
import { WC_2026_TEAMS, WC_2026_GROUPS, WC_MATCHES, type WCMatch, calcPointsForMatch, calcConfidenceLabel } from '../lib/wc2026';
import { WalletIdentity } from './WalletIdentity';

const MCP_URL = '/api/mcp';

interface WCPrediction extends Prediction {
  matchId?: string; // link tới match trong WC
  points?: number;
  correct?: boolean;
  verified?: boolean;
}

const WC2026_Game: React.FC = () => {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const toast = useToast();

  // State
  const [predictions, setPredictions] = useState<WCPrediction[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ author: string; points: number; total: number; correct: number }[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<WCMatch | null>(null);
  const [selectedPick, setSelectedPick] = useState<string>('');
  const [confidence, setConfidence] = useState('80');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'predict' | 'leaderboard' | 'roasts'>('predict');
  const [roasts, setRoasts] = useState<{ author: string; roast: string; timestamp: number }[]>([]);
  const [lastRoastedUser, setLastRoastedUser] = useState('');
  const [mcpOffline, setMcpOffline] = useState(false);
  const [matchResults, setMatchResults] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);

  // Match filter
  const [groupFilter, setGroupFilter] = useState<string>('all');

  useEffect(() => {
    setIsAdmin(!!DEV_WALLET && currentAccount?.address?.toLowerCase() === DEV_WALLET);
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [currentAccount]);

  const loadData = async () => {
    try {
      // Sequential fetch to avoid rate limits (429)
      const events = await fetchEvents();
      const result = await fetchPredictions();
      
      // Find WC 2026 event
      const wc = events.find(e => e.title.includes('World Cup 2026') || e.title.includes('WC 2026'));
      const liveResults: Record<string, string> = {};
      if (wc) {
        Object.values(wc.matches).forEach(m => {
          if (m.winner) liveResults[m.id] = m.winner;
        });
        setMatchResults(liveResults);
      }

      // Filter WC predictions
      const wcPreds: WCPrediction[] = result
        .filter(p => {
          const matchStr = p.match || '';
          return WC_2026_TEAMS.some(t => matchStr.includes(t.name)) || p.match.startsWith('🏆');
        })
        .map(p => ({ ...p, points: 0, correct: false }));

      // Score using liveResults (NOT stale state)
      wcPreds.forEach(p => {
        const matchInChain = Object.entries(liveResults).find(([, winner]) => {
          return p.match.includes(winner) && p.prediction === winner;
        });
        if (matchInChain) {
          p.correct = true;
          p.points = calcPointsForMatch(p.confidence, true);
        }
      });

      setPredictions(wcPreds);

      // Build leaderboard
      const pb: Record<string, { points: number; total: number; correct: number }> = {};
      wcPreds.forEach(p => {
        if (!pb[p.author]) pb[p.author] = { points: 0, total: 0, correct: 0 };
        pb[p.author].total++;
        pb[p.author].points += p.points || 0;
        if (p.correct) pb[p.author].correct++;
      });

      setLeaderboard(
        Object.entries(pb)
          .map(([author, stats]) => ({ author, ...stats }))
          .sort((a, b) => b.points - a.points)
      );

      // Verify signatures
      wcPreds.forEach(p => {
        if (!p.signature) return;
        const canonical = canonicalPrediction({ author: p.author, match: p.match, prediction: p.prediction, confidence: p.confidence, timestamp: p.timestamp });
        verifyAuthor(canonical, p.signature, p.author).then(ok => {
          setPredictions(prev => prev.map(x => x.author === p.author && x.timestamp === p.timestamp ? { ...x, verified: ok } : x));
        });
      });
    } catch (err) {
      console.error('load wc data error:', err);
    }
  };

  const handlePredict = async () => {
    if (!currentAccount) return toast('error', 'Connect wallet first');
    if (!selectedMatch || !selectedPick) return toast('error', 'Select a match and a pick');
    if (matchResults[selectedMatch.id]) return toast('error', 'Match already has a result');

    setIsSending(true);
    try {
      const timestamp = Date.now();
      const matchTitle = `🏆 WC 2026 | ${selectedMatch.label}: ${selectedMatch.teamA.name} vs ${selectedMatch.teamB.name}`;
      const pData = { 
        author: currentAccount.address, 
        match: matchTitle, 
        prediction: selectedPick, 
        confidence: parseInt(confidence, 10), 
        timestamp 
      };
      const canonical = canonicalPrediction(pData);
      const sigRes = await signPersonalMessage({ message: new TextEncoder().encode(canonical) });
      await publishPrediction({ ...pData, signature: sigRes.signature });

      toast('success', '🏆 WC 2026 prediction locked in!');
      setSelectedPick('');
      await loadData();

      // Roast is best-effort and isolated — never masks prediction success.
      addRoast(currentAccount.address);
    } catch (err) {
      toast('error', `Prediction failed: ${err}`);
    }
    setIsSending(false);
  };

  const filteredMatches = useMemo(() => {
    if (groupFilter === 'all') return WC_MATCHES;
    return WC_MATCHES.filter(m => m.group === groupFilter);
  }, [groupFilter]);

  // Local fallback roasts so the feature works even without the MCP engine running.
  const LOCAL_ROASTS = [
    "100% confident? The blockchain will remember this hubris forever. 🦭",
    "Bold pick. Bolder than your accuracy stats, anyway.",
    "I've seen coin flips with better calibration than you.",
    "On-chain and immutable — your bad takes are now permanent.",
    "Confidence: maximum. Evidence: pending. Classic.",
    "Wolfang has reviewed your bracket and ordered another bucket of fish.",
  ];

  const getRoast = async (author: string): Promise<string> => {
    try {
      const roastRes = await fetch(MCP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'roast_user', params: { author, context: 'wc2026' } }),
      });
      if (roastRes.ok) {
        const data = await roastRes.json();
        if (data.result?.roast) return data.result.roast;
      }
      throw new Error('bad response');
    } catch {
      if (!mcpOffline) {
        setMcpOffline(true);
        toast('info', 'MCP roast engine offline — using local roasts.');
      }
      const idx = author.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % LOCAL_ROASTS.length;
      return LOCAL_ROASTS[idx];
    }
  };

  const addRoast = async (author: string) => {
    const roast = await getRoast(author);
    setRoasts(prev => [{ author, roast, timestamp: Date.now() }, ...prev]);
  };

  const handleRoast = async (author: string) => {
    if (lastRoastedUser === author) return;
    setLastRoastedUser(author);
    await addRoast(author);
  };



  return (
    <div className="matrix-panel animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        borderBottom: '2px solid var(--text-primary)', paddingBottom: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Trophy size={32} style={{ color: '#ffd700' }} />
          <h2 style={{ margin: 0, color: 'var(--text-primary)', textTransform: 'uppercase', fontSize: '1.4rem' }}>
            WORLD CUP 2026
          </h2>
          <span style={{ color: '#ffd700', fontSize: '0.85rem', background: 'rgba(255,215,0,0.1)', padding: '2px 8px' }}>
            PREDICTION GAME
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isAdmin && <span style={{ color: '#ff003c', fontSize: '0.75rem' }}>ADMIN</span>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-matrix-dim)' }}>
        <button 
          className={`btn-secondary ${activeTab === 'predict' ? 'active' : ''}`} 
          onClick={() => setActiveTab('predict')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
        >
          <Swords size={16} /> PREDICT
        </button>
        <button 
          className={`btn-secondary ${activeTab === 'leaderboard' ? 'active' : ''}`} 
          onClick={() => setActiveTab('leaderboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
        >
          <TrendingUp size={16} /> LEADERBOARD
        </button>
        <button 
          className={`btn-secondary ${activeTab === 'roasts' ? 'active' : ''}`} 
          onClick={() => setActiveTab('roasts')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
        >
          <Flame size={16} /> ROASTS
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'predict' && (
        <div style={{ display: 'flex', gap: '1rem', flex: 1, overflow: 'hidden' }}>
          {/* Left: Match list by group */}
          <div style={{ width: '300px', border: '1px solid var(--border-matrix-dim)', background: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Group filter */}
            <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-matrix-dim)' }}>
              <select 
                className="input-field" 
                value={groupFilter} 
                onChange={e => setGroupFilter(e.target.value)}
                style={{ width: '100%', fontSize: '0.8rem' }}
              >
                <option value="all">ALL GROUPS</option>
                {WC_2026_GROUPS.map(g => (
                  <option key={g.name} value={g.name}>{g.name}</option>
                ))}
              </select>
            </div>
            {/* Match list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredMatches.map(m => {
                const hasResult = !!matchResults[m.id];
                return (
                  <div 
                    key={m.id}
                    onClick={() => { if (!hasResult) { setSelectedMatch(m); setSelectedPick(''); } }}
                    style={{ 
                      padding: '0.75rem', cursor: hasResult ? 'default' : 'pointer',
                      borderBottom: '1px solid var(--border-matrix-dim)',
                      background: selectedMatch?.id === m.id ? 'rgba(0,255,65,0.1)' : 'transparent',
                      opacity: hasResult ? 0.6 : 1,
                      borderLeft: selectedMatch?.id === m.id ? '3px solid var(--text-primary)' : '3px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>{m.group}</span>
                      <span>{m.label}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: matchResults[m.id] === m.teamA.name ? '#ffd700' : 'var(--text-primary)', fontWeight: matchResults[m.id] === m.teamA.name ? 'bold' : 'normal' }}>
                        {m.teamA.flag} {m.teamA.name}
                      </span>
                      <span style={{ color: 'var(--text-dim)' }}>vs</span>
                      <span style={{ color: matchResults[m.id] === m.teamB.name ? '#ffd700' : 'var(--text-primary)', fontWeight: matchResults[m.id] === m.teamB.name ? 'bold' : 'normal' }}>
                        {m.teamB.name} {m.teamB.flag}
                      </span>
                    </div>
                    {hasResult && (
                      <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#ffd700' }}>
                        ✓ {matchResults[m.id]} wins
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Prediction form + my picks */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'auto' }}>
            {/* Prediction form */}
            {selectedMatch && !matchResults[selectedMatch.id] ? (
              <div style={{ border: '1px dashed var(--text-primary)', padding: '1.5rem', background: 'rgba(0,255,65,0.03)' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span>{selectedMatch.teamA.flag}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{selectedMatch.teamA.name}</span>
                  <span style={{ color: 'var(--text-dim)' }}>vs</span>
                  <span style={{ color: 'var(--text-primary)' }}>{selectedMatch.teamB.name}</span>
                  <span>{selectedMatch.teamB.flag}</span>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>YOUR PICK:</div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className={`btn-secondary ${selectedPick === selectedMatch.teamA.name ? 'active' : ''}`}
                      onClick={() => setSelectedPick(selectedMatch.teamA.name)}
                      style={{ flex: 1, padding: '1rem', fontSize: '1rem', background: selectedPick === selectedMatch.teamA.name ? 'rgba(0,255,65,0.2)' : 'transparent' }}
                    >
                      {selectedMatch.teamA.flag} {selectedMatch.teamA.name}
                    </button>
                    <button 
                      className={`btn-secondary ${selectedPick === selectedMatch.teamB.name ? 'active' : ''}`}
                      onClick={() => setSelectedPick(selectedMatch.teamB.name)}
                      style={{ flex: 1, padding: '1rem', fontSize: '1rem', background: selectedPick === selectedMatch.teamB.name ? 'rgba(0,255,65,0.2)' : 'transparent' }}
                    >
                      {selectedMatch.teamB.name} {selectedMatch.teamB.flag}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      CONFIDENCE: <span style={{ color: parseInt(confidence) >= 99 ? '#ff003c' : 'var(--text-primary)' }}>{confidence}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="50" max="100" step="1"
                      value={confidence}
                      onChange={e => setConfidence(e.target.value)}
                      style={{ width: '100%' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      <span>50% (meh)</span>
                      <span>99% (LOCK!)</span>
                    </div>
                  </div>
                  <button 
                    className="btn-primary" 
                    onClick={handlePredict} 
                    disabled={isSending || !currentAccount || !selectedPick}
                    style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
                  >
                    {isSending ? <><Lock size={16} /> LOCKING...</> : <><Lock size={16} /> LOCK PREDICTION</>}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ border: '1px dashed var(--border-matrix-dim)', padding: '2rem', textAlign: 'center', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                Select an active match from the left to make your prediction
              </div>
            )}

            {/* My predictions feed */}
            <div style={{ flex: 1 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>[ YOUR PREDICTIONS ]</span>
                <span>{predictions.filter(p => currentAccount && p.author === currentAccount.address).length} total</span>
              </div>
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {predictions
                  .filter(p => currentAccount && p.author === currentAccount.address)
                  .slice(0, 20)
                  .map((p, i) => {
                    const cl = calcConfidenceLabel(p.confidence);
                    return (
                      <div key={i} style={{ border: '1px solid var(--border-matrix-dim)', padding: '0.75rem', marginBottom: '0.5rem', fontSize: '0.85rem', background: p.correct ? 'rgba(0,255,65,0.05)' : 'rgba(255,0,60,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                          <span>{p.match}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ color: cl.level === 'overconfident' ? '#ff003c' : 'var(--text-dim)' }}>{cl.label}</span>
                            {p.verified && <ShieldCheck size={12} style={{ color: 'var(--text-primary)' }} />}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                          <span>&gt; PICK: <span style={{ color: '#fff', fontWeight: 'bold' }}>{p.prediction}</span></span>
                          <span style={{ color: p.correct ? '#4dff88' : 'var(--text-dim)' }}>
                            {p.correct ? `+${p.points}pts ✓` : `${p.confidence}% confidence`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                {predictions.filter(p => currentAccount && p.author === currentAccount.address).length === 0 && (
                  <div style={{ color: 'var(--text-dim)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                    No predictions yet. Make your first pick above! ⚽
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-matrix-dim)', background: 'rgba(0,0,0,0.5)' }}>
          {/* Stats Banner */}
          <div style={{ display: 'flex', gap: '2rem', padding: '1rem', borderBottom: '1px solid var(--border-matrix-dim)' }}>
            <div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>TOTAL PREDICTORS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{leaderboard.length}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>TOTAL PREDICTIONS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{predictions.length}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>AVG ACCURACY</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {leaderboard.length > 0 
                  ? `${(leaderboard.reduce((a, b) => a + b.correct, 0) / Math.max(leaderboard.reduce((a, b) => a + b.total, 0), 1) * 100).toFixed(0)}%`
                  : 'N/A'}
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-matrix-dim)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', width: '40px' }}>#</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>USER</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>PTS</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>CORRECT</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>TOTAL</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>ACC%</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>ROAST</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, i) => (
                <tr 
                  key={entry.author} 
                  style={{ 
                    borderBottom: '1px solid var(--border-matrix-dim)', 
                    background: entry.author === currentAccount?.address ? 'rgba(0,255,65,0.05)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '0.75rem', textAlign: 'center', color: i < 3 ? '#ffd700' : 'var(--text-secondary)' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ color: entry.author === currentAccount?.address ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      <WalletIdentity address={entry.author} />
                      {entry.author === currentAccount?.address && <span style={{ color: 'var(--text-primary)', marginLeft: '0.5rem', fontSize: '0.75rem' }}>(YOU)</span>}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: '#ffd700' }}>{entry.points}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', color: entry.correct > 0 ? '#4dff88' : 'var(--text-dim)' }}>{entry.correct}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>{entry.total}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', color: entry.total > 0 && entry.correct / entry.total > 0.5 ? '#4dff88' : 'var(--text-dim)' }}>
                    {entry.total > 0 ? `${(entry.correct / entry.total * 100).toFixed(0)}%` : 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <button 
                      onClick={() => handleRoast(entry.author)}
                      className="btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      🔥 ROAST
                    </button>
                  </td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)', fontStyle: 'italic' }}>No predictions yet. Be the first! ⚽</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Roasts Tab */}
      {activeTab === 'roasts' && (
        <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-matrix-dim)', background: 'rgba(0,0,0,0.5)', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <span style={{ color: '#ff4d79', fontWeight: 'bold', textTransform: 'uppercase' }}>🔥 Wolfang Walrus Roast Feed</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>— Powered by Walrus Memory + MCP Roast Engine</span>
            <span style={{ fontSize: '0.7rem', padding: '2px 8px', border: `1px solid ${mcpOffline ? '#ffaa00' : 'var(--green-dim)'}`, color: mcpOffline ? '#ffaa00' : 'var(--text)' }}>
              MCP: {mcpOffline ? 'OFFLINE (local fallback)' : 'auto'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {roasts.length === 0 && (
              <div style={{ color: 'var(--text-dim)', fontStyle: 'italic', textAlign: 'center', padding: '3rem' }}>
                No roasts yet. Make a prediction or click ROAST on the leaderboard! 🦭
              </div>
            )}
            {roasts.map((r, i) => (
              <div key={i} style={{ border: '1px solid #ff4d79', padding: '1rem', background: 'rgba(255,77,121,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <span>🎯 Target: <span style={{ color: '#ff4d79', fontWeight: 'bold' }}><WalletIdentity address={r.author} /></span></span>
                  <span>{new Date(r.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style={{ fontStyle: 'italic', color: '#ffb3c6', paddingLeft: '1rem', borderLeft: '2px solid #ff4d79' }}>
                  <span style={{ color: '#ff4d79' }}>🦭 Wolfang Walrus: </span>"{r.roast}"
                </div>
              </div>
            ))}
            {roasts.length > 0 && (
              <button 
                className="btn-secondary" 
                onClick={() => setRoasts([])}
                style={{ alignSelf: 'center', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                CLEAR ROASTS
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WC2026_Game;
