"""
Document API endpoints for the CME Rules Navigator.
"""
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import FileResponse
from typing import Optional

from app.models.schemas import (
    DocumentSearchRequest,
    DocumentSearchResponse,
    DocumentInfo,
    TextPosition,
    IndexingStatus,
)
from app.services.pdf_service import PDFService
from app.services.vector_service import VectorService

router = APIRouter()

# Initialize PDF service
pdf_service = PDFService()


@router.get("/list", response_model=list[DocumentInfo])
async def list_documents():
    """
    List all available CME documents.

    Returns basic information about each document including
    title, filename, and page count.
    """
    return pdf_service.list_documents()


@router.post("/search", response_model=DocumentSearchResponse)
async def search_documents(request: DocumentSearchRequest, req: Request):
    """
    Search for documents matching a query.

    Uses semantic search to find the most relevant document
    sections based on the query text.
    """
    vector_service: VectorService = req.app.state.vector_service

    citations = vector_service.search(
        query=request.query,
        limit=request.limit,
        document_filter=request.document_filter
    )

    return DocumentSearchResponse(
        results=citations,
        total_found=len(citations),
        query=request.query
    )


@router.get("/search")
async def search_documents_get(
    req: Request,
    query: str = Query(..., description="Search query"),
    limit: int = Query(5, description="Maximum results"),
    document_id: Optional[str] = Query(None, description="Filter by document")
):
    """
    Search documents using GET request.

    Alternative to POST for simpler integrations.
    """
    vector_service: VectorService = req.app.state.vector_service

    citations = vector_service.search(
        query=query,
        limit=limit,
        document_filter=document_id
    )

    return DocumentSearchResponse(
        results=citations,
        total_found=len(citations),
        query=query
    )


@router.get("/{document_id}/page/{page_number}")
async def get_document_page(
    document_id: str,
    page_number: int,
    highlight_text: Optional[str] = Query(None, description="Text to highlight")
):
    """
    Get information about a specific document page.

    Returns page dimensions and optionally finds positions
    for text highlighting.
    """
    try:
        dimensions = pdf_service.get_page_dimensions(document_id, page_number)

        # Find highlight positions if text provided
        positions = []
        if highlight_text:
            positions = pdf_service.find_text_positions(
                document_id,
                page_number,
                highlight_text
            )

        filename = document_id.replace("CME-", "") + ".pdf"

        return {
            "document_id": document_id,
            "page_number": page_number,
            "dimensions": dimensions,
            "highlight_positions": [p.model_dump() for p in positions],
            "pdf_url": f"/pdfs/{filename}#page={page_number}"
        }

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Document not found: {document_id}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{document_id}/text/{page_number}")
async def get_page_text(document_id: str, page_number: int):
    """
    Extract text content from a specific page.

    Returns the full text and word positions for precise highlighting.
    """
    try:
        text, words = pdf_service.extract_page_text_with_positions(
            document_id,
            page_number
        )

        return {
            "document_id": document_id,
            "page_number": page_number,
            "text": text,
            "word_count": len(words),
            "words": words[:100]  # Limit words in response
        }

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Document not found: {document_id}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{document_id}/info")
async def get_document_info(document_id: str):
    """
    Get detailed information about a document.
    """
    documents = pdf_service.list_documents()
    doc = next((d for d in documents if d.document_id == document_id), None)

    if not doc:
        raise HTTPException(status_code=404, detail=f"Document not found: {document_id}")

    return doc


@router.get("/indexing/status", response_model=IndexingStatus)
async def get_indexing_status(req: Request):
    """
    Get the current status of document indexing.
    """
    vector_service: VectorService = req.app.state.vector_service
    stats = vector_service.get_collection_stats()
    documents = pdf_service.list_documents()

    return IndexingStatus(
        total_documents=len(documents),
        indexed_documents=len(documents) if stats["total_chunks"] > 0 else 0,
        total_chunks=stats["total_chunks"],
        is_complete=stats["total_chunks"] > 0,
        last_updated=None
    )


@router.post("/find-positions")
async def find_text_positions(
    document_id: str = Query(...),
    page_number: int = Query(...),
    search_text: str = Query(...)
):
    """
    Find the exact positions of text on a page for highlighting.

    Returns bounding box coordinates that can be used to draw
    highlight rectangles over the PDF.
    """
    positions = pdf_service.find_text_positions(
        document_id,
        page_number,
        search_text
    )

    return {
        "document_id": document_id,
        "page_number": page_number,
        "search_text": search_text,
        "positions": [p.model_dump() for p in positions],
        "found": len(positions) > 0
    }
