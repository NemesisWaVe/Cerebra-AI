# utils/previewUtil.py

import os
import fitz  # PyMuPDF
import ffmpeg
from config import BASE_DIR, settings # <-- Import settings
from utils.logger import get_logger

logger = get_logger(__name__)

PREVIEW_DIR = os.path.join(BASE_DIR, "static", "previews")
UPLOADS_DIR = os.path.join(BASE_DIR, "static", "uploads")
os.makedirs(PREVIEW_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

async def generate_preview(file_path: str, original_filename: str) -> dict:
    file_ext = os.path.splitext(original_filename)[1].lower()
    
    preview_filename = f"preview_{os.path.basename(file_path)}.jpg"
    preview_path = os.path.join(PREVIEW_DIR, preview_filename)
    # --- THIS LINE IS THE FIX ---
    preview_url = f"{settings.BACKEND_URL}/static/previews/{preview_filename}"

    try:
        if file_ext == ".pdf":
            logger.info(f"Generating PDF preview for {file_path}")
            doc = fitz.open(file_path)
            page = doc.load_page(0)
            pix = page.get_pixmap(dpi=150)
            pix.save(preview_path)
            doc.close()
            logger.info(f"PDF preview saved to {preview_path}")
            return {"fileType": "pdf", "previewUrl": preview_url}

        elif file_ext in ['.mp4', '.mov', '.avi', '.mkv', '.webm']:
            logger.info(f"Generating video preview for {file_path}")
            (
                ffmpeg
                .input(file_path, ss=1)
                .output(preview_path, vframes=1)
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            logger.info(f"Video preview saved to {preview_path}")
            return {"fileType": "video", "previewUrl": preview_url}

    except Exception as e:
        logger.error(f"Failed to generate preview for {original_filename}: {e}")
        file_type = "video" if file_ext in ['.mp4', '.mov'] else "pdf" if file_ext == ".pdf" else "document"
        return {"fileType": file_type, "previewUrl": None} 
        
    return {"fileType": "document", "previewUrl": None}