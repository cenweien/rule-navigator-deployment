"""
Vector database service using ChromaDB for semantic search.
"""
import chromadb
from chromadb.config import Settings
import os
from typing import Optional
import json

from app.models.schemas import Citation, TextPosition, DocumentChunk


class VectorService:
    """Service for managing vector embeddings and semantic search."""

    def __init__(self, persist_directory: str = None):
        """
        Initialize ChromaDB with sentence-transformers embeddings.

        Args:
            persist_directory: Directory to persist the database
        """
        if persist_directory is None:
            persist_directory = os.path.join(
                os.path.dirname(__file__),
                "../../../data/chromadb"
            )

        self.persist_directory = persist_directory
        os.makedirs(persist_directory, exist_ok=True)

        # Initialize ChromaDB with persistence
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )

        # Get or create the main collection
        # Using ChromaDB's default embedding function (all-MiniLM-L6-v2)
        self.collection = self.client.get_or_create_collection(
            name="cme_rules",
            metadata={"description": "CME Trading Rules and Regulations"}
        )

    def add_chunk(self, chunk: DocumentChunk) -> None:
        """
        Add a document chunk to the vector database.

        Args:
            chunk: DocumentChunk with text and metadata
        """
        # Serialize positions for storage
        positions_json = json.dumps([
            {"x0": p.x0, "y0": p.y0, "x1": p.x1, "y1": p.y1}
            for p in chunk.positions
        ])

        self.collection.add(
            ids=[chunk.id],
            documents=[chunk.text],
            metadatas=[{
                "document_id": chunk.document_id,
                "document_title": chunk.document_title,
                "page_number": chunk.page_number,
                "chunk_index": chunk.chunk_index,
                "positions": positions_json
            }]
        )

    def add_chunks_batch(self, chunks: list[DocumentChunk]) -> None:
        """
        Add multiple chunks in a batch for efficiency.

        Args:
            chunks: List of DocumentChunk objects
        """
        if not chunks:
            return

        ids = []
        documents = []
        metadatas = []

        for chunk in chunks:
            positions_json = json.dumps([
                {"x0": p.x0, "y0": p.y0, "x1": p.x1, "y1": p.y1}
                for p in chunk.positions
            ])

            ids.append(chunk.id)
            documents.append(chunk.text)
            metadatas.append({
                "document_id": chunk.document_id,
                "document_title": chunk.document_title,
                "page_number": chunk.page_number,
                "chunk_index": chunk.chunk_index,
                "positions": positions_json
            })

        self.collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )

    def search(
        self,
        query: str,
        limit: int = 5,
        document_filter: Optional[str] = None
    ) -> list[Citation]:
        """
        Search for relevant document chunks.

        Args:
            query: Search query text
            limit: Maximum number of results
            document_filter: Optional document ID to filter results

        Returns:
            List of Citation objects with relevance scores
        """
        # Build where filter if document specified
        where_filter = None
        if document_filter:
            where_filter = {"document_id": document_filter}

        results = self.collection.query(
            query_texts=[query],
            n_results=limit,
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )

        citations = []

        if results and results["ids"] and results["ids"][0]:
            for i, chunk_id in enumerate(results["ids"][0]):
                metadata = results["metadatas"][0][i]
                document = results["documents"][0][i]
                distance = results["distances"][0][i] if results["distances"] else 0

                # Convert distance to relevance score (ChromaDB uses L2 distance)
                # Lower distance = higher relevance
                relevance_score = max(0, 1 - (distance / 2))

                # Parse positions from JSON
                positions = []
                if metadata.get("positions"):
                    try:
                        pos_data = json.loads(metadata["positions"])
                        positions = [
                            TextPosition(**p) for p in pos_data
                        ]
                    except (json.JSONDecodeError, TypeError):
                        pass

                # Build PDF URL
                doc_id = metadata["document_id"]
                filename = doc_id.replace("CME-", "") + ".pdf"
                pdf_url = f"/pdfs/{filename}"

                citations.append(Citation(
                    id=chunk_id,
                    document_id=doc_id,
                    document_title=metadata["document_title"],
                    page_number=metadata["page_number"],
                    excerpt=document[:300] + "..." if len(document) > 300 else document,
                    positions=positions[:5],  # Limit positions for response size
                    relevance_score=round(relevance_score, 3),
                    pdf_url=pdf_url
                ))

        return citations

    def get_collection_stats(self) -> dict:
        """Get statistics about the indexed collection."""
        count = self.collection.count()
        return {
            "total_chunks": count,
            "collection_name": "cme_rules",
            "persist_directory": self.persist_directory
        }

    def clear_collection(self) -> None:
        """Clear all documents from the collection."""
        self.client.delete_collection("cme_rules")
        self.collection = self.client.get_or_create_collection(
            name="cme_rules",
            metadata={"description": "CME Trading Rules and Regulations"}
        )

    def get_chunks_by_document(self, document_id: str) -> list[dict]:
        """Get all chunks for a specific document."""
        results = self.collection.get(
            where={"document_id": document_id},
            include=["documents", "metadatas"]
        )

        chunks = []
        if results and results["ids"]:
            for i, chunk_id in enumerate(results["ids"]):
                chunks.append({
                    "id": chunk_id,
                    "text": results["documents"][i],
                    "metadata": results["metadatas"][i]
                })

        return chunks
