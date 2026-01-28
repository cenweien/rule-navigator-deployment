import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Document, DocumentState } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface DocumentViewerProps {
  isOpen: boolean;
  isSplitView: boolean;
  documentState: DocumentState;
  document: Document | null;
  onClose: () => void;
}

export function DocumentViewer({
  isOpen,
  isSplitView,
  documentState,
  document,
  onClose,
}: DocumentViewerProps) {
  if (!document) return null;

  const currentPage = document.pages?.find(
    (p) => p.number === documentState.currentPage
  );

  const highlightContent = (content: string) => {
    if (!documentState.highlightRange) return content;
    
    const { start, end } = documentState.highlightRange;
    const before = content.slice(0, start);
    const highlighted = content.slice(start, end);
    const after = content.slice(end);
    
    return (
      <>
        {before}
        <mark className="doc-highlight-yellow">{highlighted}</mark>
        {after}
      </>
    );
  };

  const panelContent = (
    <div className="h-full flex flex-col bg-document">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <span className="text-sm font-medium text-accent-foreground">
              {documentState.currentPage}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-sm truncate">{document.name}</h3>
            <p className="text-xs text-muted-foreground">
              Page {documentState.currentPage}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Open in new tab"
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

      {/* Document Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <article className="font-document text-document-foreground leading-relaxed text-[15px] space-y-4">
            {currentPage ? (
              currentPage.content.split('\n\n').map((paragraph, index) => (
                <p key={index} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                  {documentState.highlightRange && index === 0
                    ? highlightContent(paragraph)
                    : paragraph}
                </p>
              ))
            ) : (
              <p className="text-muted-foreground italic">
                Document content not available for this page.
              </p>
            )}
          </article>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background">
        <Button
          variant="ghost"
          size="sm"
          disabled={documentState.currentPage <= 1}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {documentState.currentPage}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
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
