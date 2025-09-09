# app.py

import os
import uuid
import time
import shutil
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dateutil.relativedelta import relativedelta
from pydantic import BaseModel

from config import settings
from utils.logger import get_logger
from utils.fileUtil import save_temp_file
from utils.previewUtil import generate_preview
from core.router import route_request
from core import mem, models, database

logger = get_logger(__name__)

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="Your intelligent AI assistant that thinks outside the box",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# This function correctly manages the database session lifecycle.
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

UPLOADS_DIR = os.path.join("static", "uploads")
os.makedirs("static/generated_images", exist_ok=True)
os.makedirs("static/previews", exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[Any, Any]] = None
    session_id: str
    timestamp: datetime
    processing_time: Optional[float] = None

@app.post("/api/v1/process", response_model=APIResponse)
async def process_user_request(
    query: str = Form(...),
    session_id: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    start_time = time.time()
    current_session_id = session_id or str(uuid.uuid4())
    logger.info(f"[{current_session_id}] New request: '{query[:100]}...'")
    if file:
        logger.info(f"[{current_session_id}] File attached: {file.filename}")

    temp_file_path = None
    permanent_file_path = None
    attachment_data = None

    try:
        if file:
            if file.size > settings.MAX_FILE_SIZE:
                raise HTTPException(status_code=413, detail="File too large")

            temp_file_path = await save_temp_file(file, current_session_id)
            safe_filename = os.path.basename(file.filename)
            unique_filename = f"{current_session_id}_{safe_filename}"
            permanent_file_path = os.path.join(UPLOADS_DIR, unique_filename)
            shutil.move(temp_file_path, permanent_file_path)

            preview_info = await generate_preview(permanent_file_path, file.filename)
            
            if preview_info:
                attachment_data = {
                    "fileName": file.filename,
                    "fileType": preview_info.get("fileType", "document"),
                    "previewUrl": preview_info.get("previewUrl"),
                    "fileUrl": f"{settings.BACKEND_URL}/static/uploads/{unique_filename}"
                }

        response_data = await route_request(
            query, 
            permanent_file_path,
            current_session_id, 
            db, 
            attachment_data=attachment_data
        )
        
        processing_time = time.time() - start_time
        logger.info(f"[{current_session_id}] Processed in {processing_time:.2f}s")
        
        return APIResponse(
            success=True, message="Request processed successfully!", data=response_data,
            session_id=current_session_id, timestamp=datetime.now(timezone.utc), processing_time=processing_time
        )
    except Exception as e:
        logger.error(f"An error occurred in process_user_request: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        pass

# --- SESSION MANAGEMENT ENDPOINTS ---

def get_relative_time_str(dt: datetime) -> str:
    """Calculate relative time with proper timezone handling"""
    # Ensure the datetime is timezone-aware
    if dt.tzinfo is None:
        # Assume UTC if no timezone info
        dt = dt.replace(tzinfo=timezone.utc)
    elif dt.tzinfo != timezone.utc:
        # Convert to UTC if it's in a different timezone
        dt = dt.astimezone(timezone.utc)
        
    now = datetime.now(timezone.utc)
    diff = relativedelta(now, dt)

    if diff.years > 0:
        return f"{diff.years}y ago"
    if diff.months > 0:
        return f"{diff.months}mo ago"  
    if diff.days > 0:
        return f"{diff.days}d ago"
    if diff.hours > 0:
        return f"{diff.hours}h ago"
    if diff.minutes > 0:
        return f"{diff.minutes}m ago"
    return "Just now"

@app.get("/api/v1/sessions", response_model=List[Dict[str, Any]])
async def get_sessions(db: Session = Depends(get_db)):
    """Returns a list of all active session summaries with proper timezone handling."""
    sessions = mem.get_all_sessions(db)
    return [
        {
            "session_id": s.session_id,
            "title": s.title,
            # Convert to ISO format for frontend consumption
            "start_time": s.start_time.isoformat() if s.start_time.tzinfo else s.start_time.replace(tzinfo=timezone.utc).isoformat(),
            "last_activity": s.last_activity.isoformat() if s.last_activity.tzinfo else s.last_activity.replace(tzinfo=timezone.utc).isoformat(),
            "message_count": s.message_count,
            "relative_time": get_relative_time_str(s.last_activity)
        }
        for s in sessions
    ]

@app.get("/api/v1/sessions/{session_id}")
async def get_session_history(session_id: str, db: Session = Depends(get_db)):
    """Returns the full message history for a given session with proper timezone handling."""
    history = mem.get_history(session_id, db)
    if not history and not mem.get_session(db, session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Calculate date separators and relative dates on the backend
    processed_history = []
    
    for i, message in enumerate(history):
        # Ensure proper timestamp format
        if isinstance(message.get('timestamp'), str):
            try:
                dt = datetime.fromisoformat(message['timestamp'].replace('Z', '+00:00'))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                message['timestamp'] = dt.isoformat()
            except:
                message['timestamp'] = datetime.now(timezone.utc).isoformat()
        
        # Calculate if we should show date separator
        show_date_separator = False
        date_separator_text = None
        
        if i == 0:  # First message always shows separator
            show_date_separator = True
        else:
            current_dt = datetime.fromisoformat(message['timestamp'].replace('Z', '+00:00'))
            previous_dt = datetime.fromisoformat(history[i-1]['timestamp'].replace('Z', '+00:00'))
            
            # Check if different days or significant time gap (4+ hours)
            current_date = current_dt.date()
            previous_date = previous_dt.date()
            time_diff = (current_dt - previous_dt).total_seconds()
            
            if current_date != previous_date or time_diff > 4 * 3600:  # 4 hours
                show_date_separator = True
        
        # Calculate the date separator text based on message date (not current date)
        if show_date_separator:
            msg_dt = datetime.fromisoformat(message['timestamp'].replace('Z', '+00:00'))
            msg_date = msg_dt.date()
            
            # Use the message's original date as reference, not today's date
            # This preserves the historical context of when messages were sent
            today = datetime.now(timezone.utc).date()
            yesterday = today - relativedelta(days=1)
            
            if msg_date == today:
                date_separator_text = "Today"
            elif msg_date == yesterday:
                date_separator_text = "Yesterday"
            else:
                # For older dates, use absolute formatting
                if msg_dt.year != datetime.now(timezone.utc).year:
                    date_separator_text = msg_dt.strftime("%b %d, %Y")
                else:
                    date_separator_text = msg_dt.strftime("%b %d")
        
        # Add the processed message with separator info
        processed_message = {
            **message,
            'show_date_separator': show_date_separator,
            'date_separator_text': date_separator_text
        }
        processed_history.append(processed_message)
    
    return processed_history

@app.delete("/api/v1/sessions/{session_id}", status_code=204)
async def delete_session(session_id: str, db: Session = Depends(get_db)):
    """Deletes a session and its message history."""
    success = mem.clear_session(session_id, db)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {}

@app.get("/api/v1/health")
async def health_check():
    """Health check - because we care about uptime!"""
    return {
        "status": "healthy",
        "message": f"{settings.APP_NAME} is running smoothly!",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0"
    }

@app.get("/api/v1/info")
async def app_info():
    """Get information about this amazing backend"""
    return {
        "name": settings.APP_NAME,
        "description": "Your intelligent multi-modal AI assistant",
        "version": "1.0.0",
        "author": "[Your Name]",
        "capabilities": [
            "Document Analysis (PDF, TXT, Code)",
            "Video & Audio Processing", 
            "AI Image Generation",
            "Code Execution & Testing",
            "Intelligent Conversation"
        ],
        "endpoints": {
            "process": "/api/v1/process",
            "health": "/api/v1/health",
            "docs": "/docs"
        }
    }

@app.get("/")
async def welcome():
    """Welcome message - first impressions matter!"""
    return {
        "message": f"Welcome to {settings.APP_NAME}!",
        "tagline": "Where AI meets creativity and intelligence meets intuition",
        "get_started": "/docs",
        "health_check": "/api/v1/health",
        "author": "Made with love by NemesisWaVe"
    }

# Error handlers for graceful failures
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    # Check if it's our custom 404 from get_session_history or delete_session
    if hasattr(exc, 'detail') and "Session not found" in exc.detail:
        return JSONResponse(status_code=404, content={"success": False, "message": exc.detail})
        
    return JSONResponse(
        status_code=404,
        content={
            "success": False,
            "message": "Endpoint not found! Check /docs for available routes",
            "available_endpoints": ["/api/v1/process", "/api/v1/health", "/docs"]
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    logger.error(f"Internal server error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error - our AI is having a moment",
            "help": "Please try again or contact support if the issue persists"
        }
    )

if __name__ == "__main__":
    import uvicorn
    
    logger.info("Starting Cerebra AI Backend...")
    logger.info("Built with passion and powered by curiosity")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        reload=True,
        log_level="info"
    )