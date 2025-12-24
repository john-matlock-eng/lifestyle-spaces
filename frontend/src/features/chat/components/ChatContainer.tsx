/**
 * Chat Container Component
 *
 * Main chat interface with messages and input.
 */

import { useRef, useEffect } from 'react';
import { X, MessageSquarePlus, Users } from 'lucide-react';
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
    loadChatContext,
    // Mode-related state
    chatMode,
    authorName,
    suggestions,
    welcomeMessage,
    isLoadingContext,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, streamingContent]);

  // Load chat context on mount
  useEffect(() => {
    loadChatContext(spaceId);
  }, [spaceId, loadChatContext]);

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
  const showSuggestions = messages.length === 0 && !isLoading && !isLoadingContext;

  // Use dynamic welcome message or fallback
  const displayWelcomeMessage =
    welcomeMessage ||
    "I can help you reflect on your journals, find patterns, and discover insights from your writing.";

  // Determine subtitle based on mode
  const subtitle =
    chatMode === 'supporter' && authorName
      ? `Supporting ${authorName}`
      : 'Your journaling companion';

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerAvatar}>E</div>
          <div>
            <h3 className={styles.headerTitle}>Ellie</h3>
            <p className={styles.headerSubtitle}>
              {chatMode === 'supporter' && <Users size={12} className={styles.modeIcon} />}
              {subtitle}
            </p>
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

      {/* Mode indicator for supporter mode */}
      {chatMode === 'supporter' && authorName && (
        <div className={styles.modeIndicator}>
          <Users size={14} />
          <span>Viewing {authorName}'s journals</span>
        </div>
      )}

      {/* Messages */}
      <div className={styles.messages}>
        {/* Welcome message */}
        {messages.length === 0 && !isStreaming && (
          <div className={styles.welcome}>
            <div className={styles.welcomeAvatar}>E</div>
            <h4>Hi! I'm Ellie</h4>
            <p>{displayWelcomeMessage}</p>
          </div>
        )}

        {/* Suggestions for empty state */}
        {showSuggestions && <ChatSuggestions suggestions={suggestions} onSelect={handleSend} />}

        {/* Message list */}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} spaceId={spaceId} />
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
            spaceId={spaceId}
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
