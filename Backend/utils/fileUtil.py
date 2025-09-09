import os
import aiofiles
from fastapi import UploadFile
from config import settings
from utils.logger import get_logger

logger = get_logger(__name__)

async def save_temp_file(file: UploadFile, session_id: str) -> str:
    """Saves an uploaded file to a temporary directory."""
    try:
        # Sanitize filename
        safe_filename = f"{session_id}_{os.path.basename(file.filename)}"
        file_path = os.path.join(settings.TEMP_FILE_DIR, safe_filename)

        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
        
        return file_path
    except Exception as e:
        logger.error(f"Error saving temporary file: {e}")
        raise

def cleanup_temp_file(file_path: str):
    """Deletes a temporary file."""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        logger.error(f"Error cleaning up temporary file {file_path}: {e}")