import os
import json
from pathlib import Path
import numpy as np
import faiss
from typing import List, Dict, Any, Optional

# Compute absolute path to data directory
BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DATA_DIR = os.path.join(BASE_DIR, "data")

class VectorStore:
    def __init__(self, storage_dir: Optional[str] = None):
        self.storage_dir = storage_dir or DEFAULT_DATA_DIR
        self.indices_dir = os.path.join(self.storage_dir, "indices")
        os.makedirs(self.indices_dir, exist_ok=True)
        
        # Eagerly load model on startup so that uploads are fast
        from sentence_transformers import SentenceTransformer
        print("Loading local SentenceTransformer model ('all-MiniLM-L6-v2')...")
        self._model = SentenceTransformer('all-MiniLM-L6-v2')
        print("SentenceTransformer model loaded successfully.")

    def _get_model(self):
        return self._model

    def _get_paths(self, filename: str) -> tuple[str, str]:
        # Escape filename to prevent directory traversal or invalid characters
        safe_filename = "".join([c if c.isalnum() or c in ['.', '_', '-'] else '_' for c in filename])
        faiss_path = os.path.join(self.indices_dir, f"{safe_filename}.faiss")
        meta_path = os.path.join(self.indices_dir, f"{safe_filename}.json")

        # Fallback check if existing index was saved with or without .pdf
        if not os.path.exists(faiss_path):
            if not safe_filename.endswith(".pdf"):
                alt_faiss = os.path.join(self.indices_dir, f"{safe_filename}.pdf.faiss")
                alt_meta = os.path.join(self.indices_dir, f"{safe_filename}.pdf.json")
                if os.path.exists(alt_faiss):
                    return alt_faiss, alt_meta
            else:
                alt_base = safe_filename[:-4]
                alt_faiss = os.path.join(self.indices_dir, f"{alt_base}.faiss")
                alt_meta = os.path.join(self.indices_dir, f"{alt_base}.json")
                if os.path.exists(alt_faiss):
                    return alt_faiss, alt_meta

        return faiss_path, meta_path

    def create_index_for_pdf(self, filename: str, chunks: List[Dict[str, Any]]) -> None:
        """
        Embeds document chunks and saves them in a local FAISS index alongside metadata.
        """
        if not chunks:
            return

        # 1. Extract texts
        texts = [chunk["text"] for chunk in chunks]

        # 2. Compute embeddings
        model = self._get_model()
        embeddings = model.encode(texts, show_progress_bar=False)
        embeddings = np.array(embeddings, dtype=np.float32)

        # 3. Create FAISS index
        dimension = embeddings.shape[1]
        # Using L2 distance index
        index = faiss.IndexFlatL2(dimension)
        index.add(embeddings)

        # 4. Save to files
        faiss_path, meta_path = self._get_paths(filename)
        faiss.write_index(index, faiss_path)
        
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump({
                "filename": filename,
                "chunks": chunks
            }, f, ensure_ascii=False, indent=2)

    def list_documents(self) -> List[str]:
        """
        Lists all document names that have been indexed.
        Preserves original filenames by reading from metadata.
        """
        docs = []
        if not os.path.exists(self.indices_dir):
            return docs

        for file in os.listdir(self.indices_dir):
            if file.endswith(".faiss"):
                base_name = file[:-6]
                meta_path = os.path.join(self.indices_dir, f"{base_name}.json")
                doc_name = base_name
                if os.path.exists(meta_path):
                    try:
                        with open(meta_path, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            if isinstance(data, dict) and "filename" in data:
                                doc_name = data["filename"]
                            elif isinstance(data, list) and len(data) > 0 and "filename" in data[0]:
                                doc_name = data[0]["filename"]
                    except Exception:
                        pass
                if doc_name not in docs:
                    docs.append(doc_name)
        return docs

    def delete_document(self, filename: str) -> bool:
        """
        Deletes the FAISS index and metadata for a specific document.
        """
        faiss_path, meta_path = self._get_paths(filename)
        deleted = False
        if os.path.exists(faiss_path):
            os.remove(faiss_path)
            deleted = True
        if os.path.exists(meta_path):
            os.remove(meta_path)
            deleted = True
        return deleted

    def search(self, query: str, filename: Optional[str] = None, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Searches for chunks similar to the query.
        If filename is specified, searches only in that document.
        If filename is None or 'all', searches across all indexed documents.
        """
        model = self._get_model()
        query_embedding = model.encode([query])
        query_embedding = np.array(query_embedding, dtype=np.float32)

        all_results = []

        # Determine which files to search
        target_files = []
        if filename and filename != "all":
            faiss_path, meta_path = self._get_paths(filename)
            if os.path.exists(faiss_path) and os.path.exists(meta_path):
                target_files.append((filename, faiss_path, meta_path))
        else:
            # Search all documents directly by scanning indices directory
            if os.path.exists(self.indices_dir):
                for file in os.listdir(self.indices_dir):
                    if file.endswith(".faiss"):
                        base_name = file[:-6]
                        faiss_p = os.path.join(self.indices_dir, file)
                        meta_p = os.path.join(self.indices_dir, f"{base_name}.json")
                        if os.path.exists(faiss_p) and os.path.exists(meta_p):
                            target_files.append((base_name, faiss_p, meta_p))

        # Query each target index
        for doc_name, faiss_path, meta_path in target_files:
            try:
                index = faiss.read_index(faiss_path)
                with open(meta_path, "r", encoding="utf-8") as f:
                    raw_data = json.load(f)

                # Support both new dict format and legacy list format
                if isinstance(raw_data, dict):
                    chunks = raw_data.get("chunks", [])
                elif isinstance(raw_data, list):
                    chunks = raw_data
                else:
                    chunks = []

                # Search index
                k = min(top_k, len(chunks))
                if k == 0:
                    continue
                    
                distances, indices = index.search(query_embedding, k)

                # Collect results
                for dist, idx in zip(distances[0], indices[0]):
                    if idx != -1 and idx < len(chunks):
                        chunk_info = chunks[idx].copy()
                        chunk_info["distance"] = float(dist)
                        # Higher score = more relevant (convert L2 distance to score)
                        chunk_info["similarity"] = 1.0 / (1.0 + float(dist))
                        all_results.append(chunk_info)
            except Exception as e:
                print(f"Error searching index for {doc_name}: {e}")

        # If searching across multiple documents, sort results and pick top_k
        all_results.sort(key=lambda x: x["similarity"], reverse=True)
        return all_results[:top_k]

# Global instance for use in FastAPI router
vector_store = VectorStore()
