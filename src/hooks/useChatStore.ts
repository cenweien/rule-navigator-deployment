import { useState, useCallback, useEffect } from 'react';
import { ChatMessage, ChatSession, DocumentState, Citation } from '@/types/chat';
import { sendChatMessage, checkHealth, getPdfUrl } from '@/services/api';

// Backend connection state
let isBackendAvailable = false;

// Check backend availability on module load
checkHealth().then((available) => {
  isBackendAvailable = available;
  if (!available) {
    console.warn('Backend not available - using mock responses');
  }
});

const initialSession: ChatSession = {
  id: '1',
  title: 'Position Limits Inquiry',
  createdAt: new Date(),
  updatedAt: new Date(),
  messages: [
    {
      id: '1',
      role: 'assistant',
      content: 'Welcome to the Commodity Trading Rules AI. I can help you navigate complex regulatory documents and find specific rules, requirements, and procedures. What would you like to know about?',
      timestamp: new Date(Date.now() - 60000),
    },
  ],
};

const mockSessions: ChatSession[] = [
  initialSession,
  {
    id: '2',
    title: 'Margin Requirements',
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86400000),
    messages: [],
  },
  {
    id: '3',
    title: 'Delivery Procedures',
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(Date.now() - 172800000),
    messages: [],
  },
];

export function useChatStore() {
  const [sessions, setSessions] = useState<ChatSession[]>(mockSessions);
  const [activeSessionId, setActiveSessionId] = useState<string>('1');
  const [documentState, setDocumentState] = useState<DocumentState>({
    activeDocument: null,
    currentPage: 1,
    highlightRange: null,
  });
  const [isDocumentPanelOpen, setIsDocumentPanelOpen] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              messages: [...session.messages, userMessage],
              updatedAt: new Date(),
            }
          : session
      )
    );

    setIsLoading(true);

    try {
      // Try to use backend API
      const response = await sendChatMessage(content, activeSessionId);

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        citations: response.citations.length > 0 ? response.citations : undefined,
      };

      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSessionId
            ? {
                ...session,
                messages: [...session.messages, aiMessage],
                updatedAt: new Date(),
              }
            : session
        )
      );
    } catch (error) {
      console.error('API error, falling back to mock response:', error);

      // Fallback to mock response if backend unavailable
      await new Promise((resolve) => setTimeout(resolve, 500));

      const citations: Citation[] = [];
      let responseContent = '';

      if (content.toLowerCase().includes('position limit')) {
        citations.push({
          id: 'cite-1',
          documentId: 'CME-432',
          documentName: 'CME Rule 432 - Position Limits',
          pageNumber: 1,
          highlightRange: { start: 0, end: 200 },
          excerpt: 'No person shall own or control positions in excess of the following limits...',
          pdfUrl: getPdfUrl('CME-432'),
        });
        responseContent = `Position limits are governed by **Rule 432** of the CME Rulebook. The rule establishes three types of limits:\n\n1. **Spot month limits** — Apply during the last five trading days\n2. **All-months-combined limits** — Total across all contract months\n3. **Single-month limits** — For any individual contract month\n\nViolations may result in disciplinary action including fines and trading suspensions.\n\n*Note: Connect the backend for full AI-powered responses.*`;
      } else if (content.toLowerCase().includes('margin')) {
        citations.push({
          id: 'cite-2',
          documentId: 'CME-930',
          documentName: 'CME Rule 930 - Margins',
          pageNumber: 1,
          highlightRange: { start: 0, end: 150 },
          excerpt: 'Initial margin must be deposited before any position is established...',
          pdfUrl: getPdfUrl('CME-930'),
        });
        responseContent = `Margin requirements are outlined in the CME rulebook.\n\nKey requirements:\n\n- **Initial margin** must be deposited before establishing any position\n- **Maintenance margin** levels must be maintained throughout the position's life\n- **Margin calls** must be met promptly\n\n*Note: Connect the backend for full AI-powered responses.*`;
      } else if (content.toLowerCase().includes('delivery')) {
        citations.push({
          id: 'cite-3',
          documentId: 'CME-700',
          documentName: 'CME Rule 700 - Delivery',
          pageNumber: 1,
          highlightRange: { start: 0, end: 180 },
          excerpt: 'For physically-settled contracts, delivery must be completed within the specified delivery period...',
          pdfUrl: getPdfUrl('CME-700'),
        });
        responseContent = `Physical delivery procedures are covered in the CME Rulebook.\n\nThe key provisions state that:\n\n- Delivery must be completed within the specified delivery period\n- Failure to deliver may result in penalties\n- Forced buy-in procedures may be initiated for non-compliance\n\n*Note: Connect the backend for full AI-powered responses.*`;
      } else {
        responseContent = `I can help you find specific rules and regulations in the CME trading rulebooks. Try asking about:\n\n- **Position limits** and reporting requirements\n- **Margin requirements** for trading\n- **Delivery procedures** for physical commodities\n- **Trading rules** and compliance requirements\n\n*Note: Start the backend server for AI-powered responses with real document citations.*`;
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        citations: citations.length > 0 ? citations : undefined,
      };

      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSessionId
            ? {
                ...session,
                messages: [...session.messages, aiMessage],
                updatedAt: new Date(),
              }
            : session
        )
      );
    }

    setIsLoading(false);
  }, [activeSessionId]);

  const openDocument = useCallback((citation: Citation) => {
    setDocumentState({
      activeDocument: citation.documentId,
      currentPage: citation.pageNumber,
      highlightRange: citation.highlightRange,
    });
    setIsDocumentPanelOpen(true);
  }, []);

  const closeDocumentPanel = useCallback(() => {
    setIsDocumentPanelOpen(false);
    if (!isSplitView) {
      setDocumentState({
        activeDocument: null,
        currentPage: 1,
        highlightRange: null,
      });
    }
  }, [isSplitView]);

  const toggleSplitView = useCallback(() => {
    setIsSplitView((prev) => !prev);
    if (!isSplitView) {
      setIsDocumentPanelOpen(true);
    }
  }, [isSplitView]);

  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Conversation',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Welcome to the Commodity Trading Rules AI. I can help you navigate complex regulatory documents and find specific rules, requirements, and procedures. What would you like to know about?',
          timestamp: new Date(),
        },
      ],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  }, []);

  const getDocument = useCallback((documentId: string) => {
    // Return document info for the PDF viewer
    const filename = documentId.replace('CME-', '') + '.pdf';
    return {
      id: documentId,
      name: documentId.replace('CME-', 'CME Rule '),
      type: 'pdf' as const,
      content: '',
      pdfUrl: getPdfUrl(documentId),
      filename,
    };
  }, []);

  return {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    documentState,
    isDocumentPanelOpen,
    isSplitView,
    isLoading,
    sendMessage,
    openDocument,
    closeDocumentPanel,
    toggleSplitView,
    createNewSession,
    getDocument,
  };
}
