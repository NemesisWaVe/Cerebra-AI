# core/models.py

from sqlalchemy import Column, String, DateTime, JSON, Integer, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone # <-- ADD timezone

from .database import Base

class ChatSession(Base):
    __tablename__ = "sessions"

    session_id = Column(String, primary_key=True, index=True)
    title = Column(String, default="New Chat")

    # --- THESE LINES ARE FIXED ---
    start_time = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_activity = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    message_count = Column(Integer, default=0)
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "messages"

    message_id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.session_id"), nullable=False, index=True)
    role = Column(String, nullable=False)
    content = Column(String, nullable=False)

    # --- THIS LINE IS FIXED ---
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    tool_metadata = Column(JSON)
    session = relationship("ChatSession", back_populates="messages")