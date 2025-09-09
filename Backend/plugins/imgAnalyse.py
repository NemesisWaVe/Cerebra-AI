# plugins/imgAnalyse.py

from core.llm import llm_client
from utils.logger import get_logger
from utils.promptUtil import get_vision_extraction_prompt

logger = get_logger(__name__)

async def analyze_image(file_path: str, query: str) -> str:
    """
    Analyzes an image using a two-step AI pipeline:
    1. A vision model extracts text/context from the image.
    2. A powerful language model uses that context to answer the user's query.
    """
    logger.info(f"Starting two-step image analysis for: {file_path}")
    
    try:
        # --- Step 1: Use the vision model to extract text/description ---
        logger.info(f"[{file_path}] Step 1: Extracting content with vision model.")
        extraction_prompt = get_vision_extraction_prompt(query)
        
        extracted_content = llm_client.generate_multimodal_response(
            prompt=extraction_prompt, 
            image_paths=[file_path]
        )
        logger.info(f"[{file_path}] Step 1 Complete. Extracted content: '{extracted_content[:100]}...'")

        # --- Step 2: Pass the extracted text to the main model for reasoning ---
        logger.info(f"[{file_path}] Step 2: Answering with main language model.")
        
        system_prompt = "You are an expert analytical assistant. Your task is to answer the user's question based *only* on the text content that was extracted from an image. Do not use any prior knowledge."

        reasoning_prompt = f"""The user asked the following question about an image: "{query}"

Here is the content that was extracted from the image:
---
{extracted_content}
---

Based on the extracted content, please provide a direct and comprehensive answer to the user's question.
"""
        
        # --- THIS IS THE FIX: We now provide the system_prompt for clear instructions ---
        final_answer = llm_client.generate_response(prompt=reasoning_prompt, system_prompt=system_prompt)
        logger.info(f"[{file_path}] Step 2 Complete. Final answer generated.")

        return final_answer

    except Exception as e:
        logger.error(f"Error during two-step image analysis for {file_path}: {e}", exc_info=True)
        return "Sorry, I encountered an error during the advanced image analysis."