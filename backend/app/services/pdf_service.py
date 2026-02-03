"""
PDF parsing service using PyMuPDF for text extraction with position tracking.
"""
import fitz  # PyMuPDF
import os
import re
from typing import Generator
from pathlib import Path

from app.models.schemas import DocumentChunk, TextPosition, DocumentInfo


class PDFService:
    """Service for parsing PDFs and extracting text with positions."""

    def __init__(self, pdf_directory: str = None):
        """Initialize PDF service with directory containing PDFs."""
        if pdf_directory is None:
            # Default to public/CME directory
            pdf_directory = os.path.join(
                os.path.dirname(__file__),
                "../../../public/CME"
            )
        self.pdf_directory = Path(pdf_directory).resolve()

    def get_pdf_path(self, document_id: str) -> Path:
        """Get the full path for a document ID."""
        # Document ID format: "CME-101" -> "101.pdf"
        filename = document_id.replace("CME-", "") + ".pdf"
        return self.pdf_directory / filename

    def list_documents(self) -> list[DocumentInfo]:
        """List all available PDF documents."""
        documents = []
        if not self.pdf_directory.exists():
            return documents

        for pdf_file in sorted(self.pdf_directory.glob("*.pdf")):
            doc_id = f"CME-{pdf_file.stem}"
            try:
                doc = fitz.open(pdf_file)
                documents.append(DocumentInfo(
                    document_id=doc_id,
                    title=self._format_title(pdf_file.stem),
                    filename=pdf_file.name,
                    total_pages=len(doc),
                    indexed_chunks=0,  # Will be updated after indexing
                    pdf_url=f"/pdfs/{pdf_file.name}"
                ))
                doc.close()
            except Exception as e:
                print(f"Error reading {pdf_file}: {e}")
                continue

        return documents

    def _format_title(self, stem: str) -> str:
        """Format document title from filename stem."""
        # Handle special cases
        if stem == "CME-Bylaws":
            return "CME Group Bylaws"
        elif stem == "CME-Certificate-of-Incorporation":
            return "CME Certificate of Incorporation"
        elif stem == "CME_Definitions":
            return "CME Definitions"
        elif stem.isdigit():
            return f"CME Rule {stem}"
        elif re.match(r"^\d+[A-Z]$", stem):
            return f"CME Rule {stem}"
        else:
            return f"CME {stem.replace('-', ' ').replace('_', ' ').title()}"

    def extract_page_text_with_positions(
        self,
        document_id: str,
        page_number: int
    ) -> tuple[str, list[dict]]:
        """
        Extract text from a specific page with word positions.

        Returns:
            Tuple of (full_text, list of word_info dicts with positions)
        """
        pdf_path = self.get_pdf_path(document_id)
        if not pdf_path.exists():
            raise FileNotFoundError(f"Document not found: {document_id}")

        doc = fitz.open(pdf_path)
        if page_number < 1 or page_number > len(doc):
            doc.close()
            raise ValueError(f"Page {page_number} out of range (1-{len(doc)})")

        page = doc[page_number - 1]  # 0-indexed

        # Get text blocks with positions
        blocks = page.get_text("dict")["blocks"]

        words_with_positions = []
        full_text_parts = []

        for block in blocks:
            if block.get("type") == 0:  # Text block
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        text = span.get("text", "").strip()
                        if text:
                            bbox = span.get("bbox", [0, 0, 0, 0])
                            words_with_positions.append({
                                "text": text,
                                "position": TextPosition(
                                    x0=bbox[0],
                                    y0=bbox[1],
                                    x1=bbox[2],
                                    y1=bbox[3]
                                )
                            })
                            full_text_parts.append(text)

        doc.close()
        return " ".join(full_text_parts), words_with_positions

    def extract_document_chunks(
        self,
        document_id: str,
        chunk_size: int = 500,
        chunk_overlap: int = 100
    ) -> Generator[DocumentChunk, None, None]:
        """
        Extract text chunks from entire document for indexing.

        Args:
            document_id: Document identifier
            chunk_size: Target size of each chunk in characters
            chunk_overlap: Overlap between chunks for context

        Yields:
            DocumentChunk objects with text and positions
        """
        pdf_path = self.get_pdf_path(document_id)
        if not pdf_path.exists():
            raise FileNotFoundError(f"Document not found: {document_id}")

        doc = fitz.open(pdf_path)
        title = self._format_title(pdf_path.stem)

        chunk_index = 0

        for page_num in range(len(doc)):
            page = doc[page_num]

            # Get text with positions
            text_dict = page.get_text("dict")

            # Collect all text spans with their positions
            page_spans = []
            for block in text_dict.get("blocks", []):
                if block.get("type") == 0:
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            text = span.get("text", "")
                            if text.strip():
                                bbox = span.get("bbox", [0, 0, 0, 0])
                                page_spans.append({
                                    "text": text,
                                    "bbox": bbox
                                })

            # Build chunks from page content
            current_chunk_text = []
            current_chunk_positions = []
            current_length = 0

            for span in page_spans:
                text = span["text"]
                bbox = span["bbox"]

                if current_length + len(text) > chunk_size and current_chunk_text:
                    # Yield current chunk
                    yield DocumentChunk(
                        id=f"{document_id}-p{page_num + 1}-c{chunk_index}",
                        document_id=document_id,
                        document_title=title,
                        page_number=page_num + 1,
                        chunk_index=chunk_index,
                        text=" ".join(current_chunk_text),
                        positions=[
                            TextPosition(x0=p[0], y0=p[1], x1=p[2], y1=p[3])
                            for p in current_chunk_positions
                        ]
                    )
                    chunk_index += 1

                    # Start new chunk with overlap
                    overlap_text = current_chunk_text[-3:] if len(current_chunk_text) > 3 else current_chunk_text
                    overlap_positions = current_chunk_positions[-3:] if len(current_chunk_positions) > 3 else current_chunk_positions
                    current_chunk_text = overlap_text.copy()
                    current_chunk_positions = overlap_positions.copy()
                    current_length = sum(len(t) for t in current_chunk_text)

                current_chunk_text.append(text)
                current_chunk_positions.append(bbox)
                current_length += len(text)

            # Yield remaining chunk from page
            if current_chunk_text:
                yield DocumentChunk(
                    id=f"{document_id}-p{page_num + 1}-c{chunk_index}",
                    document_id=document_id,
                    document_title=title,
                    page_number=page_num + 1,
                    chunk_index=chunk_index,
                    text=" ".join(current_chunk_text),
                    positions=[
                        TextPosition(x0=p[0], y0=p[1], x1=p[2], y1=p[3])
                        for p in current_chunk_positions
                    ]
                )
                chunk_index += 1

        doc.close()

    def find_text_positions(
        self,
        document_id: str,
        page_number: int,
        search_text: str
    ) -> list[TextPosition]:
        """
        Find positions of specific text on a page for highlighting.

        Args:
            document_id: Document identifier
            page_number: Page number (1-indexed)
            search_text: Text to find on the page

        Returns:
            List of TextPosition objects for each match
        """
        pdf_path = self.get_pdf_path(document_id)
        if not pdf_path.exists():
            return []

        doc = fitz.open(pdf_path)
        if page_number < 1 or page_number > len(doc):
            doc.close()
            return []

        page = doc[page_number - 1]

        # Search for text instances
        positions = []
        text_instances = page.search_for(search_text)

        for rect in text_instances:
            positions.append(TextPosition(
                x0=rect.x0,
                y0=rect.y0,
                x1=rect.x1,
                y1=rect.y1
            ))

        doc.close()
        return positions

    def get_page_dimensions(self, document_id: str, page_number: int) -> dict:
        """Get the dimensions of a specific page."""
        pdf_path = self.get_pdf_path(document_id)
        if not pdf_path.exists():
            raise FileNotFoundError(f"Document not found: {document_id}")

        doc = fitz.open(pdf_path)
        if page_number < 1 or page_number > len(doc):
            doc.close()
            raise ValueError(f"Page {page_number} out of range")

        page = doc[page_number - 1]
        rect = page.rect

        dimensions = {
            "width": rect.width,
            "height": rect.height,
            "page_number": page_number,
            "total_pages": len(doc)
        }

        doc.close()
        return dimensions
