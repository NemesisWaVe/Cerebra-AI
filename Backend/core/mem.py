# core/mem.py

import time
from datetime import datetime, timezone # <-- ADD timezone
from typing import List, Optional, Any, Dict
from sqlalchemy.orm import Session

from utils.logger import get_logger
from utils.promptUtil import get_title_generation_prompt
from core.llm import llm_client
from .models import ChatSession, ChatMessage

logger = get_logger(__name__)

def _generate_and_set_title(db: Session, session: ChatSession, first_message_content: str):
    # This function remains the same
    try:
        if session.title != "New Chat":
            return
        logger.info(f"[{session.session_id}] Generating title based on first message...")
        prompt = get_title_generation_prompt(first_message_content)
        title = llm_client.generate_response(prompt)
        cleaned_title = title.strip().replace('"', '').replace("'", "")
        session.title = cleaned_title if cleaned_title else "Untitled Chat"
        db.commit()
        logger.info(f"[{session.session_id}] Set chat title to: '{session.title}'")
    except Exception as e:
        logger.error(f"[{session.session_id}] Failed to generate chat title: {e}")
        db.rollback()

def get_session(db: Session, session_id: str) -> Optional[ChatSession]:
    return db.query(ChatSession).filter(ChatSession.session_id == session_id).first()

def add_message(db: Session, session_id: str, role: str, content: str, metadata: Optional[Dict[str, Any]] = None) -> str:
    if not content.strip():
        return ""

    session = get_session(db, session_id)
    is_first_user_message = False
    if not session:
        session = ChatSession(session_id=session_id)
        db.add(session)
        is_first_user_message = (role == 'user')
        logger.info(f"[{session_id}] Created new chat session in database.")

    # --- THIS LINE IS FIXED ---
    session.last_activity = datetime.now(timezone.utc)
    session.message_count = (session.message_count or 0) + 1

    message_id = f"{session_id}_{int(time.time() * 1000)}"
    db_message = ChatMessage(
        message_id=message_id,
        session_id=session_id,
        role=role,
        content=content,
        timestamp=datetime.now(timezone.utc), # Also ensure this is aware
        tool_metadata=metadata or {}
    )
    db.add(db_message)
    db.commit()
    db.refresh(session)
    
    if is_first_user_message:
        _generate_and_set_title(db, session, content)

    logger.debug(f"[{session_id}] Stored '{role}' message to DB: {content[:50]}...")
    return message_id

# (The rest of the file is correct and remains the same)
def get_history(session_id: str, db: Session, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    # ... (no changes needed here)
    query = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.timestamp.asc())
    if limit:
        count = query.count()
        messages = query.offset(max(0, count - limit)).all()
    else:
        messages = query.all()
    return [{"id": msg.message_id, "message_id": msg.message_id, "session_id": msg.session_id, "role": msg.role, "content": msg.content, "timestamp": msg.timestamp.isoformat(), "metadata": msg.tool_metadata} for msg in messages]

def get_recent_context(session_id: str, db: Session, max_messages: int = 5) -> str:
    # ... (no changes needed here)
    recent_messages = get_history(session_id, db, limit=max_messages)
    if not recent_messages: return ""
    context_parts = []
    for msg in recent_messages:
        role = msg["role"].title()
        content = msg["content"][:200] + "..." if len(msg["content"]) > 200 else msg["content"]
        context_parts.append(f"{role}: {content}")
    return "\n".join(context_parts)

def get_all_sessions(db: Session) -> List[ChatSession]:
    # ... (no changes needed here)
    return db.query(ChatSession).order_by(ChatSession.last_activity.desc()).all()

def clear_session(session_id: str, db: Session) -> bool:
    # ... (no changes needed here)
    session = get_session(db, session_id)
    if session:
        db.delete(session)
        db.commit()
        logger.info(f"Deleted session {session_id} from database.")
        return True
    logger.warning(f"Attempted to delete non-existent session: {session_id}")
    return False