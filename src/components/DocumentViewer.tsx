import { X, ChevronLeft, ChevronRight, ExternalLink, FileText } from 'lucide-react';
import { Document, DocumentState, TextPosition } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

// API base URL for PDF serving
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ExtendedDocument extends Document {
  pdfUrl?: string;
  filename?: string;
}

interface DocumentViewerProps {
  isOpen: boolean;
  isSplitView: boolean;
  documentState: DocumentState;
  document: ExtendedDocument | null;
  onClose: () => void;
  highlightPositions?: TextPosition[];
}

export function DocumentViewer({
  isOpen,
  isSplitView,
  documentState,
  document,
  onClose,
  highlightPositions,
}: DocumentViewerProps) {
  const [pdfError, setPdfError] = useState(false);
  const [currentPage, setCurrentPage] = useState(documentState.currentPage);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update current page when documentState changes
  useEffect(() => {
    setCurrentPage(documentState.currentPage);
    setPdfError(false);
  }, [documentState.currentPage, documentState.activeDocument]);

  if (!document) return null;

  // Build PDF URL with page navigation
  const getPdfViewUrl = () => {
    if (document.pdfUrl) {
      // Use the pdfUrl from the document (from API)
      const baseUrl = document.pdfUrl.startsWith('http')
        ? document.pdfUrl
        : `${API_BASE_URL}${document.pdfUrl}`;
      return `${baseUrl}#page=${currentPage}`;
    }
    // Fallback: construct URL from document ID
    const filename = document.id.replace('CME-', '') + '.pdf';
    return `${API_BASE_URL}/pdfs/${filename}#page=${currentPage}`;
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
  };

  const handleNextPage = () => {
    setCurrentPage((p) => p + 1);
  };

  const handleOpenExternal = () => {
    window.open(getPdfViewUrl(), '_blank');
  };

  const handlePdfError = () => {
    setPdfError(true);
  };

  const panelContent = (
    <div className="h-full flex flex-col bg-document">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4 text-accent-foreground" />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-sm truncate">{document.name}</h3>
            <p className="text-xs text-muted-foreground">
              Page {currentPage}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Open in new tab"
            onClick={handleOpenExternal}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          {!isSplitView && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-hidden bg-gray-100">
        {pdfError ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h4 className="font-medium text-lg mb-2">PDF Not Available</h4>
            <p className="text-sm text-muted-foreground mb-4">
              The document could not be loaded. Make sure the backend server is running.
            </p>
            <Button variant="outline" onClick={handleOpenExternal}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Try Opening in New Tab
            </Button>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={getPdfViewUrl()}
            className="w-full h-full border-0"
            title={`${document.name} - Page ${currentPage}`}
            onError={handlePdfError}
          />
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background">
        <Button
          variant="ghost"
          size="sm"
          disabled={currentPage <= 1}
          className="gap-1"
          onClick={handlePrevPage}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {currentPage}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={handleNextPage}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // Mobile: Full screen modal
  // Desktop: Side panel
  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && !isSplitView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`
              fixed lg:relative inset-y-0 right-0 z-50 lg:z-0
              w-full max-w-lg lg:max-w-none
              ${isSplitView ? 'lg:w-1/2' : 'lg:w-[480px]'}
              border-l border-border bg-document shadow-xl lg:shadow-none
            `}
          >
            {panelContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
