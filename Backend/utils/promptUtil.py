from typing import Dict, Any, Optional

def get_router_prompt(file_path: Optional[str], conversation_history: Optional[str], available_tools: Dict[str, Dict[str, Any]]) -> str:
    """
    Generates the system prompt for the router LLM to help it decide which tool to use.
    Enhanced version with conversation context and dynamic tool descriptions.
    """
    file_context = "A file has been provided by the user." if file_path else "No file has been provided."
    
    # Build tool descriptions dynamically
    tool_descriptions = []
    for i, (tool_name, tool_info) in enumerate(available_tools.items(), 1):
        if tool_name == "general_chat":
            continue  # Handle general_chat separately
        desc = f"{i}. `{tool_name}`: {tool_info['description']}"
        if tool_info.get('requires_file'):
            desc += " Requires a file."
        tool_descriptions.append(desc)
    
    # Add general_chat as the last option
    tool_descriptions.append(f"{len(tool_descriptions) + 1}. `general_chat`: Use this for any other query, like a general conversation, a question that doesn't require a tool, or if you are unsure.")
    
    tools_text = "\n".join(tool_descriptions)
    
    # Add conversation context if available
    context_section = ""
    if conversation_history:
        context_section = f"""
Previous conversation context:
{conversation_history}

Consider this context when routing the request."""

    prompt = f"""
You are an expert routing agent. Your job is to determine the best tool to use based on the user's query and context.
Respond ONLY with a JSON object. Do not add any other text or explanations.

The available tools are:
{tools_text}

Current context: {file_context}
{context_section}

Routing guidelines:
- If the user mentions or references a file they've uploaded, consider file-based tools
- For image creation requests (draw, generate, create image/picture), use img_gen
- For code execution requests (run, execute, test code), use code_runner
- Consider the conversation history when making decisions
- Default to general_chat if unclear
- For requests to 'summarize the chat' or 'recap our conversation', use the chat_summarizer tool.
- If the user mentions or references a file they've uploaded, consider file-based tools.

Your response MUST be a JSON object with these keys:
- "tool": A string with the name of the tool to use
- "tool_input": The input for the tool (can be the original query or a modified version)
- "confidence": A float between 0 and 1 indicating your confidence in this choice
- "reasoning": A brief explanation of why you chose this tool

Examples:
- User: "Summarize this video" -> {{"tool": "video_analyzer", "tool_input": "", "confidence": 0.95, "reasoning": "User wants video summary and likely uploaded a video file"}}
- User: "Create an image of a sunset" -> {{"tool": "img_gen", "tool_input": "A beautiful sunset with orange and pink sky over the ocean", "confidence": 0.9, "reasoning": "User explicitly requests image creation"}}
- User: "What's the weather today?" -> {{"tool": "general_chat", "tool_input": "What's the weather today?", "confidence": 0.8, "reasoning": "General question not requiring specific tools"}}
"""
    return prompt.strip()


def get_conversation_context(messages: list, max_messages: int = 5) -> str:
    """
    Format conversation history for context.
    
    Args:
        messages: List of message dictionaries with 'role' and 'content'
        max_messages: Maximum number of recent messages to include
        
    Returns:
        Formatted conversation context string
    """
    if not messages:
        return ""
    
    # Take the most recent messages
    recent_messages = messages[-max_messages:] if len(messages) > max_messages else messages
    
    context_parts = []
    for msg in recent_messages:
        role = msg.get('role', 'unknown').title()
        content = msg.get('content', '')
        # Truncate long messages
        if len(content) > 200:
            content = content[:197] + "..."
        context_parts.append(f"{role}: {content}")
    
    return "\n".join(context_parts)


