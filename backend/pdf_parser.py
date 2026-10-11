import fitz  # PyMuPDF
import os
import re
from typing import List, Dict, Any

def parse_pdf(file_path: str, chunk_size: int = 1000, chunk_overlap: int = 150) -> List[Dict[str, Any]]:
    """
    Parses a PDF file page-by-page and chunks the text.
    Preserves page numbers (1-indexed) and metadata for each chunk.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found at {file_path}")

    doc = fitz.open(file_path)
    try:
        if doc.is_encrypted:
            if not doc.authenticate(""):
                raise ValueError("The PDF document is encrypted and password-protected.")

        chunks = []
        chunk_global_idx = 0
        filename = os.path.basename(file_path)

        for page_idx in range(len(doc)):
            page = doc[page_idx]
            page_num = page_idx + 1
            text = page.get_text("text")
            
            # Clean text
            text = clean_text(text)
            if not text.strip():
                continue
                
            # Chunk the page text
            page_chunks = split_text_into_chunks(text, chunk_size, chunk_overlap)
            
            for idx, chunk_text in enumerate(page_chunks):
                chunks.append({
                    "id": f"{filename}_p{page_num}_c{idx}",
                    "text": chunk_text,
                    "page": page_num,
                    "filename": filename,
                    "chunk_index": chunk_global_idx
                })
                chunk_global_idx += 1

        return chunks
    finally:
        doc.close()

def clean_text(text: str) -> str:
    """
    Cleans extracted PDF text by normalizing whitespace.
    """
    # Replace multiple newlines with double newlines (paragraphs)
    text = re.sub(r'\n\s*\n', '\n\n', text)
    # Replace single newlines inside paragraphs with space, keeping paragraph structure
    paragraphs = text.split('\n\n')
    cleaned_paragraphs = []
    for para in paragraphs:
        # replace single newlines and multiple spaces with a single space
        para_cleaned = re.sub(r'\s+', ' ', para).strip()
        if para_cleaned:
            cleaned_paragraphs.append(para_cleaned)
    return '\n\n'.join(cleaned_paragraphs)

def split_text_into_chunks(text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
    """
    Splits text into chunks of maximum size `chunk_size` with overlap `chunk_overlap`.
    Tries to split at sentence or paragraph boundaries.
    """
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = start + chunk_size
        if end >= text_len:
            last_chunk = text[start:].strip()
            if last_chunk:
                chunks.append(last_chunk)
            break

        # Attempt to find a clean split point (paragraph boundary or sentence end)
        # Look in the overlap window (from end - chunk_overlap to end)
        search_window = text[end - chunk_overlap : end]
        
        # Try paragraph break
        split_idx = search_window.rfind('\n\n')
        if split_idx != -1:
            split_point = (end - chunk_overlap) + split_idx + 2
        else:
            # Try sentence break (. , ? , !)
            sentence_delims = [
                search_window.rfind('. '),
                search_window.rfind('? '),
                search_window.rfind('! '),
                search_window.rfind('.\n'),
                search_window.rfind('?\n'),
                search_window.rfind('!\n'),
            ]
            split_idx = max(sentence_delims)
            if split_idx != -1:
                split_point = (end - chunk_overlap) + split_idx + 2
            else:
                # Try space break
                split_idx = search_window.rfind(' ')
                if split_idx != -1:
                    split_point = (end - chunk_overlap) + split_idx + 1
                else:
                    # Hard break if no delimiter found
                    split_point = end

        # Append chunk
        chunk_content = text[start:split_point].strip()
        if chunk_content:
            chunks.append(chunk_content)
        
        # Advance start with true overlap
        next_start = split_point - chunk_overlap
        if next_start <= start:
            next_start = split_point
        start = next_start
        
    return chunks
