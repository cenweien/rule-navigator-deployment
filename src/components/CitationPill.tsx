import { FileText } from 'lucide-react';
import { Citation } from '@/types/chat';
import { motion } from 'framer-motion';

interface CitationPillProps {
  citation: Citation;
  onClick: (citation: Citation) => void;
}

export function CitationPill({ citation, onClick }: CitationPillProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(citation)}
      className="citation-pill group"
    >
      <FileText className="h-3 w-3 transition-transform group-hover:scale-110" />
      <span className="font-medium">{citation.documentName}</span>
      <span className="text-citation-text/70">—</span>
      <span>Pg {citation.pageNumber}</span>
    </motion.button>
  );
}