def get_analysis_prompt(content: str, query: str, content_type: str = "document") -> str:
    """
    Generate a prompt for content analysis (documents, videos, etc.)
    
    Args:
        content: The content to analyze
        query: The user's original query
        content_type: Type of content being analyzed
        
    Returns:
        Formatted analysis prompt
    """
    return f"""
Please analyze the following {content_type} content and respond to the user's query.

User Query: {query}

{content_type.title()} Content:
---
{content[:10000]}  # Limit content to avoid token limits
---

Please provide a comprehensive response that:
1. Directly addresses the user's query
2. Includes relevant details from the {content_type}
3. Highlights key points or insights
4. Is well-structured and easy to understand
"""


def get_code_execution_prompt(code: str) -> str:
    """
    Generate a prompt for code execution context.
    
    Args:
        code: The code to be executed
        
    Returns:
        Formatted code execution prompt
    """
    return f"""
The following Python code will be executed:

```python
{code}
```

This code will be run in a sandboxed environment with a 15-second timeout.
Note: For security, certain operations may be restricted.
"""


def get_image_generation_prompt(user_prompt: str) -> str:
    """
    Enhance user prompt for better image generation.
    
    Args:
        user_prompt: The user's original image description
        
    Returns:
        Enhanced prompt for image generation
    """
    # Clean the prompt
    enhanced = user_prompt.strip()
    
    # Add quality modifiers if not present
    quality_keywords = ['detailed', 'high quality', 'professional', '4k', '8k', 'masterpiece']
    has_quality = any(keyword in enhanced.lower() for keyword in quality_keywords)
    
    if not has_quality:
        enhanced = f"High quality, detailed {enhanced}"
    
    # Add style hints if not present
    style_keywords = ['style', 'art', 'photo', 'painting', 'digital', 'realistic']
    has_style = any(keyword in enhanced.lower() for keyword in style_keywords)
    
    if not has_style:
        enhanced = f"{enhanced}, digital art style"
    
    return enhanced

def get_vision_extraction_prompt(user_query: str) -> str:
    """
    Creates a prompt for a vision model to extract relevant information from an image
    based on the user's original query.
    """
    return f"""
The user has uploaded an image and provided the following query: "{user_query}"
Your task is to analyze the image and extract all text and relevant information that will help answer the user's query.
Respond ONLY with the extracted information. Do not answer the query itself.
"""

def get_error_prompt(error_type: str, error_details: str) -> str:
    """
    Generate a user-friendly error message.
    
    Args:
        error_type: Type of error that occurred
        error_details: Detailed error information
        
    Returns:
        User-friendly error message
    """
    error_messages = {
        "file_not_found": "I couldn't find the file you uploaded. Please try uploading it again.",
        "unsupported_format": "The file format isn't supported. Please use PDF, TXT, MP4, MP3, or other common formats.",
        "processing_timeout": "The operation took too long to complete. Please try with a smaller file or simpler request.",
        "model_unavailable": "The AI model is currently unavailable. Please check if Ollama is running.",
        "general": "An unexpected error occurred. Please try again or contact support if the issue persists."
    }
    
    base_message = error_messages.get(error_type, error_messages["general"])
    
    if error_details and len(error_details) < 200:
        return f"{base_message}\n\nTechnical details: {error_details}"
    
    return base_message

def get_title_generation_prompt(user_prompt: str) -> str:
    """
    Generates a prompt for the LLM to create a short title for a conversation.
    """
    return f"""
Based on the following user query, create a short, concise title for the conversation.
The title should be no more than 5 words.
Respond ONLY with the title itself, and nothing else. Do not add quotes.

User Query: "{user_prompt}"

Title:
"""

def get_summary_prompt(content: str, max_length: int = 500) -> str:
    """
    Generate a prompt for content summarization.
    
    Args:
        content: Content to summarize
        max_length: Maximum length of summary in words
        
    Returns:
        Summarization prompt
    """
    return f"""
Please provide a concise summary of the following content in approximately {max_length} words or less.

Content:
---
{content[:15000]}  # Limit to avoid token issues
---

Summary requirements:
1. Capture the main points and key insights
2. Maintain the original meaning and context
3. Use clear and concise language
4. Organize information logically
5. Highlight any important conclusions or recommendations
"""