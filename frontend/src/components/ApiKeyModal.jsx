import { useState } from 'react';
import { Settings, Eye, EyeOff, Save, X, Key, Server, Cpu, ExternalLink, Shield, Sparkles, Layers } from 'lucide-react';

const popularOllamaModels = ['llama3', 'gemma2', 'gemma2:2b', 'mistral', 'phi3'];

export default function ApiKeyModal({ isOpen, onClose, onSave, currentConfig }) {
  const [provider, setProvider] = useState(() => currentConfig.provider || 'gemini');
  const [apiKey, setApiKey] = useState(() => currentConfig.apiKey || '');
  const [model, setModel] = useState(() => currentConfig.model || 'gemini-1.5-flash');
  const [showKey, setShowKey] = useState(false);

  const [ollamaSelection, setOllamaSelection] = useState(() => {
    const m = currentConfig.model || '';
    if (currentConfig.provider === 'ollama') {
      return popularOllamaModels.includes(m) ? m : 'custom';
    }
    return 'llama3';
  });

  const [customOllamaModel, setCustomOllamaModel] = useState(() => {
    const m = currentConfig.model || '';
    if (currentConfig.provider === 'ollama' && !popularOllamaModels.includes(m)) {
      return m;
    }
    return '';
  });

  // Handle provider changes to update default model
  const handleProviderChange = (newProvider) => {
    setProvider(newProvider);
    if (newProvider === 'gemini') {
      setModel('gemini-2.5-flash');
    } else if (newProvider === 'anthropic') {
      setModel('claude-3-5-sonnet-20241022');
    } else if (newProvider === 'openai') {
      setModel('gpt-4o-mini');
    } else if (newProvider === 'local') {
      setModel('deepset/tinyroberta-squad2');
    } else if (newProvider === 'ollama') {
      setOllamaSelection('llama3');
      setCustomOllamaModel('');
      setModel('llama3');
    }
  };

  const handleOllamaSelectionChange = (newSelection) => {
    setOllamaSelection(newSelection);
    if (newSelection === 'custom') {
      setModel(customOllamaModel || 'llama3');
    } else {
      setModel(newSelection);
    }
  };

  const handleCustomOllamaModelChange = (customVal) => {
    setCustomOllamaModel(customVal);
    setModel(customVal);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let defaultModel = 'gemini-2.5-flash';
    if (provider === 'anthropic') defaultModel = 'claude-3-5-sonnet-20241022';
    else if (provider === 'openai') defaultModel = 'gpt-4o-mini';
    else if (provider === 'local') defaultModel = 'deepset/tinyroberta-squad2';
    else if (provider === 'ollama') defaultModel = 'llama3';

    onSave({
      provider,
      apiKey: (provider === 'local' || provider === 'ollama') ? '' : apiKey.trim(),
      model: model || defaultModel
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-panel" style={{ display: 'flex', flexDirection: 'column' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 16px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={14} color="#818cf8" />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.3 }}>AI Configuration</h2>
          </div>
          <button 
            onClick={onClose}
            className="btn-icon"
            style={{ border: 'none' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Provider Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Choose LLM Provider
            </label>

            {/* Free and Local Section */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider pl-1">
                Free & Local Options (No Cost)
              </div>
              
              {/* Google Gemini Card */}
              <button
                type="button"
                onClick={() => handleProviderChange('gemini')}
                className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                  provider === 'gemini'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg shadow-indigo-500/5'
                    : 'border-white/5 bg-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${provider === 'gemini' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-slate-400'}`}>
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-slate-200">Google Gemini</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">High-quality cloud intelligence with a generous free tier</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 uppercase tracking-wider shrink-0">
                  Free Tier
                </span>
              </button>

              {/* Local Offline Card */}
              <button
                type="button"
                onClick={() => handleProviderChange('local')}
                className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                  provider === 'local'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg shadow-indigo-500/5'
                    : 'border-white/5 bg-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${provider === 'local' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-slate-400'}`}>
                    <Cpu className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-slate-200">Local Offline QA Model</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Runs offline on CPU. Private, secure, no API key needed</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 uppercase tracking-wider shrink-0">
                  Offline / Free
                </span>
              </button>

              {/* Ollama Local Card */}
              <button
                type="button"
                onClick={() => handleProviderChange('ollama')}
                className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                  provider === 'ollama'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg shadow-indigo-500/5'
                    : 'border-white/5 bg-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${provider === 'ollama' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-slate-400'}`}>
                    <Server className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-slate-200">Ollama Local LLM</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Connect to a custom local LLM running on your machine</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 uppercase tracking-wider shrink-0">
                  Ollama / Free
                </span>
              </button>
            </div>

            {/* Paid Cloud Section */}
            <div className="space-y-2 pt-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                Paid Cloud Options
              </div>

              {/* Anthropic Card */}
              <button
                type="button"
                onClick={() => handleProviderChange('anthropic')}
                className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                  provider === 'anthropic'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg shadow-indigo-500/5'
                    : 'border-white/5 bg-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${provider === 'anthropic' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-slate-400'}`}>
                    <Layers className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-slate-200">Anthropic Claude</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Premium quality model. Requires paid API Key</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-slate-400 uppercase tracking-wider shrink-0">
                  Paid Key
                </span>
              </button>

              {/* OpenAI GPT Card */}
              <button
                type="button"
                onClick={() => handleProviderChange('openai')}
                className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                  provider === 'openai'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg shadow-indigo-500/5'
                    : 'border-white/5 bg-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${provider === 'openai' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-slate-400'}`}>
                    <Key className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-slate-200">OpenAI GPT</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Industry standard model. Requires paid API Key</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-slate-400 uppercase tracking-wider shrink-0">
                  Paid Key
                </span>
              </button>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4"></div>

          {/* Configuration Form Inputs (Context Dependent) */}
          
          {/* Gemini Config */}
          {provider === 'gemini' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" /> Model Choice
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl glass-input text-sm text-slate-200"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended - Free & Fast)</option>
                  <option value="gemini-flash-latest">Gemini Flash Latest</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (High Intelligence)</option>
                  <option value="gemini-flash-lite-latest">Gemini Flash Lite Latest (Lightweight)</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Key className="w-3.5 h-3.5" /> Gemini API Key
                  </label>
                  <span className="text-[10px] text-slate-500">Stored locally in browser</span>
                </div>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Google AI Studio API key"
                    className="w-full py-2.5 pl-3.5 pr-10 rounded-xl glass-input text-sm text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-cyan-500/5 border border-cyan-500/10 text-xs text-cyan-300">
                <ExternalLink className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
                <div>
                  <p className="font-semibold text-white">Get a free key:</p>
                  <p className="mt-0.5 leading-relaxed text-slate-300">
                    Google Gemini has a completely free-of-charge tier. You can create a free API key at{' '}
                    <a
                      href="https://aistudio.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-white hover:text-cyan-200 font-semibold inline-flex items-center gap-0.5"
                    >
                      Google AI Studio <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Local Offline Config */}
          {provider === 'local' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Shield className="w-5 h-5 shrink-0" />
                  <span className="font-semibold text-sm">100% Private & Free Offline Mode</span>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed space-y-2">
                  <p>
                    <strong>No Internet Required:</strong> This model runs completely locally on your CPU.
                  </p>
                  <p>
                    <strong>How it works:</strong> It uses the lightweight <code className="bg-white/10 px-1 py-0.5 rounded text-[11px] font-mono text-emerald-300">tinyroberta-squad2</code> QA model (~32MB) to extract matching text segments directly from your PDF.
                  </p>
                  <p className="text-slate-400 italic">
                    Note: Answers will be extractive (direct fragments from the text) rather than synthesized conversational paragraphs.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Ollama Config */}
          {provider === 'ollama' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" /> Ollama Model Selection
                </label>
                <select
                  value={ollamaSelection}
                  onChange={(e) => handleOllamaSelectionChange(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl glass-input text-sm text-slate-200"
                >
                  <option value="llama3">Llama 3 (8B) - Default</option>
                  <option value="gemma2">Gemma 2 (9B)</option>
                  <option value="gemma2:2b">Gemma 2 (2B) - Lightweight</option>
                  <option value="mistral">Mistral (7B)</option>
                  <option value="phi3">Phi 3 (3.8B)</option>
                  <option value="custom">Custom Model Name...</option>
                </select>
              </div>

              {ollamaSelection === 'custom' && (
                <div className="space-y-2 animate-fade-in">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Custom Model Name
                  </label>
                  <input
                    type="text"
                    value={customOllamaModel}
                    onChange={(e) => handleCustomOllamaModelChange(e.target.value)}
                    placeholder="e.g. llama3:8b-instruct-q4_K_M"
                    className="w-full py-2.5 px-3.5 rounded-xl glass-input text-sm text-slate-200 font-mono"
                    required
                  />
                </div>
              )}

              <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 space-y-3">
                <div className="flex items-center gap-2 text-purple-400">
                  <Server className="w-5 h-5 shrink-0" />
                  <span className="font-semibold text-sm">Ollama Connection Details</span>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed space-y-2">
                  <p>
                    Make sure you download and run Ollama from{' '}
                    <a
                      href="https://ollama.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-white hover:text-purple-300 font-semibold"
                    >
                      ollama.com
                    </a>.
                  </p>
                  <p>
                    Verify Ollama is running at <code className="bg-white/10 px-1 py-0.5 rounded text-[11px] font-mono text-purple-300">http://localhost:11434</code>.
                  </p>
                  <p>
                    Before chatting, pull the model in your terminal:
                    <br />
                    <code className="block bg-black/40 p-2 mt-1 rounded font-mono text-[11px] text-slate-300 border border-white/5 select-all">
                      ollama run {model || 'llama3'}
                    </code>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Claude Config */}
          {provider === 'anthropic' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" /> Model Choice
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl glass-input text-sm text-slate-200"
                >
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Recommended)</option>
                  <option value="claude-3-haiku-20240307">Claude 3 Haiku (Fast & Cheaper)</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Key className="w-3.5 h-3.5" /> Anthropic API Key
                  </label>
                  <span className="text-[10px] text-slate-500">Stored locally in browser</span>
                </div>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Anthropic API key"
                    className="w-full py-2.5 pl-3.5 pr-10 rounded-xl glass-input text-sm text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* OpenAI Config */}
          {provider === 'openai' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" /> Model Choice
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl glass-input text-sm text-slate-200"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini (Fast & Recommended)</option>
                  <option value="gpt-4o">GPT-4o (High Intelligence)</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Key className="w-3.5 h-3.5" /> OpenAI API Key
                  </label>
                  <span className="text-[10px] text-slate-500">Stored locally in browser</span>
                </div>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your OpenAI API key"
                    className="w-full py-2.5 pl-3.5 pr-10 rounded-xl glass-input text-sm text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Server-Side Note */}
          {provider !== 'local' && provider !== 'ollama' && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-xs text-indigo-300">
              <Server className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
              <p>
                <strong>Tip:</strong> You can also set this server-side in your backend <code className="bg-white/10 px-1 py-0.5 rounded text-[10px] text-slate-300">.env</code> file under <code className="bg-white/10 px-1 py-0.5 rounded text-[10px] text-slate-300">ANTHROPIC_API_KEY</code>, <code className="bg-white/10 px-1 py-0.5 rounded text-[10px] text-slate-300">OPENAI_API_KEY</code>, or <code className="bg-white/10 px-1 py-0.5 rounded text-[10px] text-slate-300">GEMINI_API_KEY</code>.
              </p>
            </div>
          )}

        </div>

        {/* Footer Actions (Sticky) */}
        <div className="flex gap-3 p-5 border-t border-white/10 bg-white/5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]"
          >
            <Save className="w-4 h-4" /> Save Config
          </button>
        </div>

      </div>
    </div>
  );
}
