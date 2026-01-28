import { ChatMessage as ChatMessageType, Citation } from '@/types/chat';
import { CitationPill } from './CitationPill';
import { motion } from 'framer-motion';
import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
  onCitationClick: (citation: Citation) => void;
}

function parseMarkdown(content: string): React.ReactNode {
  const parts = content.split(/(\*\*[^*]+\*\*|\n\n|\n- |\n\d+\. )/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (part === '\n\n') {
      return <br key={index} />;
    }
    if (part === '\n- ') {
      return <span key={index} className="block mt-1">• </span>;
    }
    if (/^\n\d+\. $/.test(part)) {
      const num = part.match(/\d+/)?.[0];
      return <span key={index} className="block mt-1">{num}. </span>;
    }
    return part;
  });
}

export function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`message-block inline-block text-left ${
            isUser
              ? 'bg-message-user text-foreground'
              : 'bg-message-ai border border-border'
          }`}
        >
          <div className="text-[15px] leading-relaxed">
            {parseMarkdown(message.content)}
          </div>

          {/* Citations */}
          {message.citations && message.citations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-2">
              {message.citations.map((citation) => (
                <CitationPill
                  key={citation.id}
                  citation={citation}
                  onClick={onCitationClick}
                />
              ))}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={`text-xs text-muted-foreground mt-1 ${isUser ? 'text-right' : ''}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  );
}
