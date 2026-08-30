import os
import sys
import glob
import shutil
from urllib.parse import urlparse
from src.services.html_extractor import HTMLExtractor

def infer_base_url_from_filename(filename):
    """
    Infers the base URL from the filename.
    Example: 'docs.github.com_actions.html' -> 'https://docs.github.com'
    """
    # Just take everything before the first underscore or dot html
    name = os.path.basename(filename)
    if '_' in name:
        domain = name.split('_')[0]
        return f"https://{domain}"
    return None

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
    print("Starting HTML to Markdown Offline Pipeline...")
    
    # Try to locate the Crawler/downloads directory
    # Based on user input: "THE FILES ARE IN Crawler/downloads"
    possible_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Crawler", "downloads"), # backend/Crawler/downloads
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "Crawler", "downloads"), # root/Crawler/downloads
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "Crawler", "downloads")), # workspace sibling
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
        print("Searched in:")
        for p in possible_paths:
            print(f"  - {p}")
        sys.exit(1)
        
    print(f"Found downloads directory at: {downloads_dir}")
    
    knowledge_dir = os.path.join(os.path.dirname(downloads_dir), "..", "knowledge")
    
    html_dir = os.path.join(downloads_dir, "html")
    # Setup temp directories if needed
    os.makedirs(html_dir, exist_ok=True)
    
    # Move loose HTML files in downloads_dir to html_dir
    loose_html_files = glob.glob(os.path.join(downloads_dir, "*.html"))
    for file_path in loose_html_files:
        filename = os.path.basename(file_path)
        dest_path = os.path.join(html_dir, filename)
        if not os.path.exists(dest_path):
            shutil.move(file_path, dest_path)
            
    # Get all html files to process
    html_files = glob.glob(os.path.join(html_dir, "*.html"))
    
    if not html_files:
        print("Warning: No HTML files found in the html directory to process.")
        sys.exit(0)
        
    print(f"Found {len(html_files)} HTML files to process.")
    
    extractor = HTMLExtractor()
    success_count = 0
    error_count = 0
    
    meta_dir_legacy = os.path.join(downloads_dir, "metadata")
    os.makedirs(meta_dir_legacy, exist_ok=True)
    
    for i, file_path in enumerate(html_files, 1):
        filename = os.path.basename(file_path)
        
        source_category = determine_source(filename)
        source_dir = os.path.join(knowledge_dir, source_category)
        
        md_dir = os.path.join(source_dir, "markdown")
        meta_dir = os.path.join(source_dir, "metadata")
        html_dest_dir = os.path.join(source_dir, "html")
        
        os.makedirs(md_dir, exist_ok=True)
        os.makedirs(meta_dir, exist_ok=True)
        os.makedirs(html_dest_dir, exist_ok=True)
        
        md_filename = os.path.splitext(filename)[0] + ".md"
        meta_filename = os.path.splitext(filename)[0] + ".json"
        
        md_path = os.path.join(md_dir, md_filename)
        meta_path = os.path.join(meta_dir, meta_filename)
        html_dest_path = os.path.join(html_dest_dir, filename)
        
        if os.path.exists(md_path) and os.path.exists(meta_path):
            continue
            
        # Infer base URL
        base_url = infer_base_url_from_filename(filename)
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                html_content = f.read()
                
            md_content, metadata = extractor.extract_to_markdown(html_content, base_url=base_url)
            
            with open(md_path, 'w', encoding='utf-8') as f:
                f.write(md_content)
                
            import json
            with open(meta_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=4, ensure_ascii=False)
                
            # Move the HTML file to the structured folder
            shutil.copy(file_path, html_dest_path)
                
            success_count += 1
            if i % 100 == 0 or i == len(html_files):
                print(f"Processed {i}/{len(html_files)} files...")
                
        except Exception as e:
            print(f"Error processing {filename}: {e}")
            error_count += 1
            
    print("-" * 40)
    print("Pipeline Complete!")
    print(f"Total HTML files: {len(html_files)}")
    print(f"Successfully converted: {success_count}")
    if error_count > 0:
        print(f"Failed conversions: {error_count}")
    print(f"Check the output in: {md_dir}")

if __name__ == "__main__":
    main()
