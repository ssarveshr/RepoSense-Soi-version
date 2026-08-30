import os
import sys
import glob
import shutil
import json
from src.services.pdf_extractor import PDFExtractor

def determine_source(filename):
    """Determine source category based on filename."""
    lower_name = filename.lower()
    if 'github' in lower_name:
        return 'github'
    elif 'gitlab' in lower_name:
        return 'gitlab'
    elif 'youtube' in lower_name:
        return 'youtube'
    else:
        return 'other'

def main():
    print("Starting PDF to Markdown Offline Pipeline...")
    
    # Try to locate the Crawler/downloads directory
    possible_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Crawler", "downloads"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "Crawler", "downloads"),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "Crawler", "downloads")),
        os.path.abspath(os.path.join(os.getcwd(), "..", "Crawler", "downloads")),
        os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "Knowledge-Ingestion-Pipeline", "Crawler", "downloads"))
    ]
    
    downloads_dir = None
    for p in possible_paths:
        if os.path.exists(p) and os.path.isdir(p):
            downloads_dir = p
            break
            
    if not downloads_dir:
        print("Error: Could not find 'Crawler/downloads' directory.")
        sys.exit(1)
        
    print(f"Found downloads directory at: {downloads_dir}")
    
    knowledge_dir = os.path.join(os.path.dirname(downloads_dir), "..", "knowledge")
    
    pdf_dir = os.path.join(downloads_dir, "pdf")
    # Setup temp directories if needed
    os.makedirs(pdf_dir, exist_ok=True)
    
    # First, move loose PDF files in downloads_dir to pdf_dir
    loose_pdf_files = glob.glob(os.path.join(downloads_dir, "*.pdf"))
    for file_path in loose_pdf_files:
        filename = os.path.basename(file_path)
        dest_path = os.path.join(pdf_dir, filename)
        if not os.path.exists(dest_path):
            shutil.move(file_path, dest_path)
            
    # Get all pdf files to process from the pdf directory
    pdf_files = glob.glob(os.path.join(pdf_dir, "*.pdf"))
    
    if not pdf_files:
        print("Warning: No PDF files found in the pdf directory to process.")
        sys.exit(0)
        
    print(f"Found {len(pdf_files)} PDF files to process.")
    
    extractor = PDFExtractor()
    success_count = 0
    error_count = 0
    
    for i, file_path in enumerate(pdf_files, 1):
        filename = os.path.basename(file_path)
        base_name = os.path.splitext(filename)[0]
        
        source_category = determine_source(filename)
        source_dir = os.path.join(knowledge_dir, source_category)
        
        md_dir = os.path.join(source_dir, "markdown")
        meta_dir = os.path.join(source_dir, "metadata")
        pdf_dest_dir = os.path.join(source_dir, "pdf")
        
        os.makedirs(md_dir, exist_ok=True)
        os.makedirs(meta_dir, exist_ok=True)
        os.makedirs(pdf_dest_dir, exist_ok=True)
        
        md_filename = base_name + ".md"
        meta_filename = base_name + ".json"
        
        md_path = os.path.join(md_dir, md_filename)
        meta_path = os.path.join(meta_dir, meta_filename)
        pdf_dest_path = os.path.join(pdf_dest_dir, filename)
        
        if os.path.exists(md_path) and os.path.exists(meta_path):
            # Already processed
            continue
            
        try:
            md_content, metadata = extractor.extract(file_path)
            
            # Save Markdown
            with open(md_path, 'w', encoding='utf-8') as f:
                f.write(md_content)
                
            # Save Metadata
            with open(meta_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=4, ensure_ascii=False)
                
            shutil.copy(file_path, pdf_dest_path)
                
            success_count += 1
            if i % 10 == 0 or i == len(pdf_files):
                print(f"Processed {i}/{len(pdf_files)} files...")
                
        except Exception as e:
            print(f"Error processing {filename}: {e}")
            error_count += 1
            
    print("-" * 40)
    print("Pipeline Complete!")
    print(f"Total PDF files: {len(pdf_files)}")
    print(f"Successfully converted: {success_count}")
    if error_count > 0:
        print(f"Failed conversions: {error_count}")

if __name__ == "__main__":
    main()
