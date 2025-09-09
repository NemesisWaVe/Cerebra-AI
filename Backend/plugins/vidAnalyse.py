import os
import whisper
import ffmpeg
from core.llm import llm_client
from utils.logger import get_logger

logger = get_logger(__name__)

# Load the whisper model once
try:
    model = whisper.load_model("base")
    logger.info("Whisper model 'base' loaded successfully.")
except Exception as e:
    model = None
    logger.error(f"Could not load Whisper model: {e}. Video analysis will not work.")

def has_audio_stream(file_path: str) -> bool:
    """Check if a video file contains an audio stream using ffprobe."""
    try:
        logger.info(f"Probing for audio streams in {file_path}")
        probe = ffmpeg.probe(file_path)
        audio_streams = [stream for stream in probe['streams'] if stream['codec_type'] == 'audio']
        if not audio_streams:
            logger.warning(f"No audio stream found in {file_path}")
            return False
        logger.info(f"Audio stream detected in {file_path}")
        return True
    except ffmpeg.Error as e:
        logger.error(f"ffprobe error checking for audio stream: {e.stderr}")
        return False # Assume no audio if ffprobe fails
    except Exception as e:
        logger.error(f"An unexpected error occurred during audio stream check: {e}")
        return False

async def transcribe_audio(file_path: str, query: str) -> str: # Function renamed
    """
    Transcribes the audio from a video/audio file using Whisper.
    """
    if not model:
        return "Error: Whisper model is not available."

    if not os.path.exists(file_path):
        return f"Error: File not found at {file_path}"

    # NEW: Check for an audio stream before processing
    if not has_audio_stream(file_path):
        return "The provided video file does not contain an audio track, so it cannot be transcribed."

    try:
        logger.info(f"Starting transcription for: {file_path}")
        result = model.transcribe(file_path, fp16=False)
        transcription = result["text"]
        logger.info("Transcription completed.")

        if not transcription.strip():
            return "Successfully processed the video, but no speech could be detected in the audio."

        # Now, summarize the transcription using the LLM
        summary_prompt = f"The following is a transcription of a video. Please summarize it concisely, keeping in mind the original user query: '{query}'.\n\nTranscription:\n---\n{transcription}"
        
        logger.info("Sending transcription to LLM for summarization.")
        summary = llm_client.generate_response(summary_prompt, system_prompt="You are a helpful assistant that summarizes text.")
        
        return f"**Summary:**\n{summary}\n\n**Full Transcription:**\n{transcription[:1000]}..."

    except Exception as e:
        logger.error(f"Error during video analysis for {file_path}: {e}")
        return f"An error occurred during video analysis: {e}"