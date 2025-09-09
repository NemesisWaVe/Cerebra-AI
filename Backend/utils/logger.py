import logging
import sys
import os
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
import colorama
from colorama import Fore, Back, Style

from config import settings, BASE_DIR

# Initialize colorama for Windows compatibility
colorama.init()

class ColorfulFormatter(logging.Formatter):
    """
    A formatter that adds personality and color to our logs
    
    Because reading logs shouldn't be boring! Each log level gets its own
    color and emoji to make debugging a more pleasant experience.
    """
    
    # Color mapping for different log levels
    COLORS = {
        'DEBUG': Fore.CYAN,
        'INFO': Fore.GREEN,
        'WARNING': Fore.YELLOW,
        'ERROR': Fore.RED,
        'CRITICAL': Fore.MAGENTA + Style.BRIGHT
    }
    
    # ASCII-safe emojis for Windows compatibility
    EMOJIS = {
        'DEBUG': '[DEBUG]',
        'INFO': '[INFO] ',
        'WARNING': '[WARN] ',
        'ERROR': '[ERROR]',
        'CRITICAL': '[CRIT] '
    }
    
    def format(self, record):
        """Format the log record with colors and safe emojis"""
        # Get color and emoji for the log level
        color = self.COLORS.get(record.levelname, '')
        emoji = self.EMOJIS.get(record.levelname, '[LOG]  ')
        
        # Create the formatted message
        log_message = super().format(record)
        
        # Add color if we're outputting to console
        if hasattr(sys.stdout, 'isatty') and sys.stdout.isatty():
            formatted_message = f"{color}{emoji} {log_message}{Style.RESET_ALL}"
        else:
            formatted_message = f"{emoji} {log_message}"
        
        return formatted_message

class JSONFormatter(logging.Formatter):
    """
    JSON formatter for structured logging
    
    Perfect for log aggregation systems and automated analysis.
    Each log entry becomes a structured JSON object with rich metadata.
    """
    
    def format(self, record):
        """Format the log record as JSON"""
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }
        
        # Add extra fields if present
        if hasattr(record, 'session_id'):
            log_entry['session_id'] = record.session_id
        
        if hasattr(record, 'user_id'):
            log_entry['user_id'] = record.user_id
        
        if hasattr(record, 'processing_time'):
            log_entry['processing_time'] = record.processing_time
        
        # Add exception info if present
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)
        
        return json.dumps(log_entry, ensure_ascii=True)  # Ensure ASCII-safe JSON

