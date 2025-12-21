/**
 * Chat Message Component
 */

import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage as ChatMessageType } from '../types';
import { CitationCard } from './CitationCard';
import styles from './Chat.module.css';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
  streamingContent?: string;
}

export function ChatMessage({ message, isStreaming, streamingContent }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const content = isStreaming ? streamingContent : message.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${styles.message} ${isUser ? styles.userMessage : styles.assistantMessage}`}
    >
      {!isUser && (
        <div className={styles.avatar}>
          <div className={styles.avatarPlaceholder}>E</div>
        </div>
      )}

      <div className={styles.messageContent}>
        <div className={styles.messageBubble}>
          {isUser ? (
            content
          ) : (
            <div className={styles.markdown}>
              <ReactMarkdown>{content || ''}</ReactMarkdown>
            </div>
          )}
          {isStreaming && <span className={styles.cursor}>|</span>}
        </div>

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className={styles.citations}>
            {message.citations.map((citation) => (
              <CitationCard key={citation.journalId} citation={citation} />
            ))}
          </div>
        )}

        <div className={styles.messageTime}>
          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
        </div>
      </div>
    </motion.div>
  );
}
