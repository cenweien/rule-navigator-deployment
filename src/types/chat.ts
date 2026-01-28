export interface Citation {
  id: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
  highlightRange: {
    start: number;
    end: number;
  };
  excerpt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations?: Citation[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
}

export interface DocumentState {
  activeDocument: string | null;
  currentPage: number;
  highlightRange: { start: number; end: number } | null;
}

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'text';
  content: string;
  pages?: DocumentPage[];
}

export interface DocumentPage {
  number: number;
  content: string;
}
