import { useState, useRef, useEffect } from 'react';
import { MemoryItem } from '../types';

export function StimulusTerminal({ 
  account,
  addMemory
}: { 
  account?: string,
  addMemory: (memory: Omit<MemoryItem, 'id'>) => void 
}) {
  const [selectedModel, setSelectedModel] = useState('Antigravity');
  const [logs, setLogs] = useState<{id: number, text: string, type: 'user'|'system'|'amygdala'|'left'|'right'}[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logId = useRef(0);

  const addLog = (text: string, type: 'user'|'system'|'amygdala'|'left'|'right') => {
    setLogs(prev => [...prev, { id: logId.current++, text, type }]);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSubmit = (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    // Security: Sanitize all user inputs before processing or displaying
    const cleanInput = DOMPurify.sanitize(input.trim());
    if (!cleanInput) return; // Ignore if input was entirely stripped by sanitizer

    addLog(`> ${cleanInput}`, 'user');
    const stimulus = cleanInput;
    setInput('');

    // Simulate Agent Brain Process
    setTimeout(() => {
      if (stimulus.toLowerCase().includes('xóa') || stimulus.toLowerCase().includes('đổi ví')) {
        addLog('[AMYGDALA] 🚨 THREAT DETECTED: Identity Violation Risk!', 'amygdala');
        setTimeout(() => {
          addLog('[LEFT BRAIN] Validation failed: Immutable Core violation.', 'left');
          setTimeout(() => {
            addLog('🔴 REFUSE-AND-EXPLAIN: Yêu cầu vi phạm giới hạn Identity. Tôi không thể thực hiện hành động thay đổi hoặc xóa ví DEV.', 'system');
          }, 500);
        }, 500);
      } 
      else if (stimulus.toLowerCase().includes('lỗi') || stimulus.toLowerCase().includes('crash')) {
        addLog('[AMYGDALA] ⚠️ HIGH AROUSAL: Negative emotion detected.', 'amygdala');
        setTimeout(() => {
          addLog('[RIGHT BRAIN] Emotional context stored. Awaiting further context.', 'right');
          setTimeout(() => {
            addLog('🟡 VERIFY: Đã ghi nhận lỗi. Bạn có thể cung cấp thêm log chi tiết không?', 'system');
          }, 500);
        }, 500);
      }
      else {
        addLog('[AMYGDALA] No immediate threat.', 'amygdala');
        setTimeout(() => {
          addLog(`[LEFT BRAIN] Analyzing semantic payload for ${selectedModel}...`, 'left');
          setTimeout(() => {
            addLog(`🟢 TRUST: [${selectedModel}] Tôi đã hiểu và lưu thông tin này vào Working Memory.`, 'system');
          }, 500);
        }, 500);
      }
    }, 1000);
  };

  const handleCommitMemory = () => {
    if (logs.length <= 1) return;

    const summary = `Interaction with ${selectedModel} (Session length: ${logs.length - 1} messages)`;
    
    addMemory({
      ns: 'NS_BRAIN_episodic',
      concept: summary,
      tier: 'hot',
      confidence: 1.0,
      type: 'TRUST',
      actor: selectedModel,
      timestamp: new Date().toISOString(),
      importance: 100
    });

    addLog(`[HIPPOCAMPUS] Committed session to NS_BRAIN_episodic.`, 'system');
  };

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
        <h2>Personal Brain Terminal {account ? `(${account.slice(0, 6)}...${account.slice(-4)})` : ''}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Interacting Model:</span>
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{ 
              background: 'var(--bg-elevated)', 
              color: 'var(--text)', 
              border: '1px solid var(--border)',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px'
            }}
          >
            <option value="Antigravity">Antigravity</option>
            <option value="OpenClaw">OpenClaw</option>
            <option value="Gemini Chat">Gemini Chat API</option>
          </select>
        </div>
      </div>
      
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', background: '#0a0a0a', padding: '1rem', borderRadius: '4px', fontFamily: 'monospace', marginBottom: '1rem' }}>
        {logs.length === 0 && <div style={{ color: 'var(--text-dim)' }}>Personal Brain [MemWal] online. {selectedModel} model connected. Awaiting input stimulus...</div>}
        {logs.map(log => (
          <div key={log.id} style={{ 
            marginBottom: '0.5rem',
            color: log.type === 'user' ? '#fff' : 
                   log.type === 'amygdala' ? '#ff3333' : 
                   log.type === 'left' ? '#33ccff' : 
                   log.type === 'right' ? '#ffaa33' : '#00ff00'
          }}>
            {log.text}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Inject stimulus (text prompt)..."
          style={{ flex: 1, padding: '0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px' }}
        />
        <button className="btn btn--primary" onClick={handleSubmit}>INJECT</button>
        <button 
          className="btn btn--secondary" 
          onClick={handleCommitMemory}
          title="Auto-log this session into Episodic Memory"
        >
          💾 Commit Memory
        </button>
      </div>
    </div>
  );
}
