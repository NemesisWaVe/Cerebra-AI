# core/router.py

import json
import asyncio 
from typing import Dict, Any, Optional, Callable, List
from datetime import datetime
from sqlalchemy.orm import Session

from core.llm import llm_client
from core import mem
from utils.logger import get_logger
from utils.promptUtil import get_router_prompt
from config import settings

# Import our specialized AI tools
from plugins import vidAnalyse, docAnalyse, imgGen, codeRun, imgAnalyse, visionAnalyse
logger = get_logger(__name__)

class ToolRegistry:
    """
    Our toolkit registry - keeping track of all available AI superpowers.
    """
    def __init__(self):
        self._tools: Dict[str, Dict[str, Any]] = {
            "img_analyzer": {"function": imgAnalyse.analyze_image, "description": "Analyzes the content of an image file.", "requires_file": True},
            "vision_analyzer": {"function": visionAnalyse.analyze_video_frames, "description": "Analyzes the visual content of a video frame-by-frame.", "requires_file": True},
            "audio_transcriber": {"function": vidAnalyse.transcribe_audio, "description": "Transcribes the audio from a video or audio file.", "requires_file": True},
            "doc_analyzer": {"function": docAnalyse.analyze_document, "description": "Extracts insights from documents (PDF, TXT, etc.).", "requires_file": True},
            "img_gen": {"function": imgGen.generate_image, "description": "Creates stunning images from text descriptions.", "requires_file": False},
            "code_runner": {"function": codeRun.execute_code, "description": "Executes Python code in a secure sandbox.", "requires_file": False},
            "general_chat": {"function": self._handle_general_chat, "description": "Engages in intelligent conversation about any topic.", "requires_file": False},
            "chat_summarizer": {"function": self._handle_chat_summary, "description": "Summarizes the current conversation history.", "requires_file": False},
        }
    
    async def _handle_general_chat(self, query: str, db: Session, session_id: str) -> str:
        system_prompt = "You are Cerebra, a helpful and friendly AI assistant."
        context = mem.get_recent_context(session_id, db)
        if context:
            query = f"Previous conversation context:\n{context}\n\nUser Query: {query}"
        return llm_client.generate_response(query, system_prompt)

    async def _handle_chat_summary(self, query: str, db: Session, session_id: str) -> str:
        system_prompt = "You are an expert at summarizing conversations. Based on the provided chat history, create a concise summary."
        context = mem.get_recent_context(session_id, db, max_messages=50)
        return llm_client.generate_response(context, system_prompt)
    
    def get_tool_info(self, tool_name: str) -> Optional[Dict[str, Any]]:
        return self._tools.get(tool_name)

    def get_all_tools(self) -> Dict[str, Dict[str, Any]]:
        return self._tools.copy()

tool_registry = ToolRegistry()

async def route_request(
    query: str, 
    file_path: Optional[str], 
    session_id: str, 
    db: Session,
    attachment_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    logger.info(f"[{session_id}] Routing request...")
    user_metadata = {"attachment": attachment_data} if attachment_data else {}

    try:
        conversation_history = mem.get_recent_context(session_id, db, max_messages=5)
        system_prompt = get_router_prompt(file_path, conversation_history, tool_registry.get_all_tools())
        router_response_str = llm_client.generate_response(prompt=query, system_prompt=system_prompt)
        
        decision = json.loads(router_response_str)
        tool_name = decision.get("tool", "general_chat")
        tool_input = decision.get("tool_input", query)
        logger.info(f"[{session_id}] AI Router chose tool: '{tool_name}' with reasoning: '{decision.get('reasoning')}'")

        tool_info = tool_registry.get_tool_info(tool_name)
        if not tool_info:
            raise ValueError(f"Tool '{tool_name}' not found in registry.")

        if tool_info.get("requires_file") and not file_path:
            content = f"The '{tool_name.replace('_', ' ')}' tool requires a file, but none was provided. Please upload a file."
            mem.add_message(db, session_id, "user", query, metadata=user_metadata)
            mem.add_message(db, session_id, "assistant", content, metadata={"tool_used": "clarification"})
            return {"type": "clarification", "content": content, "tool_info": tool_info}

        tool_function = tool_info["function"]
        result_content: Any = None
        
        if tool_name == "code_runner":
            code_to_run = tool_input
            code_block_response = f"Certainly! Here is the Python code for your request. I'll execute it as well to show you the output.\n\n```python\n{code_to_run.strip()}\n```\n\n---"
            execution_result = await tool_function(code_to_run)
            result_content = f"{code_block_response}\n\n{execution_result}"
        elif tool_name in ["doc_analyzer", "img_analyzer", "vision_analyzer", "audio_transcriber"]:
            result_content = await tool_function(file_path, tool_input)
        elif tool_name in ["general_chat", "chat_summarizer"]:
            result_content = await tool_function(tool_input, db, session_id)
        else:
            result_content = await tool_function(tool_input)

        final_content = ""
        assistant_metadata = {"tool_used": tool_name}
        api_response_data = {}

        if isinstance(result_content, dict):
            final_content = result_content.get("content", "Task completed.")
            if "attachment" in result_content:
                assistant_metadata["attachment"] = result_content["attachment"]
            api_response_data = result_content
        else:
            final_content = str(result_content)
            api_response_data = {"content": final_content}
        
        mem.add_message(db, session_id, "user", query, metadata=user_metadata)
        mem.add_message(db, session_id, "assistant", final_content, metadata=assistant_metadata)
        
        logger.info(f"[{session_id}] Successfully processed request with tool: {tool_name}")
        
        return {
            **api_response_data,
            "tool_info": { "name": tool_name, "description": tool_info.get("description", "") }
        }

    except Exception as e:
        logger.error(f"[{session_id}] An unexpected error occurred during routing: {e}", exc_info=True)
        fallback_content = await tool_registry._tools["general_chat"]["function"](query, db, session_id)
        
        mem.add_message(db, session_id, "user", query, metadata=user_metadata)
        mem.add_message(db, session_id, "assistant", fallback_content, metadata={"tool_used": "general_chat", "error": str(e)})

        return {
            "content": fallback_content,
            "tool_info": { "name": "general_chat", "description": "Engages in intelligent conversation." }
        }