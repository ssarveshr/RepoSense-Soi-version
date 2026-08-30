import os
import sys
import json
import glob
import hashlib

# Ensure backend root is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from src.services.search_service import engine

def chunk_text(text, max_chunk_size=1500, overlap_paragraphs=1):
    paragraphs = text.split('\n\n')
    chunks = []
    current_chunk = []
    current_length = 0
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
            
        # If single paragraph is very long, chunk by character
        if len(para) > max_chunk_size:
            if current_chunk:
                chunks.append("\n\n".join(current_chunk))
                current_chunk = []
                current_length = 0
            for i in range(0, len(para), max_chunk_size - 200):
                chunks.append(para[i:i + max_chunk_size])
            continue
            
        if current_length + len(para) + 2 > max_chunk_size:
            chunks.append("\n\n".join(current_chunk))
            if len(current_chunk) >= overlap_paragraphs:
                current_chunk = current_chunk[-overlap_paragraphs:]
                current_length = sum(len(p) + 2 for p in current_chunk)
            else:
                current_chunk = []
                current_length = 0
                
        current_chunk.append(para)
        current_length += len(para) + 2
        
    if current_chunk:
        chunks.append("\n\n".join(current_chunk))
        
    return chunks

def main():
    print("[Ingestion] Starting Knowledge Ingestion Pipeline...")
    
    # Locate sibling Knowledge-Ingestion-Pipeline directory
    base_dir = os.path.dirname(os.path.abspath(__file__))
    knowledge_pipeline_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(base_dir)), "Knowledge-Ingestion-Pipeline"))
    knowledge_dir = os.path.join(knowledge_pipeline_dir, "knowledge")
    
    if not os.path.exists(knowledge_dir):
        print(f"[Error] Could not find knowledge directory at: {knowledge_dir}")
        sys.exit(1)
        
    print(f"[Ingestion] Found knowledge base directory: {knowledge_dir}")
    
    categories = ['github', 'other']
    total_files_processed = 0
    total_chunks_indexed = 0
    
    for category in categories:
        category_path = os.path.join(knowledge_dir, category)
        if not os.path.exists(category_path):
            continue
            
        markdown_dir = os.path.join(category_path, "markdown")
        metadata_dir = os.path.join(category_path, "metadata")
        
        if not os.path.exists(markdown_dir):
            continue
            
        print(f"\n[Ingestion] Processing category: '{category}'...")
        
        # Get all markdown files
        md_files = glob.glob(os.path.join(markdown_dir, "*.md"))
        print(f"[Ingestion] Found {len(md_files)} markdown files.")
        
        for file_path in md_files:
            filename = os.path.basename(file_path)
            basename = os.path.splitext(filename)[0]
            
            # Find corresponding metadata json file
            meta_path = os.path.join(metadata_dir, basename + ".json")
            metadata = {
                "title": basename.replace('_', ' ').replace('-', ' ').title(),
                "source": category.title(),
                "url": "",
                "type": "documentation",
                "file_path": file_path
            }
            
            if os.path.exists(meta_path):
                try:
                    with open(meta_path, 'r', encoding='utf-8') as f:
                        meta_data = json.load(f)
                        metadata.update({
                            "title": meta_data.get("title") or metadata["title"],
                            "source": meta_data.get("source") or metadata["source"],
                            "url": meta_data.get("url") or "",
                            "type": meta_data.get("type") or "documentation"
                        })
                except Exception as e:
                    print(f"[Warning] Could not parse metadata for {filename}: {e}")
            
            # Read markdown content
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except Exception as e:
                print(f"[Error] Error reading {filename}: {e}")
                continue
                
            if not content.strip():
                continue
                
            # Chunk the content
            chunks = chunk_text(content)
            
            # Index each chunk
            for idx, chunk in enumerate(chunks):
                # Generate unique ID based on file path and chunk index
                doc_id_raw = f"{file_path}_{idx}"
                doc_id = hashlib.sha256(doc_id_raw.encode('utf-8')).hexdigest()
                
                chunk_metadata = metadata.copy()
                chunk_metadata["chunk_index"] = idx
                # Keep metadata values clean (strings/ints/booleans, no nested dicts)
                
                try:
                    engine.add_document_chunk(doc_id, chunk, chunk_metadata)
                    total_chunks_indexed += 1
                except Exception as e:
                    print(f"[Error] Error indexing chunk {idx} of {filename}: {e}")
                    
            total_files_processed += 1
            if total_files_processed % 10 == 0:
                print(f"Progress: Processed {total_files_processed} files, indexed {total_chunks_indexed} chunks...")
                
    print("-" * 50)
    print("[Ingestion] Knowledge Ingestion Complete!")
    print(f"[Ingestion] Total files processed: {total_files_processed}")
    print(f"[Ingestion] Total chunks indexed: {total_chunks_indexed}")

if __name__ == "__main__":
    main()
