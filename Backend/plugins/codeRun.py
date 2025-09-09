# plugins/codeRun.py

import subprocess
import sys
from utils.logger import get_logger

logger = get_logger(__name__)

async def execute_code(code: str) -> str:
    """
    Executes a given string of Python code in a sandboxed manner.
    
    !!! SECURITY WARNING !!!
    Executing arbitrary code is extremely dangerous. This function runs the
    code in a separate process, which provides a basic level of isolation.
    For a production system, you MUST use a more secure sandboxing solution,
    such as Docker containers (e.g., using docker-py), firecracker, or gVisor.
    """
    logger.warning(f"Executing potentially unsafe code:\n---\n{code}\n---")

    if code.strip().startswith("```python"):
        code = code.strip()[9:].strip("`").strip()

    try:
        process = subprocess.run(
            [sys.executable, "-c", code],
            capture_output=True,
            text=True,
            timeout=15,
            check=False
        )

        # --- THIS BLOCK IS MODIFIED FOR CLEANER OUTPUT ---
        output_parts = []
        if process.stdout:
            output_parts.append(f"**Output (stdout):**\n```\n{process.stdout.strip()}\n```")
        if process.stderr:
            output_parts.append(f"**Errors (stderr):**\n```\n{process.stderr.strip()}\n```")
        
        if not output_parts:
            return "**Result:**\nCode executed successfully with no printed output."

        return "\n\n".join(output_parts)
        # --- END OF MODIFIED BLOCK ---

    except subprocess.TimeoutExpired:
        logger.error("Code execution timed out.")
        return "Error: Code execution timed out after 15 seconds."
    except Exception as e:
        logger.error(f"Failed to execute code: {e}")
        return f"Error: An unexpected error occurred during code execution: {e}"