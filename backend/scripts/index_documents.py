#!/usr/bin/env python3
"""
Script to index all CME PDF documents into the vector database.

This script should be run once before starting the server to populate
the ChromaDB collection with document embeddings.

Usage:
    python scripts/index_documents.py [--clear] [--limit N]

Options:
    --clear     Clear existing index before indexing
    --limit N   Only index first N documents (for testing)
"""

import sys
import os
import argparse
from pathlib import Path
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.pdf_service import PDFService
from app.services.vector_service import VectorService
from app.models.schemas import DocumentChunk


def index_documents(clear: bool = False, limit: int = None, batch_size: int = 50):
    """
    Index all CME PDF documents.

    Args:
        clear: Whether to clear existing index
        limit: Maximum number of documents to index
        batch_size: Number of chunks to add at once
    """
    print("=" * 60)
    print("CME Rules Navigator - Document Indexing")
    print("=" * 60)
    print(f"Started at: {datetime.now().isoformat()}")
    print()

    # Initialize services
    pdf_service = PDFService()
    vector_service = VectorService()

    # Optionally clear existing index
    if clear:
        print("Clearing existing index...")
        vector_service.clear_collection()
        print("Index cleared.")
        print()

    # Get list of documents
    documents = pdf_service.list_documents()
    if limit:
        documents = documents[:limit]

    print(f"Found {len(documents)} documents to index")
    print()

    total_chunks = 0
    failed_docs = []
    batch: list[DocumentChunk] = []

    for i, doc in enumerate(documents, 1):
        print(f"[{i}/{len(documents)}] Indexing: {doc.title} ({doc.filename})")

        try:
            chunks_count = 0
            for chunk in pdf_service.extract_document_chunks(doc.document_id):
                batch.append(chunk)
                chunks_count += 1

                # Add batch when full
                if len(batch) >= batch_size:
                    vector_service.add_chunks_batch(batch)
                    batch = []

            print(f"    ✓ Extracted {chunks_count} chunks from {doc.total_pages} pages")
            total_chunks += chunks_count

        except Exception as e:
            print(f"    ✗ Error: {e}")
            failed_docs.append((doc.document_id, str(e)))
            continue

    # Add remaining batch
    if batch:
        vector_service.add_chunks_batch(batch)

    print()
    print("=" * 60)
    print("Indexing Complete")
    print("=" * 60)
    print(f"Total documents indexed: {len(documents) - len(failed_docs)}/{len(documents)}")
    print(f"Total chunks created: {total_chunks}")
    print(f"Finished at: {datetime.now().isoformat()}")

    if failed_docs:
        print()
        print("Failed documents:")
        for doc_id, error in failed_docs:
            print(f"  - {doc_id}: {error}")

    # Verify indexing
    stats = vector_service.get_collection_stats()
    print()
    print(f"Vector database stats:")
    print(f"  Collection: {stats['collection_name']}")
    print(f"  Total chunks indexed: {stats['total_chunks']}")
    print(f"  Storage: {stats['persist_directory']}")


def test_search(query: str = "position limits"):
    """Test the search functionality."""
    print()
    print("=" * 60)
    print(f"Testing search: '{query}'")
    print("=" * 60)

    vector_service = VectorService()
    results = vector_service.search(query, limit=3)

    for i, citation in enumerate(results, 1):
        print(f"\n{i}. {citation.document_title} (Page {citation.page_number})")
        print(f"   Relevance: {citation.relevance_score}")
        print(f"   Excerpt: {citation.excerpt[:150]}...")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Index CME PDF documents")
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear existing index before indexing"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Only index first N documents"
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Run a test search after indexing"
    )
    parser.add_argument(
        "--test-only",
        type=str,
        default=None,
        help="Only run test search with given query"
    )

    args = parser.parse_args()

    if args.test_only:
        test_search(args.test_only)
    else:
        index_documents(clear=args.clear, limit=args.limit)

        if args.test:
            test_search()
