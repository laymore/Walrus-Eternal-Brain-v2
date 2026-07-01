import React, { useState, useEffect } from 'react';
import { useCurrentAccount } from '../lib/dappKitMock';
import { fetchFileMetadata, publishFileMetadata, type FileEntry } from '../lib/memwal';
import { useToast } from '../lib/toast';
import { File, Upload, AlertTriangle } from 'lucide-react';
import { WalletIdentity } from './WalletIdentity';
export const NS_03_FileVault: React.FC = () => {
  const currentAccount = useCurrentAccount();
  const toast = useToast();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [description, setDescription] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { loadFiles(); }, []);

  const loadFiles = async () => {
    const data = await fetchFileMetadata();
    setFiles(data);
  };

  const handleRegister = async () => {
    if (!currentAccount) return toast('error', 'Connect wallet first');
    if (!fileName.trim()) return toast('error', 'File name required');
    setIsUploading(true);
    try {
      // NOTE: real Walrus blob upload (@mysten/walrus) requires a paid SUI tx
      // for storage. This MVP only registers metadata + a placeholder blob id.
      // Replace `blobId` with the actual id returned from WalrusClient.writeBlob().
      await publishFileMetadata({
        fileName: fileName.trim(),
        fileSize: 0,
        blobId: `unminted_${crypto.randomUUID()}`,
        uploader: currentAccount.address,
        description: description.trim() || '(no description)',
        timestamp: Date.now(),
      });
      toast('success', 'File metadata registered (blob upload not wired yet)');
      setShowModal(false);
      setFileName('');
      setDescription('');
      await loadFiles();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast('error', `Register failed: ${msg}`);
    }
    setIsUploading(false);
  };

  return (
    <div className="matrix-panel animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-matrix-dim)', paddingBottom: '0.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', textTransform: 'uppercase' }}>&gt; FILE_VAULT (NS_03)</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0', textTransform: 'uppercase', fontSize: '0.8rem' }}>
            // ARCHIVE METADATA STORAGE — BLOB UPLOAD STUB_
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => currentAccount && setShowModal(true)}
          disabled={!currentAccount}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: currentAccount ? 1 : 0.5, cursor: currentAccount ? 'pointer' : 'not-allowed' }}
        >
          <Upload size={16} /> {currentAccount ? 'REGISTER_FILE' : 'CONNECT_REQUIRED'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', fontSize: '0.8rem', color: '#fbbf24' }}>
        <AlertTriangle size={14} />
        <span>Walrus blob upload (Seal + storage payment) not yet wired. Metadata-only for now.</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
        {files.length === 0 && <p style={{ color: 'var(--text-dim)', fontStyle: 'italic', gridColumn: '1 / -1' }}>// No files found in sector...</p>}
        {files.map((file, i) => (
          <div key={i} style={{ padding: '1rem', background: 'var(--bg-matrix)', border: '1px solid var(--border-matrix-dim)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              <File size={24} />
              <span style={{ fontWeight: 700, wordBreak: 'break-all' }}>{file.fileName}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {file.fileSize > 0 && <span>SIZE: {(file.fileSize / 1024).toFixed(2)} KB</span>}
              <span>UPLOADER: [<WalletIdentity address={file.uploader} />]</span>
              <span>DATE: {new Date(file.timestamp).toLocaleString()}</span>
              <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>BLOB: {file.blobId.slice(0, 24)}...</span>
              <p style={{ color: 'var(--text-primary)', marginTop: '0.5rem', padding: '0.5rem', borderLeft: '2px solid var(--border-matrix-dim)' }}>{file.description}</p>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="matrix-panel" style={{ padding: '2rem', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', textTransform: 'uppercase' }}>&gt; REGISTER_FILE_METADATA</h2>
            <input className="input-field" placeholder="FILE_NAME (e.g. paper.pdf)" value={fileName} onChange={e => setFileName(e.target.value)} style={{ marginBottom: '1rem' }} />
            <textarea className="input-field" placeholder="DESCRIPTION" value={description} onChange={e => setDescription(e.target.value)} style={{ height: '100px', resize: 'vertical', marginBottom: '1.5rem' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>ABORT</button>
              <button className="btn-primary" onClick={handleRegister} disabled={isUploading}>{isUploading ? 'REGISTERING...' : 'COMMIT'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
