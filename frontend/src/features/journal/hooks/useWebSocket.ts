/**
 * WebSocket hook for real-time collaboration on journal highlights
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { HighlightWebSocketMessage } from '../types/highlight.types';

interface UseWebSocketOptions {
  spaceId: string;
  journalEntryId: string;
  onMessage?: (message: HighlightWebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sendMessage: (type: string, payload: any) => void;
  reconnect: () => void;
}

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff

export const useWebSocket = (options: UseWebSocketOptions): UseWebSocketReturn => {
  const {
    spaceId,
    journalEntryId,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isIntentionalCloseRef = useRef(false);

  // Get auth token
  const getToken = useCallback(() => {
    return localStorage.getItem('accessToken') || '';
  }, []);

  // Send message through WebSocket
  const sendMessage = useCallback((type: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type,
        payload,
        timestamp: new Date().toISOString(),
      };
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', type);
    }
  }, []);

  // Start heartbeat to keep connection alive
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      sendMessage('HEARTBEAT', {});
    }, HEARTBEAT_INTERVAL);
  }, [sendMessage]);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setIsConnecting(true);
    setError(null);

    const token = getToken();
    const wsUrl = `${WS_BASE_URL}/ws/spaces/${spaceId}/journals/${journalEntryId}?token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
        startHeartbeat();

        if (onConnect) {
          onConnect();
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Handle connection confirmation
          if (message.type === 'CONNECTION_CONFIRMED') {
            console.log('Connection confirmed, received message history');
            // Optionally process message history
            return;
          }

          // Dispatch message to handler
          if (onMessage) {
            onMessage(message as HighlightWebSocketMessage);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');

        if (onError) {
          onError(event);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        stopHeartbeat();

        if (onDisconnect) {
          onDisconnect();
        }

        // Attempt reconnection if not intentional close
        if (!isIntentionalCloseRef.current) {
          const delay = RECONNECT_DELAYS[
            Math.min(reconnectAttemptsRef.current, RECONNECT_DELAYS.length - 1)
          ];

          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError('Failed to create WebSocket connection');
      setIsConnecting(false);
    }
  }, [spaceId, journalEntryId, getToken, onConnect, onMessage, onDisconnect, onError, startHeartbeat, stopHeartbeat]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    isIntentionalCloseRef.current = true;
    stopHeartbeat();

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Intentional disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
  }, [stopHeartbeat]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    disconnect();
    isIntentionalCloseRef.current = false;
    reconnectAttemptsRef.current = 0;
    connect();
  }, [disconnect, connect]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    sendMessage,
    reconnect,
  };
};
