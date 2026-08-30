import pymupdf

class PDFExtractor:
    def __init__(self):
        pass

    def extract(self, pdf_path):
        """
        Extracts markdown text and metadata from a PDF.
        Returns:
            tuple: (markdown_text, metadata_dict)
        """
        try:
            doc = pymupdf.open(pdf_path)
        except Exception as e:
            raise Exception(f"Failed to open PDF {pdf_path}: {e}")

        # Extract metadata
        metadata = doc.metadata
        
        # Clean up metadata (pymupdf returns a dict with some bytes/None values)
        clean_metadata = {}
        if metadata:
            for key, value in metadata.items():
                if value is not None:
                    if isinstance(value, bytes):
                        try:
                            clean_metadata[key] = value.decode('utf-8', errors='replace')
                        except:
                            clean_metadata[key] = str(value)
                    else:
                        clean_metadata[key] = value
                        
        import datetime
        import os
        
        filename = os.path.basename(pdf_path)
        base_url = None
        if '_' in filename:
            domain = filename.split('_')[0]
            base_url = f"https://{domain}"
            
        unified_metadata = {
            "title": clean_metadata.get('title', ""),
            "source": clean_metadata.get('author', ""),
            "url": base_url or "",
            "type": "documentation",
            "tags": [],
            "scraped_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "language": "en"
        }
        
        # Merge tags from keywords if present
        if clean_metadata.get('keywords'):
            unified_metadata["tags"] = [k.strip() for k in clean_metadata['keywords'].split(',')]
            
        # Add original PDF fields just in case
        unified_metadata["pdf_metadata"] = clean_metadata

        # Extract text (pymupdf handles basic layout reasonably well)
        markdown_blocks = []
        for page_num in range(doc.page_count):
            page = doc.load_page(page_num)
            
            # Using simple text extraction for now.
            # PyMuPDF has a "markdown" experimental extraction in recent versions, 
            # or we can just extract blocks and format them.
            # get_text("text") gets standard plain text.
            text = page.get_text("text")
            if text.strip():
                # Add a page separator if desired, or just raw text
                markdown_blocks.append(f"<!-- Page {page_num + 1} -->\n\n{text.strip()}")

        markdown_text = "\n\n---\n\n".join(markdown_blocks)
        
        # Clean up multiple newlines
        import re
        markdown_text = re.sub(r'\n{3,}', '\n\n', markdown_text)

        doc.close()
        return markdown_text, unified_metadata
