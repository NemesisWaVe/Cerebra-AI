import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, validator

# Project root - the foundation of everything
BASE_DIR = Path(__file__).resolve().parent

class Settings(BaseSettings):
    """
    🎛️ The control center for Cerebra AI
    
    This class manages all configuration with the wisdom of experience
    and the flexibility of youth. Every setting has a purpose, every
    default has been carefully chosen through trial and error.
    """
    
    # Core Application Settings
    APP_NAME: str = Field(
        default="Cerebra AI Backend",
        description="The name that represents our AI dreams"
    )
    
    APP_VERSION: str = Field(
        default="1.0.0",
        description="Version number - we're just getting started!"
    )
    
    DEBUG_MODE: bool = Field(
        default=False,
        description="Enable debug mode for development (use wisely)"
    )
    
    LOG_LEVEL: str = Field(
        default="INFO",
        description="How chatty should our logs be?"
    )
    
    # 🤖 AI/LLM Configuration
    OLLAMA_HOST: str = Field(
        default="http://localhost:11434",
        description="Where our AI brain lives"
    )
    
    LLM_MODEL: str = Field(
        default="gpt-oss:20b",
        description="The chosen model - our AI's personality"
    )    
    
    VISION_MODEL: str = Field(
        default="llava",
        description="The vision model for image analysis (e.g., llava)"
    )

    LLM_TIMEOUT: int = Field(
        default=120,
        description="Patience timeout for AI responses (seconds)"
    )
    
    LLM_TEMPERATURE: float = Field(
        default=0.7,
        description="Creativity level (0.0 = boring, 1.0 = wild)"
    )
    
    MAX_CONTEXT_LENGTH: int = Field(
        default=8192,
        description="How much context our AI can remember"
    )
    
    # Image Generation Settings
    COMFYUI_URL: str = Field(
        default="http://127.0.0.1:8188/prompt",
        description="ComfyUI endpoint for image magic"
    )
    
    COMFYUI_ENABLED: bool = Field(
        default=True,
        description="Enable image generation capabilities"
    )
    
    # File Handling Configuration
    TEMP_FILE_DIR: str = Field(
        default=str(BASE_DIR / "temp_files"),
        description="Temporary file storage - cleaned regularly"
    )
    
    MAX_FILE_SIZE: int = Field(
        default=50 * 1024 * 1024,  # 50MB
        description="Maximum file upload size in bytes"
    )
    
    ALLOWED_FILE_TYPES: List[str] = Field(
        default=[
            # Documents
            "application/pdf", "text/plain", "text/markdown",
            "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            # Code files
            "text/x-python", "application/x-python-code", "text/x-python-script",
            # Media
            "video/mp4", "video/avi", "video/mov", "video/mkv",
            "audio/mp3", "audio/wav", "audio/m4a", "audio/flac",
            # Images
            "image/jpeg", "image/png", "image/gif", "image/webp"
        ],
        description="Allowed MIME types for file uploads"
    )
    
    FILE_CLEANUP_INTERVAL: int = Field(
        default=3600,  # 1 hour
        description="How often to clean up old temp files (seconds)"
    )
    
    # Code Execution Settings
    CODE_EXECUTION_ENABLED: bool = Field(
        default=True,
        description="Allow code execution (disable in production if unsure)"
    )
    
    CODE_EXECUTION_TIMEOUT: int = Field(
        default=30,
        description="Code execution timeout (seconds)"
    )
    
    SAFE_CODE_EXECUTION: bool = Field(
        default=True,
        description="Use additional safety measures for code execution"
    )
    
    # API Configuration
    API_V1_PREFIX: str = Field(
        default="/api/v1",
        description="API version prefix for organized routing"
    )
    
    # --- THIS IS THE ADJUSTED LINE ---
    BACKEND_URL: str = Field(
        default="http://127.0.0.1:8000",
        description="The public-facing base URL of the backend server"
    )
    # --- END ADJUSTMENT ---

    CORS_ORIGINS: List[str] = Field(
        default=["*"],
        description="Allowed CORS origins (configure for production)"
    )
    
    REQUEST_TIMEOUT: int = Field(
        default=300,  # 5 minutes
        description="Global request timeout (seconds)"
    )
    
    # 📊 Monitoring & Performance
    ENABLE_METRICS: bool = Field(
        default=True,
        description="Collect performance metrics"
    )
    
    LOG_REQUESTS: bool = Field(
        default=True,
        description="Log all incoming requests"
    )
    
    RATE_LIMIT_ENABLED: bool = Field(
        default=False,
        description="Enable rate limiting (implement if needed)"
    )
    
    # Security Settings
    SECRET_KEY: Optional[str] = Field(
        default=None,
        description="Secret key for encryption (generate one!)"
    )
    
    TRUSTED_HOSTS: List[str] = Field(
        default=["*"],
        description="Trusted host patterns"
    )
    
    @validator('LOG_LEVEL')
    def validate_log_level(cls, v):
        """Ensure log level is valid"""
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in valid_levels:
            raise ValueError(f'LOG_LEVEL must be one of: {valid_levels}')
        return v.upper()
    
    @validator('LLM_TEMPERATURE')
    def validate_temperature(cls, v):
        """Keep temperature in reasonable bounds"""
        if not 0.0 <= v <= 2.0:
            raise ValueError('LLM_TEMPERATURE must be between 0.0 and 2.0')
        return v
    
    @validator('MAX_FILE_SIZE')
    def validate_file_size(cls, v):
        """Ensure reasonable file size limits"""
        if v > 100 * 1024 * 1024:  # 100MB
            raise ValueError('MAX_FILE_SIZE should not exceed 100MB')
        return v

    class Config:
        """Pydantic configuration"""
        env_file = ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = True
        extra = "allow"

# Create the single source of truth
settings = Settings()

# Ensure required directories exist
def setup_directories():
    """Create necessary directories if they don't exist"""
    directories = [
        settings.TEMP_FILE_DIR,
        BASE_DIR / "logs",
        BASE_DIR / "cache"
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)

# Initialize on import
setup_directories()

# Some helpful utilities
def get_project_root() -> Path:
    """Get the project root directory"""
    return BASE_DIR

def is_development() -> bool:
    """Check if we're in development mode"""
    return settings.DEBUG_MODE or os.getenv('ENVIRONMENT', '').lower() == 'development'

def get_version_info() -> dict:
    """Get version information"""
    return {
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "python_version": f"{os.sys.version_info.major}.{os.sys.version_info.minor}.{os.sys.version_info.micro}",
        "environment": "development" if is_development() else "production"
    }

# Log the current configuration (but hide sensitive info)
if __name__ == "__main__":
    import json
    from utils.logger import get_logger
    
    logger = get_logger(__name__)
    logger.info("Cerebra Configuration Loaded Successfully!")
    logger.info(f"App: {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Model: {settings.LLM_MODEL}")
    logger.info(f"Temperature: {settings.LLM_TEMPERATURE}")
    logger.info(f"Temp Dir: {settings.TEMP_FILE_DIR}")
    logger.info("All systems configured and ready to go!")