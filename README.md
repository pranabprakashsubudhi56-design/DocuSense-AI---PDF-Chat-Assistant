# DocuSense — AI PDF Reader

A **local-first, privacy-focused** AI PDF reader powered by RAG (Retrieval Augmented Generation). Upload any PDF, and instantly chat with it using your preferred LLM provider — all vector indexing happens locally on your machine via FAISS.

![DocuSense](https://img.shields.io/badge/RAG-FAISS-6366f1?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)

---

## ✨ Features

- 📄 **PDF Parsing** — Extracts and chunks text with smart paragraph/sentence boundary detection
- 🧠 **Local FAISS Vector Index** — Embeddings built with `sentence-transformers`, stored 100% on-device
- 💬 **Multi-Provider LLM Chat** — Gemini, OpenAI, Anthropic, Ollama, or a fully offline local model
- 🔍 **Source Citations** — Every answer links back to the exact page and excerpt
- 📚 **Multi-Doc Search** — Query across your entire library simultaneously
- 🎨 **Premium SaaS UI** — Dark-mode glassmorphism design built with React + Vite + Tailwind v4

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│              React Frontend (Vite)           │
│  Sidebar │ Chat UI │ Upload │ Settings Modal │
└──────────────────┬──────────────────────────┘
                   │ REST API (FastAPI)
┌──────────────────▼──────────────────────────┐
│              Python Backend                  │
│  pdf_parser.py  │  embeddings.py  │ chat.py  │
│       ↓               ↓                      │
│  Text chunks    FAISS index (.faiss)          │
└─────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- A Gemini API key (free tier) **or** run fully offline

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/ai-pdf-reader.git
cd ai-pdf-reader
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your API key (optional — Gemini has a free tier)
uvicorn main:app --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🔑 LLM Provider Setup

| Provider | Key Required | Notes |
|---|---|---|
| **Google Gemini** | Optional (free tier) | Recommended for getting started |
| **Local Offline** | ❌ None | Uses `deepset/tinyroberta-squad2` via HuggingFace |
| **Ollama** | ❌ None | Requires [Ollama](https://ollama.ai) running locally |
| **OpenAI** | ✅ Yes | GPT-4o-mini and others |
| **Anthropic** | ✅ Yes | Claude 3.5 Sonnet and others |

You can also configure keys via the `.env` file on the backend — they act as fallbacks when no key is provided in the UI.

---

## 📁 Project Structure

```
ai-pdf-reader/
├── backend/
│   ├── main.py           # FastAPI app & routes
│   ├── pdf_parser.py     # PDF text extraction & chunking
│   ├── embeddings.py     # FAISS indexing & similarity search
│   ├── chat.py           # LLM provider integrations
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main SaaS layout
│   │   ├── index.css         # Design system
│   │   └── components/
│   │       ├── ChatBox.jsx       # Chat interface
│   │       ├── UploadPDF.jsx     # File upload
│   │       └── ApiKeyModal.jsx   # Settings modal
│   └── package.json
└── data/                 # FAISS indices stored here (gitignored)
```

---

## 🔒 Privacy

All vector embeddings and FAISS indices are stored locally in the `data/` directory. PDF content is **never** sent to any server unless you explicitly use a cloud LLM provider for the chat step.

---

## 📄 License

MIT
