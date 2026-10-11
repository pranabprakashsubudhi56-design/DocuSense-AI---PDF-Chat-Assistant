import { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export default function UploadPDF({ onUploadSuccess, compact = false }) {
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const processFile = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setStatus('error');
      setErrorMsg('Only PDF files are supported.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setStatus('error');
      setErrorMsg('File exceeds 50 MB limit.');
      return;
    }

    setStatus('uploading');
    setErrorMsg('');
    setUploadedFile(file);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to upload and index PDF.');
      setStatus('success');
      if (onUploadSuccess) onUploadSuccess(data);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'An error occurred during processing.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const reset = () => {
    setStatus('idle');
    setUploadedFile(null);
    setErrorMsg('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  /* ── Compact variant (shown inside App header panel) ── */
  if (compact) {
    return (
      <div>
        <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleChange} style={{ display: 'none' }} />

        {status === 'idle' && (
          <div
            className={`upload-zone ${dragActive ? 'drag-over' : ''}`}
            style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer' }}
            onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <UploadCloud size={17} color="#818cf8" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Drop PDF here or click to browse</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Max 50 MB · PDF only</div>
            </div>
          </div>
        )}

        {status === 'uploading' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border-muted)' }}>
            <Loader2 size={18} color="#818cf8" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Processing "{uploadedFile?.name}"…</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Building FAISS index…</div>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(52,211,153,0.05)', borderRadius: 10, border: '1px solid rgba(52,211,153,0.15)' }}>
            <CheckCircle2 size={18} color="#34d399" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#6ee7b7' }}>Indexed successfully!</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploadedFile?.name}</div>
            </div>
            <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Upload another">
              <X size={14} />
            </button>
          </div>
        )}

        {status === 'error' && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.05)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.15)' }}>
            <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fca5a5' }}>Upload failed</div>
              <div style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>{errorMsg}</div>
            </div>
            <button onClick={reset} className="btn-ghost" style={{ fontSize: 11, padding: '4px 8px', flexShrink: 0 }}>Retry</button>
          </div>
        )}
      </div>
    );
  }

  /* ── Full variant (standalone / sidebar) ── */
  return (
    <div style={{ width: '100%' }}>
      <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleChange} />

      <div
        className={`upload-zone ${dragActive ? 'drag-over' : ''}`}
        onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
        onClick={status === 'idle' ? () => inputRef.current?.click() : undefined}
        style={{ cursor: status === 'idle' ? 'pointer' : 'default' }}
      >
        {status === 'idle' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UploadCloud size={20} color="#818cf8" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>Drag & drop PDF</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>or click to browse · Max 50 MB</p>
            </div>
          </div>
        )}

        {status === 'uploading' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <Loader2 size={28} color="#818cf8" style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>Processing…</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Building embeddings &amp; index</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={28} color="#34d399" />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#6ee7b7', marginBottom: 3 }}>Indexed!</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                <FileText size={12} color="#34d399" />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploadedFile?.name}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({formatSize(uploadedFile?.size)})</span>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); reset(); }}
              className="btn-ghost"
              style={{ fontSize: 11, padding: '5px 12px' }}
            >
              Upload another
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={28} color="#f87171" />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fca5a5', marginBottom: 3 }}>Upload failed</p>
              <p style={{ fontSize: 11, color: '#f87171', padding: '6px 10px', background: 'rgba(239,68,68,0.07)', borderRadius: 8, maxWidth: 220, margin: '0 auto' }}>{errorMsg}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); reset(); }}
              className="btn-ghost"
              style={{ fontSize: 11, padding: '5px 12px', borderColor: 'rgba(239,68,68,0.2)', color: '#fca5a5' }}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
