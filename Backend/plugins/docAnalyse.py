# plugins/docAnalyse.py

import os
import PyPDF2
import magic
from core.llm import llm_client
from utils.logger import get_logger

logger = get_logger(__name__)

def read_pdf_file(file_path: str) -> str:
    """Reads text content from a PDF file."""
    text = ""
    try:
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            # Check if the PDF is encrypted
            if reader.is_encrypted:
                logger.warning(f"PDF {os.path.basename(file_path)} is encrypted and may not be readable.")
            for page in reader.pages:
                text += page.extract_text() or ""
    except Exception as e:
        logger.error(f"Could not read PDF {file_path}: {e}")
    return text

def read_text_file(file_path: str) -> str:
    """Reads content from a plain text file."""
    with open(file_path, "r", encoding='utf-8', errors='ignore') as f:
        return f.read()

async def analyze_document(file_path: str, query: str) -> str:
    """
    Analyzes a document by extracting its content and providing an answer based on the user's query.
    """
    if not os.path.exists(file_path):
        return f"Error: File not found at {file_path}"
    
    content = ""
    try:
        file_ext = os.path.splitext(file_path)[1].lower()
        mime_type = magic.from_file(file_path, mime=True)
        logger.info(f"Detected MIME type: {mime_type}, File extension: {file_ext}")

        if file_ext == '.pdf' or mime_type == 'application/pdf':
            content = read_pdf_file(file_path)
        elif file_ext in ['.txt', '.py', '.md'] or mime_type.startswith('text/'):
            content = read_text_file(file_path)
        else:
            return f"Unsupported file type: {mime_type}. I can only analyze PDF and plain text files at the moment."

        if not content.strip():
            return "Could not extract any readable text from the document. The file might be empty, encrypted, or image-based."

        # --- THIS PROMPT LOGIC IS THE FIX ---
        # Combine instructions into one clear prompt for the LLM
        analysis_prompt = f"""You are an expert document analysis assistant.
Your task is to carefully analyze the following document content and fulfill the user's request based *only* on the information within the document.

User's Request: "{query}"

Document Content:
---
{content[:8000]}
---

Now, please provide a comprehensive response that directly addresses the user's request based on the document's content.
"""
        
        logger.info("Sending document content to LLM for analysis.")
        # We no longer need a separate system_prompt because the instructions are combined.
        answer = llm_client.generate_response(analysis_prompt)

        return f"**Analysis of the document:**\n{answer}"
        # --- END OF FIX ---

    except Exception as e:
        logger.error(f"Error during document analysis for {file_path}: {e}")
        return f"An error occurred during document analysis: {e}"