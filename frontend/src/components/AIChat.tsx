/**
 * AIChat Component - Conversational AI interface for journal entries
 */

import React, { useState, useRef, useEffect } from 'react';
import { aiService, ChatMessage } from '../services/ai';
import './AIChat.css';

interface AIChatProps {
  journalContent: string;
  journalTitle?: string;
  onClose?: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ journalContent, journalTitle, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim() || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim(),
    };

    // Add user message to conversation
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      // Get AI response
      const response = await aiService.chatAboutJournal(
        journalContent,
        userMessage.content,
        messages
      );

      // Add AI response to conversation
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error in AI chat:', err);
      setError('Failed to get response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="ai-chat">
      <div className="ai-chat-header">
        <h3>Chat About Your Journal</h3>
        <div className="ai-chat-header-actions">
          {messages.length > 0 && (
            <button
              className="btn-clear-chat"
              onClick={handleClearChat}
              type="button"
            >
              Clear
            </button>
          )}
          {onClose && (
            <button
              className="btn-close-chat"
              onClick={onClose}
              type="button"
              aria-label="Close chat"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {journalTitle && (
        <div className="ai-chat-context">
          Discussing: <strong>{journalTitle}</strong>
        </div>
      )}

      <div className="ai-chat-messages">
        {messages.length === 0 && (
          <div className="ai-chat-empty">
            <p>Ask me anything about your journal entry!</p>
            <p className="ai-chat-suggestions">Try asking:</p>
            <ul>
              <li>"What patterns do you notice in my entry?"</li>
              <li>"Help me understand my feelings better"</li>
              <li>"What questions should I reflect on?"</li>
            </ul>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`ai-chat-message ai-chat-message-${message.role}`}
          >
            <div className="ai-chat-message-label">
              {message.role === 'user' ? 'You' : 'AI Companion'}
            </div>
            <div className="ai-chat-message-content">{message.content}</div>
          </div>
        ))}

        {isLoading && (
          <div className="ai-chat-message ai-chat-message-assistant">
            <div className="ai-chat-message-label">AI Companion</div>
            <div className="ai-chat-message-content">
              <div className="ai-chat-typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="ai-chat-error">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="ai-chat-input-form" onSubmit={handleSendMessage}>
        <input
          ref={inputRef}
          type="text"
          className="ai-chat-input"
          placeholder="Ask a question about your journal..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="btn-send-message"
          disabled={isLoading || !inputMessage.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default AIChat;
