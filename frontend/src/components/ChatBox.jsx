import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send, Bot, User, FileText,
  ChevronDown, ChevronUp, AlertCircle, Sparkles, MessageSquare
} from 'lucide-react';

export default function ChatBox({ activeDocument, config }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const scopeDesc =
      activeDocument === 'all'
        ? 'all indexed documents'
        : `**${activeDocument}**`;
    setMessages([
      {
        role: 'assistant',
        content: activeDocument
          ? `Hello! I've analyzed ${scopeDesc}. Ask me anything about its contents — I'll find the exact information for you.`
          : 'Welcome! Select a document to start chatting.',
        timestamp: new Date()
      }
    ]);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [activeDocument]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage.content,
          filename: activeDocument || 'all',
          provider: config.provider,
          apiKey: config.apiKey || null,
          model: config.model || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error communicating with LLM.');

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
        timestamp: new Date()
      }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        role: 'system_error',
        content: err.message || 'An error occurred.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const mdComponents = {
    p: ({ ...props }) => <p {...props} style={{ marginBottom: 6, lineHeight: 1.7 }} />,
    h3: ({ ...props }) => (
      <h3 {...props} style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', margin: '12px 0 4px' }} />
    ),
    ul: ({ ...props }) => <ul {...props} style={{ paddingLeft: 18, marginBottom: 6 }} />,
    ol: ({ ...props }) => <ol {...props} style={{ paddingLeft: 18, marginBottom: 6 }} />,
    li: ({ ...props }) => <li {...props} style={{ marginBottom: 2, color: '#cbd5e1' }} />,
    strong: ({ ...props }) => <strong {...props} style={{ fontWeight: 600, color: '#f1f5f9' }} />,
    code: ({ ...props }) => (
      <code
        {...props}
        style={{
          background: 'rgba(255,255,255,0.08)',
          padding: '1px 5px',
          borderRadius: 4,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          color: '#67e8f9'
        }}
      />
    )
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Chat feed */}
      <div className="chat-feed">
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-muted)', paddingTop: 60 }}>
            <MessageSquare size={36} strokeWidth={1} />
            <p style={{ fontSize: 13 }}>No messages yet. Ask a question!</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`message-row ${msg.role === 'user' ? 'user-row' : ''}`}
          >
            {/* Avatar */}
            {msg.role !== 'user' && msg.role !== 'system_error' && (
              <div className="avatar ai-avatar">
                <Bot size={15} color="#818cf8" />
              </div>
            )}
            {msg.role === 'user' && (
              <div className="avatar user-avatar">
                <User size={15} color="#a5b4fc" />
              </div>
            )}

            {/* Bubble */}
            <div>
              {msg.role === 'user' ? (
                <div className="message-bubble user-bubble">
                  <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                </div>
              ) : msg.role === 'system_error' ? (
                <div className="message-bubble error-bubble" style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 13 }}>{msg.content}</span>
                </div>
              ) : (
                <div className="message-bubble ai-bubble">
                  <div style={{ color: 'var(--text-secondary)' }}>
                    <ReactMarkdown components={mdComponents}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <SourceAccordion sources={msg.sources} />
                  )}
                </div>
              )}

              {/* Timestamp */}
              <div style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                marginTop: 4,
                paddingLeft: msg.role === 'user' ? 0 : 2,
                textAlign: msg.role === 'user' ? 'right' : 'left'
              }}>
                {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="message-row">
            <div className="avatar ai-avatar">
              <Bot size={15} color="#818cf8" />
            </div>
            <div>
              <div className="typing-bubble">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>Thinking…</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="chat-input-area">
        {/* Context pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 20,
            background: 'rgba(99,102,241,0.07)',
            border: '1px solid rgba(99,102,241,0.16)',
            fontSize: 11, color: '#a5b4fc', fontWeight: 500
          }}>
            <Sparkles size={10} />
            {activeDocument === 'all' ? 'All documents' : activeDocument}
          </div>
        </div>

        <form onSubmit={handleSend}>
          <div className="chat-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isLoading}
              placeholder={
                !activeDocument
                  ? 'Select a document to begin…'
                  : `Ask anything about ${activeDocument === 'all' ? 'your documents' : activeDocument}…`
              }
            />
            <button
              type="submit"
              className="send-btn"
              disabled={isLoading || !input.trim() || !activeDocument}
              title="Send"
            >
              <Send size={15} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Source Accordion ── */
function SourceAccordion({ sources }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
      <button
        onClick={() => setIsOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 11.5, fontWeight: 600, color: '#818cf8',
          padding: 0, transition: 'color 0.15s'
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#a5b4fc'}
        onMouseLeave={e => e.currentTarget.style.color = '#818cf8'}
      >
        <FileText size={12} />
        {sources.length} source{sources.length !== 1 ? 's' : ''} referenced
        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {isOpen && (
        <div className="animate-fade-in" style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
          {sources.map((src, i) => (
            <div key={i} className="source-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                  {src.filename}
                </span>
                <span className="tag tag-cyan" style={{ flexShrink: 0 }}>
                  Page {src.page}
                </span>
              </div>
              <p className="source-excerpt">"{src.text}"</p>
              {src.similarity && (
                <div style={{ marginTop: 6, textAlign: 'right', fontSize: 10, color: 'var(--text-muted)' }}>
                  {(src.similarity * 100).toFixed(0)}% match
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
