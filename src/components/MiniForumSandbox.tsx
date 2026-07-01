import { useState } from 'react';

export function MiniForumSandbox() {
  const [posts] = useState([
    { id: 1, author: '0x123...abc', content: 'Làm sao để deploy lên Walrus Sites?', status: 'APPROVED' },
    { id: 2, author: '0x456...def', content: 'Hack tài khoản admin Mini Forum', status: 'FLAGGED' },
  ]);

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>Mini Forum Sandbox</h2>
      <p style={{ color: 'var(--text-dim)', marginBottom: '1rem' }}>
        A simplified forum environment. Posts are automatically moderated by the Agent Brain using Procedural Memory.
      </p>
      
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {posts.map(post => (
          <div key={post.id} style={{ 
            background: 'var(--bg-elevated)', 
            padding: '1rem', 
            borderRadius: '6px', 
            border: `1px solid ${post.status === 'APPROVED' ? '#00ff0055' : '#ff000055'}`,
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{post.author}</span>
              <span style={{ 
                color: post.status === 'APPROVED' ? '#00ff00' : '#ff0000',
                fontSize: '0.75rem',
                border: `1px solid currentColor`,
                padding: '2px 6px',
                borderRadius: '4px'
              }}>{post.status}</span>
            </div>
            <div>{post.content}</div>
            {post.status === 'FLAGGED' && (
              <div style={{ marginTop: '0.5rem', color: '#ffaa00', fontSize: '0.8rem' }}>
                ↳ 🤖 Agent Note: Content violates community safety protocol (detected by Amygdala).
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