class CerebraLogger:
    """
    The main Cerebra logging system
    
    A comprehensive logging solution that grows with your application.
    It handles console output, file logging, structured logging, and more!
    """
    
    _instances = {}
    
    def __new__(cls, name: str):
        """Ensure we reuse loggers (singleton per name)"""
        if name not in cls._instances:
            cls._instances[name] = super().__new__(cls)
        return cls._instances[name]
    
    def __init__(self, name: str):
        if hasattr(self, '_initialized'):
            return
        
        self.name = name
        self.logger = logging.getLogger(name)
        self._initialized = True
        
        # Prevent duplicate handlers
        if not self.logger.handlers:
            self._setup_logger()
        
        # Add custom methods
        self._add_custom_methods()
    
    def _setup_logger(self):
        """Set up the logger with all the bells and whistles"""
        log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
        self.logger.setLevel(log_level)
        
        # Create logs directory
        log_dir = BASE_DIR / "logs"
        log_dir.mkdir(exist_ok=True)
        
        # Console handler with colors and UTF-8 encoding
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(log_level)
        
        # Force UTF-8 encoding for console output on Windows
        if sys.platform.startswith('win'):
            # Set console to handle UTF-8
            try:
                # Try to set UTF-8 mode
                sys.stdout.reconfigure(encoding='utf-8', errors='replace')
            except:
                # Fallback to replace errors
                pass
        
        console_formatter = ColorfulFormatter(
            '%(asctime)s - %(name)s - [%(levelname)s] - %(message)s',
            datefmt='%H:%M:%S'
        )
        console_handler.setFormatter(console_formatter)
        self.logger.addHandler(console_handler)
        
        # File handler for general logs (UTF-8 encoded)
        file_handler = RotatingFileHandler(
            log_dir / f"{settings.APP_NAME.lower().replace(' ', '_')}.log",
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5,
            encoding='utf-8'
        )
        file_handler.setLevel(logging.INFO)
        file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - [%(levelname)s] - %(message)s'
        )
        file_handler.setFormatter(file_formatter)
        self.logger.addHandler(file_handler)
        
        # Error-specific file handler (UTF-8 encoded)
        error_handler = RotatingFileHandler(
            log_dir / "errors.log",
            maxBytes=10*1024*1024,
            backupCount=3,
            encoding='utf-8'
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(file_formatter)
        self.logger.addHandler(error_handler)
        
        # JSON structured logs (optional, UTF-8 encoded)
        if settings.DEBUG_MODE:
            json_handler = TimedRotatingFileHandler(
                log_dir / "structured.jsonl",
                when='midnight',
                backupCount=7,
                encoding='utf-8'
            )
            json_handler.setLevel(logging.DEBUG)
            json_handler.setFormatter(JSONFormatter())
            self.logger.addHandler(json_handler)
    
    def _add_custom_methods(self):
        """Add custom logging methods with personality (ASCII-safe)"""
        
        def session_log(level: str, message: str, session_id: str, **kwargs):
            """Log with session context"""
            extra = {'session_id': session_id, **kwargs}
            getattr(self.logger, level.lower())(f"[{session_id}] {message}", extra=extra)
        
        def performance_log(message: str, processing_time: float, session_id: Optional[str] = None):
            """Log performance metrics"""
            extra = {'processing_time': processing_time}
            if session_id:
                extra['session_id'] = session_id
                message = f"[{session_id}] {message}"
            
            if processing_time > 5.0:
                self.logger.warning(f"SLOW: {message} took {processing_time:.2f}s", extra=extra)
            elif processing_time > 2.0:
                self.logger.info(f"MEDIUM: {message} took {processing_time:.2f}s", extra=extra)
            else:
                self.logger.debug(f"FAST: {message} took {processing_time:.2f}s", extra=extra)
        
        def ai_decision_log(decision: str, reasoning: str, confidence: float, session_id: str):
            """Log AI routing decisions"""
            status = "HIGH" if confidence > 0.8 else "MED" if confidence > 0.6 else "LOW"
            message = f"AI Decision [{status}]: {decision} (confidence: {confidence:.2f}) - {reasoning}"
            self.session_log('info', message, session_id, confidence=confidence, decision=decision)
        
        def user_interaction_log(query: str, session_id: str, file_attached: bool = False):
            """Log user interactions"""
            file_info = " with file" if file_attached else ""
            truncated_query = query[:100] + "..." if len(query) > 100 else query
            self.session_log('info', f"User query: '{truncated_query}'{file_info}", session_id, 
                           query_length=len(query), has_file=file_attached)
        
        def error_with_context(error: Exception, context: str, session_id: Optional[str] = None, **kwargs):
            """Log errors with rich context"""
            error_msg = f"ERROR in {context}: {str(error)}"
            extra = {'error_type': type(error).__name__, **kwargs}
            
            if session_id:
                extra['session_id'] = session_id
                error_msg = f"[{session_id}] {error_msg}"
            
            self.logger.error(error_msg, exc_info=True, extra=extra)
        
        def success_log(message: str, session_id: Optional[str] = None, **kwargs):
            """Log successful operations"""
            success_msg = f"SUCCESS: {message}"
            if session_id:
                success_msg = f"[{session_id}] {success_msg}"
            self.logger.info(success_msg, extra=kwargs)
        
        def startup_log(component: str, status: str = "initialized", **details):
            """Log component startup"""
            status_msg = {"initialized": "OK", "failed": "FAIL", "warning": "WARN"}.get(status, "INFO")
            message = f"[{status_msg}] {component} {status}"
            if details:
                detail_str = ", ".join(f"{k}={v}" for k, v in details.items())
                message += f" ({detail_str})"
            self.logger.info(message)
        
        def debug_dump(data: Dict[str, Any], context: str, session_id: Optional[str] = None):
            """Debug log with data dump"""
            if not self.logger.isEnabledFor(logging.DEBUG):
                return
            
            message = f"DEBUG DUMP - {context}:"
            if session_id:
                message = f"[{session_id}] {message}"
            
            self.logger.debug(message)
            for key, value in data.items():
                self.logger.debug(f"  -> {key}: {value}")
        
        # Attach methods to logger instance
        self.session_log = session_log
        self.performance = performance_log
        self.ai_decision = ai_decision_log
        self.user_interaction = user_interaction_log
        self.error_context = error_with_context
        self.success = success_log
        self.startup = startup_log
        self.debug_dump = debug_dump
    
    # Standard logging methods with enhanced features
    def debug(self, message: str, **kwargs):
        """Debug logging with extra context"""
        self.logger.debug(message, extra=kwargs)
    
    def info(self, message: str, **kwargs):
        """Info logging with extra context"""
        self.logger.info(message, extra=kwargs)
    
    def warning(self, message: str, **kwargs):
        """Warning logging with extra context"""
        self.logger.warning(message, extra=kwargs)
    
    def error(self, message: str, exc_info: bool = False, **kwargs):
        """Error logging with exception info"""
        self.logger.error(message, exc_info=exc_info, extra=kwargs)
    
    def critical(self, message: str, **kwargs):
        """Critical logging with extra context"""
        self.logger.critical(message, extra=kwargs)
    
    def exception(self, message: str, **kwargs):
        """Log exception with full traceback"""
        self.logger.exception(message, extra=kwargs)

class LoggingContextManager:
    """
    Context manager for enhanced logging
    
    Use this to automatically log entry/exit of functions with timing info.
    Perfect for tracking performance and debugging complex operations.
    """
    
    def __init__(self, logger: CerebraLogger, operation: str, session_id: Optional[str] = None):
        self.logger = logger
        self.operation = operation
        self.session_id = session_id
        self.start_time = None
    
    def __enter__(self):
        self.start_time = datetime.now()
        message = f"Starting: {self.operation}"
        if self.session_id:
            self.logger.session_log('debug', message, self.session_id)
        else:
            self.logger.debug(message)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        end_time = datetime.now()
        duration = (end_time - self.start_time).total_seconds()
        
        if exc_type:
            message = f"Failed: {self.operation} after {duration:.2f}s - {exc_val}"
            if self.session_id:
                self.logger.session_log('error', message, self.session_id)
            else:
                self.logger.error(message, exc_info=True)
        else:
            message = f"Completed: {self.operation} in {duration:.2f}s"
            if self.session_id:
                self.logger.performance(f"Completed: {self.operation}", duration, self.session_id)
            else:
                self.logger.info(message)

# Factory function for getting loggers
def get_logger(name: str) -> CerebraLogger:
    """
    Get a configured Cerebra logger instance
    
    Usage:
        logger = get_logger(__name__)
        logger.info("Hello, world!")
        logger.session_log('info', 'User connected', session_id='123')
        logger.performance('Model inference', 2.5, session_id='123')
    """
    return CerebraLogger(name)

# Convenience functions for common logging patterns
def log_function_call(func):
    """
    Decorator to automatically log function calls
    
    @log_function_call
    def my_function():
        pass
    """
    def wrapper(*args, **kwargs):
        logger = get_logger(func.__module__)
        with LoggingContextManager(logger, f"{func.__name__}()"):
            return func(*args, **kwargs)
    return wrapper

def log_ai_interaction(session_id: str):
    """
    Decorator for AI interaction logging
    
    @log_ai_interaction('session_123')
    def process_request():
        pass
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            logger = get_logger(func.__module__)
            with LoggingContextManager(logger, f"AI interaction: {func.__name__}", session_id):
                return func(*args, **kwargs)
        return wrapper
    return decorator

# Utility functions
def setup_request_logging():
    """Set up request-level logging middleware"""
    import uuid
    from contextvars import ContextVar
    
    request_id: ContextVar[str] = ContextVar('request_id')
    
    class RequestContextFilter(logging.Filter):
        def filter(self, record):
            try:
                record.request_id = request_id.get()
            except LookupError:
                record.request_id = 'no-request'
            return True
    
    # Add filter to all handlers
    root_logger = logging.getLogger()
    filter_instance = RequestContextFilter()
    for handler in root_logger.handlers:
        handler.addFilter(filter_instance)
    
    return request_id

def configure_third_party_loggers():
    """Configure third-party library loggers to be less verbose"""
    # Reduce noise from common libraries
    noisy_loggers = [
        'urllib3.connectionpool',
        'requests.packages.urllib3',
        'PIL.PngImagePlugin',
        'transformers.tokenization_utils_base',
        'torch.distributed',
        'asyncio'
    ]
    
    for logger_name in noisy_loggers:
        logging.getLogger(logger_name).setLevel(logging.WARNING)

# Initialize on import
configure_third_party_loggers()

# ASCII art for startup (safe for all encodings)
STARTUP_BANNER = """
===============================================
    Cerebra AI Backend - Logging System
          ASCII-Safe Version Ready!
===============================================
"""

def print_startup_banner():
    """Print a fancy startup banner (ASCII-safe)"""
    if settings.DEBUG_MODE:
        print(STARTUP_BANNER)

# Print banner on import in debug mode
if settings.DEBUG_MODE and __name__ != '__main__':
    print_startup_banner()

# Main logger instance for convenience
main_logger = get_logger('cerebra.main')

if __name__ == "__main__":
    # Test the logging system
    test_logger = get_logger('cerebra.test')
    
    test_logger.info("Testing Cerebra logging system...")
    test_logger.debug("Debug message with details", component="test", status="running")
    test_logger.warning("This is a warning message")
    test_logger.error("This is an error message")
    
    # Test session logging
    test_logger.session_log('info', 'User connected successfully', 'test-session-123')
    test_logger.performance('Test operation', 1.23, 'test-session-123')
    test_logger.ai_decision('image_generator', 'User mentioned creating artwork', 0.95, 'test-session-123')
    test_logger.user_interaction('Generate a beautiful sunset image', 'test-session-123')
    
    # Test context manager
    with LoggingContextManager(test_logger, 'Complex operation', 'test-session-123'):
        import time
        time.sleep(0.1)  # Simulate work
    
    test_logger.success("Logging system test completed!")