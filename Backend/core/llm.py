import ollama
from config import settings
from utils.logger import get_logger

logger = get_logger(__name__)

class LLMWrapper:
    def __init__(self):
        """Initializes the Ollama client."""
        try:
            self.client = ollama.Client(host=settings.OLLAMA_HOST)
            logger.info(f"Ollama client initialized for host: {settings.OLLAMA_HOST}")
            # Check for the primary text model
            self.client.show(model=settings.LLM_MODEL)
            logger.info(f"Successfully connected to Ollama and found text model: {settings.LLM_MODEL}")
        except Exception as e:
            logger.error(f"Failed to initialize Ollama client or find model '{settings.LLM_MODEL}'. Error: {e}")
            logger.error("Please ensure Ollama is running and the specified model is pulled.")
            self.client = None

    def generate_response(self, prompt: str, system_prompt: str | None = None) -> str:
        """
        Generates a response from the LLM based on a given text prompt.
        """
        if not self.client:
            return "Error: Ollama client is not available. Please check the logs."
            
        messages = [{'role': 'user', 'content': prompt}]
        if system_prompt:
            messages.insert(0, {'role': 'system', 'content': system_prompt})

        try:
            logger.debug(f"Sending text prompt to LLM: {prompt}")
            response = self.client.chat(
                model=settings.LLM_MODEL,
                messages=messages,
                options={'temperature': 0.7}
            )
            return response['message']['content']
        except Exception as e:
            logger.error(f"Error communicating with Ollama: {e}")
            return f"Error: Could not get a response from the language model. Details: {e}"

    def generate_multimodal_response(self, prompt: str, image_paths: list[str]) -> str:
        """
        Generates a response from a vision-capable LLM.
        'image_paths' can be a list of file paths or base64 encoded strings.
        """
        if not self.client:
            return "Error: Ollama client is not available."

        try:
            logger.info(f"Sending multimodal prompt with {len(image_paths)} images.")
            response = self.client.chat(
                model=settings.VISION_MODEL, 
                messages=[{
                    'role': 'user',
                    'content': prompt,
                    'images': image_paths # The ollama library handles both types
                }]
            )
            return response['message']['content']
        except Exception as e:
            logger.error(f"Error during multimodal generation: {e}")
            # Provide a more specific error if the model is not found
            if "not found" in str(e):
                logger.error(f"Vision model '{settings.VISION_MODEL}' not found. Please pull it with 'ollama pull {settings.VISION_MODEL}'")
                return f"Error: The vision model '{settings.VISION_MODEL}' is not available. Please ask the administrator to install it."
            return f"Error: Could not get a response from the vision model. Details: {e}"

# Create a single instance to be used across the application
llm_client = LLMWrapper()