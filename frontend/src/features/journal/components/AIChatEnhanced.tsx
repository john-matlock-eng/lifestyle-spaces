import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, Bot, User, Sparkles, X, Minimize2, Maximize2,
  Copy, Download, RefreshCw, Check
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { aiService, type ChatMessage } from '../../../services/ai'
import '../styles/ai-chat.css'

interface AIChatProps {
  journalContent: string
  journalTitle?: string
  journalId?: string
  emotions?: string[]
  isOpen?: boolean
  onClose?: () => void
  position?: 'bottom-right' | 'bottom-left' | 'center'
}

export const AIChat: React.FC<AIChatProps> = ({
  journalContent,
  journalTitle,
  journalId = 'default',
  emotions,
  isOpen = true,
  onClose,
  position = 'bottom-right'
}) => {
  // Load persisted messages with proper date parsing
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(`chat_${journalId}`)
    if (saved) {
      try {
        interface SavedMessage {
          role: 'user' | 'assistant';
          content: string;
          timestamp?: string | Date;
        }
        return JSON.parse(saved).map((m: SavedMessage) => ({
          ...m,
          timestamp: m.timestamp ? new Date(m.timestamp) : undefined
        }))
      } catch (err) {
        console.error('Failed to load chat history:', err)
        return []
      }
    }
    return []
  })

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [chatSize] = useState({ width: 400, height: 500 })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const copyTimeoutRef = useRef<NodeJS.Timeout>()

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  // Persist messages to localStorage
  useEffect(() => {
    if (messages.length > 0 && journalId) {
      try {
        localStorage.setItem(`chat_${journalId}`, JSON.stringify(messages))
      } catch (err) {
        console.error('Failed to save chat history:', err)
      }
    }
  }, [messages, journalId])

  // Auto-scroll to bottom with smooth animation
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      })
    }, 100)
  }, [messages])

  // Welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        role: 'assistant',
        content: `Hello! I've read your journal entry${journalTitle ? ` "${journalTitle}"` : ''}. ${emotions?.length ? `I can see you're feeling ${emotions.join(', ')}.` : ''}\n\nI'm here to help you reflect and explore your thoughts. You can ask me:\n- To help identify patterns in your writing\n- For reflection questions\n- To explore your emotions deeper\n- For suggestions on next steps\n\nWhat would you like to discuss?`
      }
      setMessages([welcomeMessage])
    }
  }, [isOpen, journalTitle, emotions, messages.length])

  // Format timestamp with relative time
  const formatTimestamp = useCallback((date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`
    if (diff < 604800000) return `${Math.floor(diff/86400000)}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  // Copy message to clipboard with feedback
  const copyMessage = useCallback((content: string, messageId: string) => {
    navigator.clipboard.writeText(content)
      .then(() => {
        setCopiedMessageId(messageId)
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
        copyTimeoutRef.current = setTimeout(() => {
          setCopiedMessageId(null)
        }, 2000)
      })
      .catch(err => {
        console.error('Failed to copy:', err)
        setError('Failed to copy message')
      })
  }, [])

  // Export conversation as markdown
  const exportConversation = useCallback(() => {
    const header = `# Journal Chat Conversation\n\n**Journal:** ${journalTitle || 'Untitled'}\n**Date:** ${new Date().toLocaleString()}\n${emotions?.length ? `**Emotions:** ${emotions.join(', ')}\n` : ''}\n---\n\n`

    const content = messages
      .map(m => {
        const role = m.role === 'user' ? '### You' : '### AI Assistant'
        const time = 'timestamp' in m ? formatTimestamp(m.timestamp as Date) : 'Unknown time'
        return `${role}\n*${time}*\n\n${m.content}\n`
      })
      .join('\n---\n\n')

    const fullContent = header + content

    const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `journal_chat_${journalTitle?.replace(/[^a-z0-9]/gi, '_') || journalId}_${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [messages, journalId, journalTitle, emotions, formatTimestamp])

  // Send message with rate limiting
  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim()
    if (!textToSend || isLoading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: textToSend
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      // Limit context to prevent token overflow (last 10 messages or ~3000 chars)
      const recentMessages = messages.slice(-10).reduce((acc, msg) => {
        const totalLength = acc.reduce((sum, m) => sum + m.content.length, 0)
        if (totalLength + msg.content.length > 3000) return acc
        return [...acc, msg]
      }, [] as ChatMessage[])

      const response = await aiService.chatAboutJournal(
        journalContent,
        textToSend,
        recentMessages
      )

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      console.error('AI chat error:', err)
      const error = err as Error
      const errorMessage = error.message?.includes('503')
        ? 'AI service is temporarily unavailable. Please try again in a moment.'
        : error.message?.includes('401')
        ? 'Your session has expired. Please refresh the page and sign in again.'
        : 'Failed to get response. Please try again.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  // Regenerate last response
  const regenerateLastResponse = async () => {
    const lastUserIdx = messages.findLastIndex(m => m.role === 'user')
    if (lastUserIdx === -1 || isLoading) return

    // Remove all messages after the last user message
    const newMessages = messages.slice(0, lastUserIdx + 1)
    setMessages(newMessages)

    // Resend the last user message
    await sendMessage(messages[lastUserIdx].content)
  }

  // Clear chat history
  const clearChat = useCallback(() => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      setMessages([])
      localStorage.removeItem(`chat_${journalId}`)
      // Re-add welcome message
      const welcomeMessage: ChatMessage = {
        role: 'assistant',
        content: `Chat cleared. How can I help you reflect on your journal entry?`
      }
      setMessages([welcomeMessage])
    }
  }, [journalId])

  // Handle keyboard shortcuts
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
    // Ctrl/Cmd + Enter for new line
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      setInput(prev => prev + '\n')
    }
  }

  // Quick prompts for user engagement
  const quickPrompts = [
    "What patterns do you notice in my writing?",
    "How do my emotions connect to my thoughts?",
    "What should I reflect on more deeply?",
    "Can you help me understand what I'm feeling?"
  ]

  if (!isOpen) return null

  return (
    <div
      className={`ai-chat-container ${isMinimized ? 'minimized' : ''} position-${position}`}
      style={{
        width: `${chatSize.width}px`,
        height: isMinimized ? 'auto' : `${chatSize.height}px`
      }}
    >
      <div className="ai-chat-header">
        <div className="ai-chat-title">
          <Bot size={20} />
          <span>AI Journal Assistant</span>
          <Sparkles size={16} className="sparkle-icon" />
        </div>
        <div className="ai-chat-controls">
          {messages.length > 1 && (
            <button
              onClick={clearChat}
              className="chat-control-btn"
              title="Clear chat"
            >
              🗑️
            </button>
          )}
          <button
            onClick={exportConversation}
            className="chat-control-btn"
            title="Export conversation"
            disabled={messages.length === 0}
          >
            <Download size={16} />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="chat-control-btn"
            title={isMinimized ? "Maximize" : "Minimize"}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="chat-control-btn close-btn"
              title="Close chat"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="ai-chat-messages">
            {messages.map((message, index) => {
              const messageId = `msg-${index}`
              return (
                <div
                  key={messageId}
                  className={`chat-message ${message.role}`}
                >
                  <div className="message-header">
                    <div className="message-avatar">
                      {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <span className="message-role">
                      {message.role === 'user' ? 'You' : 'AI Assistant'}
                    </span>
                    {'timestamp' in message && (
                      <span className="message-time">
                        {formatTimestamp(message.timestamp as Date)}
                      </span>
                    )}
                    <button
                      onClick={() => copyMessage(message.content, messageId)}
                      className="message-action-btn"
                      title="Copy message"
                    >
                      {copiedMessageId === messageId ? (
                        <Check size={14} className="copied-icon" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                  <div className="message-content">
                    {message.role === 'assistant' ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({...props}) => (
                            <a {...props} target="_blank" rel="noopener noreferrer" />
                          ),
                          code: ({inline, ...props}) => (
                            inline ?
                            <code className="inline-code" {...props} /> :
                            <code className="block-code" {...props} />
                          )
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <div className="user-message-text">{message.content}</div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Show regenerate for last AI message if not loading */}
            {messages.length > 0 &&
             messages[messages.length - 1].role === 'assistant' &&
             !isLoading && (
              <button
                onClick={regenerateLastResponse}
                className="regenerate-btn"
                title="Regenerate response"
              >
                <RefreshCw size={14} />
                Regenerate response
              </button>
            )}

            {isLoading && (
              <div className="chat-message assistant">
                <div className="message-header">
                  <div className="message-avatar">
                    <Bot size={16} />
                  </div>
                  <span className="message-role">AI Assistant</span>
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="chat-error">
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="error-dismiss"
                >
                  ✕
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Show quick prompts only for new conversations */}
          {messages.length <= 1 && !isLoading && (
            <div className="quick-prompts">
              <p className="quick-prompts-label">Try asking:</p>
              <div className="quick-prompts-grid">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(prompt)
                      sendMessage(prompt)
                    }}
                    className="quick-prompt-btn"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="ai-chat-input">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              disabled={isLoading}
              rows={2}
              className="chat-input"
              maxLength={1000}
            />
            <div className="input-actions">
              <span className="char-count">
                {input.length}/1000
              </span>
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="send-btn"
                title="Send message (Enter)"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
