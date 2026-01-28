import { useState, useCallback } from 'react';
import { ChatMessage, ChatSession, DocumentState, Citation } from '@/types/chat';

// Mock documents for demo
const mockDocuments = {
  'cme-rulebook': {
    id: 'cme-rulebook',
    name: 'CME Group Rulebook',
    type: 'pdf' as const,
    content: '',
    pages: [
      { number: 1, content: 'Chapter 1: General Provisions\n\nThis rulebook governs all trading activities on CME Group exchanges. All market participants must comply with these rules and regulations.' },
      { number: 42, content: 'Rule 432: Position Limits\n\nNo person shall own or control positions in excess of the following limits:\n\n(a) Spot month position limits apply to all contracts during the last five trading days.\n\n(b) All-months-combined limits apply to the total of all positions across all contract months.\n\n(c) Single-month limits apply to any individual contract month.\n\nViolations of position limits may result in disciplinary action including fines and trading suspensions.' },
      { number: 43, content: 'Rule 433: Reporting Requirements\n\nAll traders holding positions above the reporting threshold must file daily position reports with the Exchange. Reports must be submitted by 5:00 PM CT each trading day.' },
      { number: 156, content: 'Chapter 7: Delivery Procedures\n\nRule 756: Physical Delivery\n\nFor physically-settled contracts, delivery must be completed within the specified delivery period. Failure to deliver may result in penalties and forced buy-in procedures.' },
    ],
  },
  'ice-regulations': {
    id: 'ice-regulations',
    name: 'ICE Futures Regulations',
    type: 'pdf' as const,
    content: '',
    pages: [
      { number: 1, content: 'ICE Futures Trading Regulations\n\nThese regulations apply to all contracts traded on ICE Futures exchanges.' },
      { number: 28, content: 'Section 5.3: Margin Requirements\n\nInitial margin must be deposited before any position is established. Maintenance margin levels must be maintained at all times during the life of the position.\n\nMargin calls must be met within one hour of issuance during trading hours.' },
    ],
  },
};

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

    // Simulate AI response with citations
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const citations: Citation[] = [];
    let responseContent = '';

    if (content.toLowerCase().includes('position limit')) {
      citations.push({
        id: 'cite-1',
        documentId: 'cme-rulebook',
        documentName: 'CME Group Rulebook',
        pageNumber: 42,
        highlightRange: { start: 0, end: 200 },
        excerpt: 'No person shall own or control positions in excess of the following limits...',
      });
      responseContent = `Position limits are governed by **Rule 432** of the CME Rulebook. The rule establishes three types of limits:\n\n1. **Spot month limits** — Apply during the last five trading days\n2. **All-months-combined limits** — Total across all contract months\n3. **Single-month limits** — For any individual contract month\n\nViolations may result in disciplinary action including fines and trading suspensions.`;
    } else if (content.toLowerCase().includes('margin')) {
      citations.push({
        id: 'cite-2',
        documentId: 'ice-regulations',
        documentName: 'ICE Futures Regulations',
        pageNumber: 28,
        highlightRange: { start: 0, end: 150 },
        excerpt: 'Initial margin must be deposited before any position is established...',
      });
      responseContent = `Margin requirements for ICE Futures are outlined in **Section 5.3** of the regulations.\n\nKey requirements:\n\n- **Initial margin** must be deposited before establishing any position\n- **Maintenance margin** levels must be maintained throughout the position's life\n- **Margin calls** must be met within one hour during trading hours`;
    } else if (content.toLowerCase().includes('delivery')) {
      citations.push({
        id: 'cite-3',
        documentId: 'cme-rulebook',
        documentName: 'CME Group Rulebook',
        pageNumber: 156,
        highlightRange: { start: 0, end: 180 },
        excerpt: 'For physically-settled contracts, delivery must be completed within the specified delivery period...',
      });
      responseContent = `Physical delivery procedures are covered in **Chapter 7, Rule 756** of the CME Rulebook.\n\nThe key provisions state that:\n\n- Delivery must be completed within the specified delivery period\n- Failure to deliver may result in penalties\n- Forced buy-in procedures may be initiated for non-compliance`;
    } else {
      responseContent = `I can help you find specific rules and regulations in the commodity trading rulebooks. Try asking about:\n\n- **Position limits** and reporting requirements\n- **Margin requirements** for different exchanges\n- **Delivery procedures** for physical commodities\n- **Trading rules** and compliance requirements\n\nWhat specific topic would you like to explore?`;
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
    return mockDocuments[documentId as keyof typeof mockDocuments] || null;
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
