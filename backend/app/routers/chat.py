"""
Chat API endpoints for the CME Rules Navigator.
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
import uuid
import json
import asyncio
from datetime import datetime
from typing import Optional

from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    Citation,
)
from app.services.vector_service import VectorService
from app.services.llm_service import LLMService
from app.services.pdf_service import PDFService

router = APIRouter()

# In-memory session storage (use Redis for production)
sessions: dict[str, list[dict]] = {}


def get_or_create_session(session_id: Optional[str]) -> tuple[str, list[dict]]:
    """Get existing session or create new one."""
    if session_id and session_id in sessions:
        return session_id, sessions[session_id]

    new_id = str(uuid.uuid4())
    sessions[new_id] = []
    return new_id, sessions[new_id]


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest, req: Request):
    """
    Send a message and get an AI response with citations.

    The AI will:
    1. Search the vector database for relevant document chunks
    2. Generate a response using Gemini with the retrieved context
    3. Return citations with exact page numbers and text positions
    """
    try:
        # Get vector service from app state
        vector_service: VectorService = req.app.state.vector_service

        # Get or create session
        session_id, history = get_or_create_session(request.session_id)

        # Add user message to history
        history.append({
            "role": "user",
            "content": request.message,
            "timestamp": datetime.now().isoformat()
        })

        # Search for relevant documents
        citations = []
        if request.include_citations:
            citations = vector_service.search(
                query=request.message,
                limit=5
            )

        # Generate AI response
        try:
            llm_service = LLMService()
            response_text = llm_service.generate_response(
                query=request.message,
                citations=citations,
                conversation_history=history[:-1]  # Exclude current message
            )
        except ValueError as e:
            # API key not configured - return helpful message
            response_text = (
                "I can search the CME rulebook for you, but AI responses require "
                "a Google API key to be configured. Please set the GOOGLE_API_KEY "
                "environment variable.\n\n"
                "In the meantime, here are the relevant sections I found:"
            )
            if citations:
                response_text += "\n\n"
                for i, citation in enumerate(citations, 1):
                    response_text += f"**{i}. {citation.document_title}** (Page {citation.page_number})\n"
                    response_text += f"{citation.excerpt[:200]}...\n\n"

        # Add assistant message to history
        history.append({
            "role": "assistant",
            "content": response_text,
            "timestamp": datetime.now().isoformat()
        })

        return ChatResponse(
            message=response_text,
            citations=citations,
            session_id=session_id,
            timestamp=datetime.now()
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
async def chat_stream(request: ChatRequest, req: Request):
    """
    Stream a chat response for real-time UI updates.

    Returns a Server-Sent Events stream with:
    - 'citations' event: Document citations found
    - 'content' events: Chunks of the AI response
    - 'done' event: End of stream
    """
    vector_service: VectorService = req.app.state.vector_service

    async def generate():
        try:
            # Get or create session
            session_id, history = get_or_create_session(request.session_id)

            # Search for relevant documents first
            citations = []
            if request.include_citations:
                citations = vector_service.search(
                    query=request.message,
                    limit=5
                )

                # Send citations immediately
                citations_data = [c.model_dump() for c in citations]
                yield f"event: citations\ndata: {json.dumps({'citations': citations_data, 'session_id': session_id})}\n\n"

            # Generate AI response
            try:
                llm_service = LLMService()
                response_text = llm_service.generate_response(
                    query=request.message,
                    citations=citations,
                    conversation_history=history
                )

                # Stream response in chunks (simulating streaming)
                words = response_text.split()
                chunk_size = 5
                for i in range(0, len(words), chunk_size):
                    chunk = " ".join(words[i:i + chunk_size])
                    yield f"event: content\ndata: {json.dumps({'text': chunk + ' '})}\n\n"
                    await asyncio.sleep(0.05)  # Small delay for streaming effect

            except ValueError:
                # API key not configured
                error_msg = "AI responses require GOOGLE_API_KEY to be configured."
                yield f"event: content\ndata: {json.dumps({'text': error_msg})}\n\n"

            # Add to history
            history.append({"role": "user", "content": request.message})
            history.append({"role": "assistant", "content": response_text if 'response_text' in dir() else ""})

            yield f"event: done\ndata: {json.dumps({'session_id': session_id})}\n\n"

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get chat history for a session."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session_id": session_id,
        "messages": sessions[session_id]
    }


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a chat session."""
    if session_id in sessions:
        del sessions[session_id]
    return {"status": "deleted", "session_id": session_id}


@router.get("/sessions")
async def list_sessions():
    """List all active sessions."""
    return {
        "sessions": [
            {
                "session_id": sid,
                "message_count": len(msgs),
                "last_message": msgs[-1] if msgs else None
            }
            for sid, msgs in sessions.items()
        ]
    }
