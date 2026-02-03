import { forwardRef } from 'react';
import { ChatMessage as ChatMessageType, Citation } from '@/types/chat';
import { CitationPill } from './CitationPill';
import { motion } from 'framer-motion';
import { User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: ChatMessageType;
  onCitationClick: (citation: Citation) => void;
}

export const ChatMessage = forwardRef<HTMLDivElement, ChatMessageProps>(
  ({ message, onCitationClick }, ref) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      ref={ref}
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
          <div className="text-[15px] leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:bg-muted prose-pre:text-foreground prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
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
});

ChatMessage.displayName = 'ChatMessage';
