"""
Pydantic schemas for API request/response models.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class TextPosition(BaseModel):
    """Position of text within a PDF page for highlighting."""
    x0: float = Field(..., description="Left x coordinate")
    y0: float = Field(..., description="Top y coordinate")
    x1: float = Field(..., description="Right x coordinate")
    y1: float = Field(..., description="Bottom y coordinate")


class Citation(BaseModel):
    """A citation reference to a specific location in a document."""
    id: str = Field(..., description="Unique citation identifier")
    document_id: str = Field(..., description="Document identifier (e.g., 'CME-101')")
    document_title: str = Field(..., description="Human-readable document title")
    page_number: int = Field(..., description="Page number in the document")
    excerpt: str = Field(..., description="Relevant text excerpt from the document")
    positions: list[TextPosition] = Field(
        default_factory=list,
        description="Text positions for highlighting on the PDF"
    )
    relevance_score: float = Field(
        default=1.0,
        description="Relevance score from vector search (0-1)"
    )
    pdf_url: str = Field(..., description="URL to access the PDF file")


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""
    message: str = Field(..., description="User's question or message")
    session_id: Optional[str] = Field(
        default=None,
        description="Session ID for conversation context"
    )
    include_citations: bool = Field(
        default=True,
        description="Whether to include document citations in response"
    )


class ChatResponse(BaseModel):
    """Response from chat endpoint."""
    message: str = Field(..., description="AI assistant's response")
    citations: list[Citation] = Field(
        default_factory=list,
        description="Document citations supporting the response"
    )
    session_id: str = Field(..., description="Session ID for this conversation")
    timestamp: datetime = Field(
        default_factory=datetime.now,
        description="Response timestamp"
    )


class DocumentChunk(BaseModel):
    """A chunk of text from a document with metadata."""
    id: str
    document_id: str
    document_title: str
    page_number: int
    chunk_index: int
    text: str
    positions: list[TextPosition] = Field(default_factory=list)


class DocumentInfo(BaseModel):
    """Information about an indexed document."""
    document_id: str
    title: str
    filename: str
    total_pages: int
    indexed_chunks: int
    pdf_url: str


class DocumentSearchRequest(BaseModel):
    """Request for document search."""
    query: str = Field(..., description="Search query")
    limit: int = Field(default=5, description="Maximum results to return")
    document_filter: Optional[str] = Field(
        default=None,
        description="Filter to specific document ID"
    )


class DocumentSearchResponse(BaseModel):
    """Response from document search."""
    results: list[Citation]
    total_found: int
    query: str


class DocumentPageRequest(BaseModel):
    """Request for a specific document page with highlights."""
    document_id: str
    page_number: int
    highlight_positions: list[TextPosition] = Field(default_factory=list)


class IndexingStatus(BaseModel):
    """Status of document indexing."""
    total_documents: int
    indexed_documents: int
    total_chunks: int
    is_complete: bool
    last_updated: Optional[datetime] = None
