import React, { useState, useEffect } from 'react';
import { useCurrentAccount, useSignPersonalMessage } from '../lib/dappKitMock';
import { 
  fetchPredictions, publishPrediction, canonicalPrediction, type Prediction,
  fetchMatchResults, publishMatchResult, canonicalMatchResult, type MatchResult,
  fetchEvents, publishEventConfig, canonicalEventConfig, type EventConfig, type MatchNode,
  DEV_WALLET
} from '../lib/memwal';
import { useToast } from '../lib/toast';
import { ShieldCheck, Crosshair, Trophy, Plus, List, Network } from 'lucide-react';
import { verifyAuthor } from '../lib/verify';
import { WalletIdentity } from './WalletIdentity';

export const NS_04_PredictionLedger: React.FC = () => {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const toast = useToast();
  
  const [events, setEvents] = useState<EventConfig[]>([]);
  const [activeEventId, setActiveEventId] = useState<string>('');
  
  const [predictions, setPredictions] = useState<(Prediction & { verified?: boolean })[]>([]);
  const [isSending, setIsSending] = useState(false);
  
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [selectedPick, setSelectedPick] = useState<string>('');
  const [confidence, setConfidence] = useState('80');
  
  // Create Event State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState<'bracket' | 'list'>('bracket');
  const [newEventData, setNewEventData] = useState('');

  const isAdmin = !!DEV_WALLET && currentAccount?.address?.toLowerCase() === DEV_WALLET;

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 90000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    // Fetch sequentially to avoid rate limits (429)
    const evts = await fetchEvents();
    const results = await fetchMatchResults();
    const preds = await fetchPredictions();

    // Process predictions
    setPredictions(preds.map(p => ({ ...p })));
    preds.forEach(p => {
      if (!p.signature) return;
      const canonical = canonicalPrediction(p);
      verifyAuthor(canonical, p.signature, p.author).then(ok => {
        setPredictions(prev => prev.map(x => (x.author === p.author && x.timestamp === p.timestamp ? { ...x, verified: ok } : x)));
      });
    });

    // Process events
    const verifiedEvents: EventConfig[] = [];
    for (const e of evts) {
      if (e.admin.toLowerCase() !== DEV_WALLET) continue;
      const canonical = canonicalEventConfig({ eventId: e.eventId, title: e.title, type: e.type, timestamp: e.timestamp });
      const ok = await verifyAuthor(canonical, e.signature, e.admin);
      if (ok) verifiedEvents.push(e);
    }
    
    // Sort events newest first
    verifiedEvents.sort((a, b) => b.timestamp - a.timestamp);

    // Process match results and apply to events
    const verifiedResults: MatchResult[] = [];
    for (const r of results) {
      if (r.admin.toLowerCase() !== DEV_WALLET) continue;
      const canonical = canonicalMatchResult({ matchId: r.matchId, winner: r.winner, timestamp: r.timestamp });
      const ok = await verifyAuthor(canonical, r.signature, r.admin);
      if (ok) verifiedResults.push(r);
    }
    verifiedResults.sort((a, b) => a.timestamp - b.timestamp);

    // Apply results to each event's matches
    const updatedEvents = verifiedEvents.map(evt => {
      const e = JSON.parse(JSON.stringify(evt)) as EventConfig;
      verifiedResults.forEach(r => {
        const match = e.matches[r.matchId];
        if (match) {
          match.winner = r.winner;
          if (match.nextMatchId) {
            const nextMatch = e.matches[match.nextMatchId];
            if (nextMatch) {
              if (match.nextMatchSlot === 'A') nextMatch.teamA = r.winner;
              else if (match.nextMatchSlot === 'B') nextMatch.teamB = r.winner;
            }
          }
        }
      });
      return e;
    });

    setEvents(updatedEvents);
    
    // Auto select first event if none selected
    if (!activeEventId && updatedEvents.length > 0) {
      setActiveEventId(updatedEvents[0].eventId);
    }
  };

  const handlePredict = async () => {
    if (!currentAccount) return toast('error', 'Connect wallet first');
    if (!selectedMatchId || !selectedPick || !activeEventId) return toast('error', 'Please select a match and a pick');

    const activeEvent = events.find(e => e.eventId === activeEventId);
    if (!activeEvent) return;

    const matchObj = activeEvent.matches[selectedMatchId];
    if (!matchObj || matchObj.teamA === 'TBD' || matchObj.teamB === 'TBD') return toast('error', 'Match not ready');
    if (matchObj.winner) return toast('error', 'Match already ended');

    const matchTitle = `${activeEvent.title} | ${matchObj.label}: ${matchObj.teamA} vs ${matchObj.teamB}`;
    setIsSending(true);
    try {
      const timestamp = Date.now();
      const pData = { author: currentAccount.address, match: matchTitle, prediction: selectedPick, confidence: parseInt(confidence, 10), timestamp };
      const canonical = canonicalPrediction(pData);
      const sigRes = await signPersonalMessage({ message: new TextEncoder().encode(canonical) });
      
      await publishPrediction({ ...pData, signature: sigRes.signature });
      toast('success', 'Prediction committed to ledger');
      setSelectedPick('');
      await loadData();
    } catch (err) { toast('error', `Failed: ${err}`); }
    setIsSending(false);
  };

  const handleSetWinner = async (matchId: string, winner: string) => {
    if (!isAdmin) return toast('error', 'Admin only');
    setIsSending(true);
    try {
      const timestamp = Date.now();
      const payload = { matchId, winner, timestamp };
      const canonical = canonicalMatchResult(payload);
      const sigRes = await signPersonalMessage({ message: new TextEncoder().encode(canonical) });
      await publishMatchResult({ ...payload, admin: currentAccount!.address, signature: sigRes.signature });
      toast('success', `Winner set to ${winner}`);
      await loadData();
    } catch (err) { toast('error', `Set winner failed: ${err}`); }
    setIsSending(false);
  };

  const handleCreateEvent = async () => {
    if (!isAdmin || !newEventTitle || !newEventData) return toast('error', 'Missing fields');
    setIsSending(true);
    try {
      const matches: Record<string, MatchNode> = {};
      const timestamp = Date.now();
      const eventId = `evt_${timestamp}`;
      
      if (newEventType === 'bracket') {
        const teams = newEventData.split(',').map(t => t.trim()).filter(Boolean);
        if (teams.length !== 8) throw new Error("Bracket requires exactly 8 teams separated by commas.");
        
        // QF
        matches[`${eventId}_qf_1`] = { id: `${eventId}_qf_1`, label: 'QF 1', teamA: teams[0], teamB: teams[1], nextMatchId: `${eventId}_sf_1`, nextMatchSlot: 'A' };
        matches[`${eventId}_qf_2`] = { id: `${eventId}_qf_2`, label: 'QF 2', teamA: teams[2], teamB: teams[3], nextMatchId: `${eventId}_sf_1`, nextMatchSlot: 'B' };
        matches[`${eventId}_qf_3`] = { id: `${eventId}_qf_3`, label: 'QF 3', teamA: teams[4], teamB: teams[5], nextMatchId: `${eventId}_sf_2`, nextMatchSlot: 'A' };
        matches[`${eventId}_qf_4`] = { id: `${eventId}_qf_4`, label: 'QF 4', teamA: teams[6], teamB: teams[7], nextMatchId: `${eventId}_sf_2`, nextMatchSlot: 'B' };
        // SF
        matches[`${eventId}_sf_1`] = { id: `${eventId}_sf_1`, label: 'SF 1', teamA: 'TBD', teamB: 'TBD', nextMatchId: `${eventId}_final`, nextMatchSlot: 'A' };
        matches[`${eventId}_sf_2`] = { id: `${eventId}_sf_2`, label: 'SF 2', teamA: 'TBD', teamB: 'TBD', nextMatchId: `${eventId}_final`, nextMatchSlot: 'B' };
        // Final
        matches[`${eventId}_final`] = { id: `${eventId}_final`, label: 'Final', teamA: 'TBD', teamB: 'TBD' };
      } else {
        const lines = newEventData.split('\n').map(l => l.trim()).filter(Boolean);
        lines.forEach((line, i) => {
          const parts = line.split(' vs ');
          if (parts.length === 2) {
            matches[`${eventId}_m_${i}`] = { id: `${eventId}_m_${i}`, label: `Match ${i+1}`, teamA: parts[0].trim(), teamB: parts[1].trim(), draw: true, drawLabel: 'DRAW' };
          }
        });
        if (Object.keys(matches).length === 0) throw new Error("No valid matches found. Use format: Team A vs Team B");
      }

      const pData = { eventId, title: newEventTitle, type: newEventType, matches, timestamp };
      const canonical = canonicalEventConfig({ eventId, title: newEventTitle, type: newEventType, timestamp });
      const sigRes = await signPersonalMessage({ message: new TextEncoder().encode(canonical) });
      
      await publishEventConfig({ ...pData, admin: currentAccount!.address, signature: sigRes.signature });
      toast('success', 'Event Created!');
      setShowCreateModal(false);
      setNewEventTitle('');
      setNewEventData('');
      await loadData();
    } catch (err: any) { toast('error', `Failed: ${err.message || err}`); }
    setIsSending(false);
  };

  const activeEvent = events.find(e => e.eventId === activeEventId);
  const activeMatch = activeEvent ? activeEvent.matches[selectedMatchId] : undefined;

  // Derive bracket columns dynamically for UI if it's a bracket
  let bracketColumns: string[][] = [];
  if (activeEvent?.type === 'bracket') {
      const qf = Object.keys(activeEvent.matches).filter(k => k.includes('_qf_')).sort();
      const sf = Object.keys(activeEvent.matches).filter(k => k.includes('_sf_')).sort();
      const f = Object.keys(activeEvent.matches).filter(k => k.includes('_final')).sort();
      bracketColumns = [qf, sf, f];
  }

  return (
    <div className="matrix-panel animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border-matrix-dim)', paddingBottom: '0.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', textTransform: 'uppercase' }}>&gt; PREDICTION_LEDGER (NS_04)</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0.35rem 0 0 0', fontSize: '0.8rem' }}>
            Custom admin-created brackets &amp; markets · World Cup 2026 has its own game tab 🏆
          </p>
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>MULTI-EVENT ORACLE</span>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flex: 1, overflow: 'hidden' }}>
        {/* Events Sidebar */}
        <div style={{ width: '250px', border: '1px solid var(--border-matrix-dim)', background: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-matrix-dim)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
            [ AVAILABLE EVENTS ]
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {events.length === 0 && <div style={{ padding: '1rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>No events found.</div>}
            {events.map(evt => (
              <div 
                key={evt.eventId}
                onClick={() => { setActiveEventId(evt.eventId); setSelectedMatchId(''); }}
                style={{ 
                  padding: '1rem 0.75rem', 
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-matrix-dim)',
                  background: activeEventId === evt.eventId ? 'rgba(0, 255, 65, 0.1)' : 'transparent',
                  borderLeft: activeEventId === evt.eventId ? '3px solid var(--text-primary)' : '3px solid transparent',
                  display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                {evt.type === 'bracket' ? <Network size={16} /> : <List size={16} />}
                <span style={{ fontWeight: activeEventId === evt.eventId ? 'bold' : 'normal', color: activeEventId === evt.eventId ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {evt.title}
                </span>
              </div>
            ))}
          </div>
          {isAdmin && (
            <div style={{ padding: '0.5rem', borderTop: '1px solid var(--border-matrix-dim)' }}>
               <button className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem' }} onClick={() => setShowCreateModal(true)}>
                 <Plus size={16} /> NEW EVENT
               </button>
            </div>
          )}
        </div>

        {/* Main Area: Bracket/List Viewer + Prediction Form */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
          
          {/* Active Event Viewer */}
          <div style={{ flex: 2, overflow: 'auto', border: '1px solid var(--border-matrix-dim)', background: 'rgba(0,0,0,0.5)', padding: '1rem' }}>
            {!activeEvent ? (
              <div style={{ color: 'var(--text-dim)', fontStyle: 'italic', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Select an event to view...</div>
            ) : activeEvent.type === 'bracket' ? (
              // BRACKET UI
              <div style={{ display: 'flex', gap: '2rem', height: '100%', minWidth: 'max-content' }}>
                {bracketColumns.map((col, colIdx) => (
                  <div key={colIdx} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', minWidth: '200px' }}>
                    {col.map(mId => {
                      const m = activeEvent.matches[mId];
                      const isReady = m.teamA !== 'TBD' && m.teamB !== 'TBD';
                      const isEnded = !!m.winner;
                      return (
                        <div 
                          key={mId} 
                          style={{ 
                            padding: '0.5rem', border: '1px solid', 
                            borderColor: selectedMatchId === mId ? 'var(--text-primary)' : 'var(--border-matrix-dim)', 
                            background: selectedMatchId === mId ? 'rgba(0,255,65,0.1)' : 'var(--bg-matrix)',
                            cursor: isReady && !isEnded ? 'pointer' : 'default',
                            opacity: isReady ? 1 : 0.5,
                            marginBottom: '1rem', position: 'relative'
                          }}
                          onClick={() => { if (isReady && !isEnded) setSelectedMatchId(mId); }}
                        >
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', textAlign: 'center' }}>{m.label}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: m.winner === m.teamA ? '#fff' : (m.winner ? 'var(--text-dim)' : 'var(--text-primary)'), fontWeight: m.winner === m.teamA ? 'bold' : 'normal' }}>
                            <span>{m.teamA}</span>
                            {isAdmin && isReady && !isEnded && (
                              <button onClick={(e) => { e.stopPropagation(); handleSetWinner(mId, m.teamA); }} style={{ fontSize: '0.6rem', padding: '2px', background: 'var(--text-primary)', color: '#000', border: 'none', cursor: 'pointer' }}>WIN</button>
                            )}
                            {m.winner === m.teamA && <Trophy size={12} color="#fff" />}
                          </div>
                          <div style={{ borderTop: '1px dashed var(--border-matrix-dim)', margin: '4px 0' }}></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: m.winner === m.teamB ? '#fff' : (m.winner ? 'var(--text-dim)' : 'var(--text-primary)'), fontWeight: m.winner === m.teamB ? 'bold' : 'normal' }}>
                            <span>{m.teamB}</span>
                            {isAdmin && isReady && !isEnded && (
                              <button onClick={(e) => { e.stopPropagation(); handleSetWinner(mId, m.teamB); }} style={{ fontSize: '0.6rem', padding: '2px', background: 'var(--text-primary)', color: '#000', border: 'none', cursor: 'pointer' }}>WIN</button>
                            )}
                            {m.winner === m.teamB && <Trophy size={12} color="#fff" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              // LIST UI
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.values(activeEvent.matches).map(m => {
                  const isEnded = !!m.winner;
                  return (
                    <div 
                      key={m.id}
                      style={{ 
                        padding: '1rem', border: '1px solid', 
                        borderColor: selectedMatchId === m.id ? 'var(--text-primary)' : 'var(--border-matrix-dim)', 
                        background: selectedMatchId === m.id ? 'rgba(0,255,65,0.1)' : 'var(--bg-matrix)',
                        cursor: !isEnded ? 'pointer' : 'default',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                      onClick={() => { if (!isEnded) setSelectedMatchId(m.id); }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ color: 'var(--text-secondary)', width: '80px' }}>{m.label}</span>
                        <span style={{ color: m.winner === m.teamA ? '#fff' : 'var(--text-primary)', fontWeight: m.winner === m.teamA ? 'bold' : 'normal' }}>{m.teamA} {m.winner === m.teamA && <Trophy size={12} />}</span>
                        <span style={{ color: 'var(--text-dim)' }}>vs</span>
                        <span style={{ color: m.winner === m.teamB ? '#fff' : 'var(--text-primary)', fontWeight: m.winner === m.teamB ? 'bold' : 'normal' }}>{m.teamB} {m.winner === m.teamB && <Trophy size={12} />}</span>
                      </div>
                      {isAdmin && !isEnded && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={(e) => { e.stopPropagation(); handleSetWinner(m.id, m.teamA); }} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>{m.teamA} WIN</button>
                          <button onClick={(e) => { e.stopPropagation(); handleSetWinner(m.id, m.teamB); }} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>{m.teamB} WIN</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', flex: 1, minHeight: '200px' }}>
            {/* Prediction Form */}
            <div style={{ flex: 1, padding: '1rem', border: '1px dashed var(--border-matrix-dim)', background: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeMatch && activeMatch.teamA !== 'TBD' && !activeMatch.winner ? (
                <>
                  <div style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 'bold' }}>
                    {activeMatch.teamA} <span style={{ color: 'var(--text-dim)' }}>vs</span> {activeMatch.teamB}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className={`btn-secondary ${selectedPick === activeMatch.teamA ? 'active' : ''}`} style={{ flex: 1, background: selectedPick === activeMatch.teamA ? 'var(--bg-matrix)' : 'transparent' }} onClick={() => setSelectedPick(activeMatch.teamA)}>
                      [{activeMatch.teamA}]
                    </button>
                    {activeMatch.draw && (
                      <button className={`btn-secondary ${selectedPick === 'DRAW' ? 'active' : ''}`} style={{ flex: 0.5, background: selectedPick === 'DRAW' ? 'var(--bg-matrix)' : 'transparent' }} onClick={() => setSelectedPick('DRAW')}>
                        [{activeMatch.drawLabel || 'DRAW'}]
                      </button>
                    )}
                    <button className={`btn-secondary ${selectedPick === activeMatch.teamB ? 'active' : ''}`} style={{ flex: 1, background: selectedPick === activeMatch.teamB ? 'var(--bg-matrix)' : 'transparent' }} onClick={() => setSelectedPick(activeMatch.teamB)}>
                      [{activeMatch.teamB}]
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>CONFIDENCE:</div>
                      <select className="input-field" value={confidence} onChange={e => setConfidence(e.target.value)}>
                        <option value="50">50%</option><option value="80">80%</option><option value="99">99%</option><option value="100">100% Lock</option>
                      </select>
                    </div>
                    <button className="btn-primary" onClick={handlePredict} disabled={isSending || !currentAccount || !selectedPick}>
                      {isSending ? '...' : 'PREDICT'}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--text-dim)', fontStyle: 'italic', textAlign: 'center', margin: 'auto' }}>Select an active match to predict</div>
              )}
            </div>

            {/* Feed */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
              {predictions.filter(p => p.match.startsWith(activeEvent?.title || '')).map((p, i) => {
                return (
                  <div key={i} style={{ border: '1px solid var(--border-matrix-dim)', padding: '0.75rem', background: 'rgba(0, 255, 65, 0.02)', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Crosshair size={12} /> <WalletIdentity address={p.author} />{p.verified && <ShieldCheck size={12} style={{ color: 'var(--text-primary)' }} />}</span>
                      <span>{new Date(p.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{p.match}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-primary)' }}>&gt; PICK: <span style={{ color: '#fff' }}>{p.prediction}</span></span>
                      <span style={{ color: p.confidence > 90 ? '#ff003c' : 'var(--text-dim)' }}>CONF: {p.confidence}%</span>
                    </div>
                    {p.confidence >= 99 && (
                      <div style={{ marginTop: '0.5rem', borderTop: '1px dashed #ff003c', paddingTop: '0.5rem', display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                        <span style={{ color: '#ff003c', fontWeight: 'bold' }}>[WOLFGANG WALRUS]</span>
                        <span style={{ color: '#ff4d79', fontStyle: 'italic' }}>"100% lock? Haha, on-chain never forgets."</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE EVENT MODAL */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="matrix-panel" style={{ width: '500px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#000' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>&gt; INITIALIZE_NEW_EVENT</h3>
            
            <div>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>EVENT TITLE:</label>
              <input className="input-field" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} placeholder="e.g. Worlds 2026 Knockout" />
            </div>

            <div>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>EVENT TYPE:</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className={`btn-secondary ${newEventType === 'bracket' ? 'active' : ''}`} onClick={() => setNewEventType('bracket')} style={{ flex: 1 }}>8-Team Bracket</button>
                <button className={`btn-secondary ${newEventType === 'list' ? 'active' : ''}`} onClick={() => setNewEventType('list')} style={{ flex: 1 }}>Match List</button>
              </div>
            </div>

            <div>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>
                {newEventType === 'bracket' ? 'TEAMS (Comma separated, exactly 8):' : 'MATCHES (One per line, format: Team A vs Team B):'}
              </label>
              <textarea 
                className="input-field" 
                rows={5} 
                value={newEventData} 
                onChange={e => setNewEventData(e.target.value)} 
                placeholder={newEventType === 'bracket' ? "T1, GenG, WBG, BLG, JDG, KT, LNG, NRG" : "BTC hits $150k vs ETH hits $8k\nSUI flips SOL vs SOL stays ahead"}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>CANCEL</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleCreateEvent} disabled={isSending}>
                {isSending ? 'PUBLISHING...' : 'PUBLISH EVENT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
