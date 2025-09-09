import cv2
import base64
import os
from PIL import Image
from io import BytesIO

from core.llm import llm_client
from utils.logger import get_logger

logger = get_logger(__name__)

def extract_frames(video_path: str, interval_seconds: int = 2) -> list[str]:
    """Extracts frames from a video at a given interval and returns them as base64 strings."""
    if not os.path.exists(video_path):
        logger.error(f"Video file not found at {video_path}")
        return []

    vidcap = cv2.VideoCapture(video_path)
    fps = vidcap.get(cv2.CAP_PROP_FPS)
    frame_interval = int(fps * interval_seconds)
    
    frames = []
    success, image = vidcap.read()
    count = 0
    while success:
        if count % frame_interval == 0:
            # Convert frame to a format Pillow can use
            img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(img_rgb)
            
            # Resize for faster processing
            pil_img.thumbnail((1024, 1024))

            buffered = BytesIO()
            pil_img.save(buffered, format="PNG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
            frames.append(img_base64)
        
        success, image = vidcap.read()
        count += 1
    
    logger.info(f"Extracted {len(frames)} frames from {video_path}")
    return frames

async def analyze_video_frames(file_path: str, query: str) -> str:
    """
    Analyzes video content frame-by-frame using a vision model.
    """
    try:
        frames = extract_frames(file_path)
        if not frames:
            return "Could not extract any frames from the video. It might be corrupted or in an unsupported format."

        # Use the multi-modal generation method from your LLM wrapper
        # The ollama library can handle multiple images in the 'images' list
        logger.info(f"Sending {len(frames)} frames to the vision model for analysis.")
        response = llm_client.generate_multimodal_response(
            prompt=f"Analyze these video frames and answer the user's query. User query: '{query}'",
            # We are sending base64 strings instead of paths
            image_paths=frames
        )

        return f"**Video Content Analysis:**\n{response}"

    except Exception as e:
        logger.error(f"Error during video frame analysis: {e}")
        return f"An error occurred during video content analysis: {e}"