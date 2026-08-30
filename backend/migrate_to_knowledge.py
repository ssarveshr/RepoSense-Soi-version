import os
import sys
import shutil
import glob
import json

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
    print("Starting Corpus Migration...")
    
    # Locate directories
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    knowledge_pipeline_dir = os.path.join(os.path.dirname(base_dir), "Knowledge-Ingestion-Pipeline")
    
    downloads_dir = os.path.join(knowledge_pipeline_dir, "Crawler", "downloads")
    knowledge_dir = os.path.join(knowledge_pipeline_dir, "knowledge")
    
    if not os.path.exists(downloads_dir):
        print(f"Error: Could not find downloads directory at {downloads_dir}")
        sys.exit(1)
        
    print(f"Migrating from: {downloads_dir}")
    print(f"Migrating to: {knowledge_dir}")
    
    os.makedirs(knowledge_dir, exist_ok=True)
    
    subdirs = ['html', 'pdf', 'markdown', 'metadata']
    moved_count = 0
    
    for subdir in subdirs:
        source_dir = os.path.join(downloads_dir, subdir)
        if not os.path.exists(source_dir):
            continue
            
        print(f"Processing {subdir} files...")
        
        # We need to process all files in this subdir
        files = glob.glob(os.path.join(source_dir, "*.*"))
        for file_path in files:
            filename = os.path.basename(file_path)
            
            # Special case for metadata to infer source dynamically? No, filename is consistent.
            source_category = determine_source(filename)
            
            target_dir = os.path.join(knowledge_dir, source_category, subdir)
            os.makedirs(target_dir, exist_ok=True)
            
            target_path = os.path.join(target_dir, filename)
            
            # Move the file
            try:
                shutil.move(file_path, target_path)
                moved_count += 1
            except Exception as e:
                print(f"Error moving {filename}: {e}")
                
    print(f"Successfully moved {moved_count} files into the structured knowledge directory!")
    
    # Attempt to clean up old downloads directory if empty
    try:
        for subdir in subdirs:
            d = os.path.join(downloads_dir, subdir)
            if os.path.exists(d) and not os.listdir(d):
                os.rmdir(d)
        if os.path.exists(downloads_dir) and not os.listdir(downloads_dir):
            os.rmdir(downloads_dir)
            print("Cleaned up old downloads directory.")
    except Exception as e:
        print(f"Notice: Could not fully clean up downloads dir: {e}")

if __name__ == "__main__":
    main()
