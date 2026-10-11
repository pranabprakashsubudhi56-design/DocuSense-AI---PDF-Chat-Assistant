import os
import sys
import shutil
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import fitz  # PyMuPDF

# Add paths to sys.path so imports work regardless of execution directory
BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Load environment variables
load_dotenv(os.path.join(BACKEND_DIR, ".env"))
load_dotenv(os.path.join(BASE_DIR, ".env"))

try:
    from backend.pdf_parser import parse_pdf
    from backend.embeddings import vector_store
    from backend.chat import query_llm
except ImportError:
    from pdf_parser import parse_pdf
    from embeddings import vector_store
    from chat import query_llm

app = FastAPI(title="AI PDF Reader API", version="1.0.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Robust absolute directories
DATA_DIR = os.path.join(BASE_DIR, "data")
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class ChatRequest(BaseModel):
    query: str
    filename: Optional[str] = None  # None or "all" to query all documents
    provider: str = "gemini"  # Default to gemini (has free tier)
    apiKey: Optional[str] = None
    model: Optional[str] = None

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    safe_filename = os.path.basename(file.filename)
    print(f"--- Uploading PDF: {safe_filename} ---")
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    # 1. Save file to disk
    try:
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # 2. Parse PDF and extract chunks
    try:
        chunks = parse_pdf(file_path)
    except Exception as e:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {str(e)}")

    if not chunks:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        raise HTTPException(status_code=400, detail="The PDF contains no extractable text.")

    # 3. Create FAISS index
    try:
        vector_store.create_index_for_pdf(safe_filename, chunks)
    except Exception as e:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Failed to create embeddings index: {str(e)}")

    return {
        "filename": safe_filename,
        "chunks_count": len(chunks),
        "message": "PDF uploaded and indexed successfully."
    }

@app.get("/api/documents")
async def list_documents():
    """
    Returns lists of indexed documents with metadata (page count, file size).
    """
    indexed_docs = vector_store.list_documents()
    docs_metadata = []
    seen = set()

    for doc_name in indexed_docs:
        if doc_name in seen:
            continue
        seen.add(doc_name)

        # Check if original file exists in uploads
        file_path = os.path.join(UPLOAD_DIR, doc_name)
        if not os.path.exists(file_path) and not doc_name.lower().endswith(".pdf"):
            alt_path = os.path.join(UPLOAD_DIR, f"{doc_name}.pdf")
            if os.path.exists(alt_path):
                file_path = alt_path
            
        file_size = 0
        pages = 0
        
        if os.path.exists(file_path):
            file_size = os.path.getsize(file_path)
            doc = None
            try:
                doc = fitz.open(file_path)
                pages = len(doc)
            except Exception:
                pages = 0
            finally:
                if doc:
                    doc.close()

        docs_metadata.append({
            "name": doc_name,
            "size": file_size,
            "pages": pages
        })

    return docs_metadata

@app.delete("/api/documents/{filename}")
async def delete_document(filename: str):
    """
    Deletes the index and original file for a specific document.
    """
    safe_name = os.path.basename(filename)
    deleted_index = vector_store.delete_document(safe_name)
    
    # Also check if file exists in uploads
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    deleted_file = False
    if os.path.exists(file_path):
        os.remove(file_path)
        deleted_file = True
    elif not safe_name.lower().endswith(".pdf"):
        alt_path = os.path.join(UPLOAD_DIR, f"{safe_name}.pdf")
        if os.path.exists(alt_path):
            os.remove(alt_path)
            deleted_file = True

    if not (deleted_index or deleted_file):
        raise HTTPException(status_code=404, detail="Document not found.")
        
    return {"message": f"Document '{safe_name}' deleted successfully."}

@app.post("/api/chat")
async def chat_with_pdf(request: ChatRequest):
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    # 1. Search vector DB for top chunks
    try:
        # Search the database. If filename is None/empty or "all", search across all documents.
        scope_filename = None if (not request.filename or request.filename == "all") else request.filename
        chunks = vector_store.search(request.query.strip(), filename=scope_filename, top_k=5)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vector search failed: {str(e)}")

    # 2. Query the LLM
    try:
        answer = query_llm(
            query=request.query.strip(),
            chunks=chunks,
            provider=request.provider,
            api_key=request.apiKey,
            model=request.model
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM API request failed: {str(e)}")

    return {
        "answer": answer,
        "sources": chunks
    }

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host=host, port=port)
