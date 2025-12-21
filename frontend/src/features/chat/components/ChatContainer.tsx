/**
 * Chat Container Component
 *
 * Main chat interface with messages and input.
 */

import { useRef, useEffect } from 'react';
import { X, MessageSquarePlus } from 'lucide-react';
import { useChat } from '../useChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatSuggestions } from './ChatSuggestions';
import styles from './Chat.module.css';

interface ChatContainerProps {
  spaceId: string;
  onClose?: () => void;
}

export function ChatContainer({ spaceId, onClose }: ChatContainerProps) {
  const {
    activeConversation,
    isLoading,
    isStreaming,
    streamingContent,
    streamingCitations,
    error,
    startNewConversation,
    sendMessage,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, streamingContent]);

  // Start a new conversation if none exists
  useEffect(() => {
    if (!activeConversation && !isLoading) {
      startNewConversation(spaceId);
    }
  }, [activeConversation, isLoading, spaceId, startNewConversation]);

  const handleSend = (content: string) => {
    sendMessage(spaceId, content, true); // Use streaming
  };

  const messages = activeConversation?.messages || [];
  const showSuggestions = messages.length === 0 && !isLoading;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerAvatar}>E</div>
          <div>
            <h3 className={styles.headerTitle}>Ellie</h3>
            <p className={styles.headerSubtitle}>Your journaling companion</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={() => startNewConversation(spaceId)}
            className={styles.iconButton}
            title="New conversation"
          >
            <MessageSquarePlus size={20} />
          </button>
          {onClose && (
            <button onClick={onClose} className={styles.iconButton} title="Close chat">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {/* Welcome message */}
        {messages.length === 0 && !isStreaming && (
          <div className={styles.welcome}>
            <div className={styles.welcomeAvatar}>E</div>
            <h4>Hi! I'm Ellie</h4>
            <p>
              I can help you reflect on your journals, find patterns, and discover insights
              from your writing.
            </p>
          </div>
        )}

        {/* Suggestions for empty state */}
        {showSuggestions && <ChatSuggestions onSelect={handleSend} />}

        {/* Message list */}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* Streaming message */}
        {isStreaming && (
          <ChatMessage
            message={{
              id: 'streaming',
              role: 'assistant',
              content: '',
              citations: streamingCitations,
              createdAt: new Date().toISOString(),
            }}
            isStreaming
            streamingContent={streamingContent}
          />
        )}

        {/* Error message */}
        {error && <div className={styles.error}>{error}</div>}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={!activeConversation}
        isLoading={isLoading || isStreaming}
      />
    </div>
  );
}
