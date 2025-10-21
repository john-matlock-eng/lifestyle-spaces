/**
 * ConnectionStatus Component
 *
 * Displays WebSocket connection status with reconnect option
 */

import React from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  onReconnect: () => void;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isConnecting,
  error,
  onReconnect,
  className = '',
}) => {
  // Don't show anything if connected
  if (isConnected && !error) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Status indicator */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border">
        {isConnecting && (
          <>
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-yellow-700">Connecting...</span>
          </>
        )}

        {!isConnected && !isConnecting && error && (
          <>
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-red-700">Disconnected</span>
            <button
              onClick={onReconnect}
              className="ml-2 px-2 py-0.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
            >
              Reconnect
            </button>
          </>
        )}

        {!isConnected && !isConnecting && !error && (
          <>
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-gray-600">Offline</span>
            <button
              onClick={onReconnect}
              className="ml-2 px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
            >
              Connect
            </button>
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="text-xs text-red-600" title={error}>
          {error.length > 50 ? `${error.substring(0, 50)}...` : error}
        </div>
      )}
    </div>
  );
};
