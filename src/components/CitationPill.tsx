import { FileText } from 'lucide-react';
import { Citation } from '@/types/chat';
import { motion } from 'framer-motion';

interface CitationPillProps {
  citation: Citation;
  onClick: (citation: Citation) => void;
}

export function CitationPill({ citation, onClick }: CitationPillProps) {
  // Format document name for display
  const displayName = citation.documentName || citation.documentId.replace('CME-', 'CME Rule ');

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(citation)}
      className="citation-pill group"
      title={citation.excerpt ? `"${citation.excerpt.slice(0, 100)}..."` : undefined}
    >
      <FileText className="h-3 w-3 transition-transform group-hover:scale-110" />
      <span className="font-medium truncate max-w-[200px]">{displayName}</span>
      <span className="text-citation-text/70">—</span>
      <span>Pg {citation.pageNumber}</span>
      {citation.relevanceScore !== undefined && citation.relevanceScore > 0.8 && (
        <span className="ml-1 w-1.5 h-1.5 rounded-full bg-green-500" title="High relevance" />
      )}
    </motion.button>
  );
}
