import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Settings,
  Trash2,
  Layers,
  RefreshCw,
  FolderOpen,
  UploadCloud,
  ChevronRight
} from 'lucide-react';

import UploadPDF from './components/UploadPDF';
import ChatBox from './components/ChatBox';
import ApiKeyModal from './components/ApiKeyModal';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('ai_pdf_reader_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return { provider: 'gemini', apiKey: '', model: 'gemini-1.5-flash' };
  });

  const fetchDocuments = useCallback(async () => {
    setIsLoadingDocs(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
        if (data.length > 0) {
          setActiveDocument(prev => prev || 'all');
        } else {
          setActiveDocument(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/documents');
        if (res.ok && !ignore) {
          const data = await res.json();
          setDocuments(data);
          if (data.length > 0) setActiveDocument(prev => prev || 'all');
          else setActiveDocument(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!ignore) setIsLoadingDocs(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, []);

  const handleSaveConfig = (newConfig) => {
    setConfig(newConfig);
    localStorage.setItem('ai_pdf_reader_config', JSON.stringify(newConfig));
  };

  const handleUploadSuccess = (data) => {
    fetchDocuments();
    setActiveDocument(data.filename);
    setShowUpload(false);
  };

  const handleDeleteDocument = async (filename, e) => {
    e.stopPropagation();
    if (!confirm(`Delete "${filename}"?`)) return;
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/documents/${encodeURIComponent(filename)}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.name !== filename));
        if (activeDocument === filename) {
          setActiveDocument(documents.length > 1 ? 'all' : null);
        }
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to delete document.');
      }
    } catch {
      alert('Failed to connect to the backend server.');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const isKeyConfigured = Boolean(config.apiKey);

  return (
    <div className="app-shell">

      {/* ─── SIDEBAR ─── */}
      <aside className="sidebar">

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-mark">
            <Layers size={16} color="#fff" />
          </div>
          <div>
            <div className="logo-text-primary">DocuSense</div>
            <div className="logo-text-badge">RAG AI</div>
          </div>
        </div>

        {/* Library header */}
        <div style={{ padding: '14px 16px 6px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FolderOpen size={12} color="var(--text-muted)" />
              <span className="sidebar-section-label">Library</span>
            </div>
            <button
              className="btn-icon"
              onClick={fetchDocuments}
              title="Refresh"
              style={{ width: 24, height: 24, borderRadius: 6 }}
            >
              <RefreshCw size={11} />
            </button>
          </div>
        </div>

        {/* Document list */}
        <div className="sidebar-doc-list">
          {isLoadingDocs && documents.length === 0 ? (
            <div style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              <div className="animate-spin-slow" style={{ display: 'inline-block', marginBottom: 8 }}>
                <RefreshCw size={16} />
              </div>
              <p>Loading…</p>
            </div>
          ) : documents.length === 0 ? (
            <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              <FolderOpen size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              <p>No documents yet</p>
            </div>
          ) : (
            <>
              {/* All Docs button */}
              <div
                className={`doc-item ${activeDocument === 'all' ? 'active' : ''}`}
                onClick={() => setActiveDocument('all')}
              >
                <div className="doc-icon">
                  <Layers size={13} color={activeDocument === 'all' ? '#818cf8' : 'var(--text-muted)'} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: activeDocument === 'all' ? '#c7d2fe' : 'var(--text-secondary)', lineHeight: 1.3 }}>
                    All Documents
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                    {documents.length} {documents.length === 1 ? 'file' : 'files'} indexed
                  </div>
                </div>
                {activeDocument === 'all' && (
                  <ChevronRight size={12} color="#818cf8" style={{ flexShrink: 0 }} />
                )}
              </div>

              <div className="divider" style={{ margin: '6px 4px' }} />

              {documents.map((doc, idx) => (
                <div
                  key={idx}
                  className={`doc-item ${activeDocument === doc.name ? 'active' : ''}`}
                  onClick={() => setActiveDocument(doc.name)}
                >
                  <div className="doc-icon">
                    <FileText size={13} color={activeDocument === doc.name ? '#818cf8' : 'var(--text-muted)'} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: activeDocument === doc.name ? '#c7d2fe' : 'var(--text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.3
                      }}
                      title={doc.name}
                    >
                      {doc.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                      {doc.pages} {doc.pages === 1 ? 'page' : 'pages'} · {formatFileSize(doc.size)}
                    </div>
                  </div>
                  <button
                    className="doc-delete-btn"
                    onClick={(e) => handleDeleteDocument(doc.name, e)}
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer: Upload + Settings */}
        <div className="sidebar-footer">
          <button
            className="btn-primary"
            style={{ width: '100%', marginBottom: 8 }}
            onClick={() => setShowUpload(v => !v)}
          >
            <UploadCloud size={14} />
            {showUpload ? 'Hide Upload' : 'Upload PDF'}
          </button>
          <button
            className="btn-ghost"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => setIsConfigOpen(true)}
          >
            <Settings size={13} />
            Settings
            <span className={`status-dot ${isKeyConfigured ? 'online' : 'offline'}`} style={{ marginLeft: 'auto' }} />
          </button>
        </div>
      </aside>

      {/* ─── MAIN WORKSPACE ─── */}
      <div className="workspace">

        {/* Workspace header */}
        <header className="workspace-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeDocument ? (
              <div className="scope-badge">
                {activeDocument === 'all' ? (
                  <Layers size={11} />
                ) : (
                  <FileText size={11} />
                )}
                <span>
                  {activeDocument === 'all' ? 'All Documents' : activeDocument}
                </span>
              </div>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No document selected</span>
            )}
            {activeDocument && (
              <div className="rag-badge">
                <span className="live-dot" />
                RAG Active
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Powered by <span style={{ color: 'var(--accent-indigo)', fontWeight: 600 }}>{config.provider}</span>
            </span>
          </div>
        </header>

        {/* Upload panel (slide-in) */}
        {showUpload && (
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(99,102,241,0.03)',
            animation: 'fadeIn 0.22s ease'
          }}>
            <UploadPDF onUploadSuccess={handleUploadSuccess} compact />
          </div>
        )}

        {/* Chat or empty state */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeDocument ? (
            <ChatBox activeDocument={activeDocument} config={config} />
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 24px',
              textAlign: 'center',
              gap: 20
            }}>
              <div className="empty-icon-wrap">
                <Layers size={30} color="#818cf8" strokeWidth={1.5} />
              </div>

              <div style={{ maxWidth: 360 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, letterSpacing: -0.4 }}>
                  Your workspace is ready
                </h2>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  Upload a PDF to get started. DocuSense will index it locally using FAISS embeddings so you can chat with it instantly.
                </p>
              </div>

              <button
                className="btn-primary"
                style={{ padding: '10px 22px', fontSize: 13.5 }}
                onClick={() => setShowUpload(true)}
              >
                <UploadCloud size={15} />
                Upload your first PDF
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 380, width: '100%', marginTop: 4 }}>
                {[
                  { color: '#818cf8', title: 'Local FAISS Index', desc: 'Documents stay on your machine — never sent to the cloud.' },
                  { color: '#06b6d4', title: 'Source Citations', desc: 'Every answer links back to the exact page and excerpt.' },
                  { color: '#a78bfa', title: 'Multi-Doc Search', desc: 'Query across your entire library simultaneously.' },
                  { color: '#34d399', title: 'Any LLM Provider', desc: 'Works with Gemini, OpenAI, Anthropic or local Ollama.' }
                ].map((f, i) => (
                  <div key={i} className="feature-card">
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: f.color, marginBottom: 8 }} />
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{f.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {isConfigOpen && (
        <ApiKeyModal
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          onSave={handleSaveConfig}
          currentConfig={config}
        />
      )}
    </div>
  );
}
