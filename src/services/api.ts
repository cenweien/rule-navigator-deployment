/**
 * API service for communicating with the CME Rules Navigator backend.
 */

import { Citation, TextPosition } from '@/types/chat';

// Backend API base URL (backend runs on port 8000)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * API response types matching backend schemas
 */
interface APICitation {
  id: string;
  document_id: string;
  document_title: string;
  page_number: number;
  excerpt: string;
  positions: Array<{ x0: number; y0: number; x1: number; y1: number }>;
  relevance_score: number;
  pdf_url: string;
}

interface ChatAPIResponse {
  message: string;
  citations: APICitation[];
  session_id: string;
  timestamp: string;
}

interface DocumentInfo {
  document_id: string;
  title: string;
  filename: string;
  total_pages: number;
  indexed_chunks: number;
  pdf_url: string;
}

interface IndexingStatus {
  total_documents: number;
  indexed_documents: number;
  total_chunks: number;
  is_complete: boolean;
  last_updated: string | null;
}

/**
 * Convert API citation to frontend Citation format
 */
function convertCitation(apiCitation: APICitation): Citation {
  return {
    id: apiCitation.id,
    documentId: apiCitation.document_id,
    documentName: apiCitation.document_title,
    pageNumber: apiCitation.page_number,
    excerpt: apiCitation.excerpt,
    highlightRange: { start: 0, end: apiCitation.excerpt.length },
    positions: apiCitation.positions as TextPosition[],
    relevanceScore: apiCitation.relevance_score,
    pdfUrl: apiCitation.pdf_url,
  };
}

/**
 * Send a chat message and get AI response with citations
 */
export async function sendChatMessage(
  message: string,
  sessionId?: string
): Promise<{ message: string; citations: Citation[]; sessionId: string }> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      include_citations: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  const data: ChatAPIResponse = await response.json();

  return {
    message: data.message,
    citations: data.citations.map(convertCitation),
    sessionId: data.session_id,
  };
}

/**
 * Stream a chat response for real-time updates
 */
export function streamChatMessage(
  message: string,
  sessionId?: string,
  onCitations?: (citations: Citation[]) => void,
  onContent?: (text: string) => void,
  onDone?: (sessionId: string) => void,
  onError?: (error: Error) => void
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          session_id: sessionId,
          include_citations: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7);
            continue;
          }
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.citations) {
              onCitations?.(data.citations.map(convertCitation));
            }
            if (data.text) {
              onContent?.(data.text);
            }
            if (data.session_id && !data.citations && !data.text) {
              onDone?.(data.session_id);
            }
            if (data.error) {
              onError?.(new Error(data.error));
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        onError?.(error);
      }
    }
  })();

  return () => controller.abort();
}

/**
 * Search documents for relevant content
 */
export async function searchDocuments(
  query: string,
  limit: number = 5,
  documentId?: string
): Promise<Citation[]> {
  const params = new URLSearchParams({
    query,
    limit: limit.toString(),
  });
  if (documentId) {
    params.append('document_id', documentId);
  }

  const response = await fetch(`${API_BASE_URL}/api/documents/search?${params}`);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.results.map(convertCitation);
}

/**
 * Get list of available documents
 */
export async function listDocuments(): Promise<DocumentInfo[]> {
  const response = await fetch(`${API_BASE_URL}/api/documents/list`);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Get indexing status
 */
export async function getIndexingStatus(): Promise<IndexingStatus> {
  const response = await fetch(`${API_BASE_URL}/api/documents/indexing/status`);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Get document page info with highlight positions
 */
export async function getDocumentPage(
  documentId: string,
  pageNumber: number,
  highlightText?: string
): Promise<{
  documentId: string;
  pageNumber: number;
  dimensions: { width: number; height: number };
  highlightPositions: TextPosition[];
  pdfUrl: string;
}> {
  const params = new URLSearchParams();
  if (highlightText) {
    params.append('highlight_text', highlightText);
  }

  const response = await fetch(
    `${API_BASE_URL}/api/documents/${documentId}/page/${pageNumber}?${params}`
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    documentId: data.document_id,
    pageNumber: data.page_number,
    dimensions: data.dimensions,
    highlightPositions: data.highlight_positions,
    pdfUrl: data.pdf_url,
  };
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get PDF URL for a document
 */
export function getPdfUrl(documentId: string, pageNumber?: number): string {
  const filename = documentId.replace('CME-', '') + '.pdf';
  const base = `${API_BASE_URL}/pdfs/${filename}`;
  return pageNumber ? `${base}#page=${pageNumber}` : base;
}
