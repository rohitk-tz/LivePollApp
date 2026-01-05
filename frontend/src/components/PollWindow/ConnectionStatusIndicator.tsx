import { ConnectionStatus } from '../../types/pollWindow';
import { useState, useEffect } from 'react';

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
  reconnectAttempts?: number;
  onRetry?: () => void;
}

export function ConnectionStatusIndicator({ 
  status, 
  reconnectAttempts = 0,
  onRetry 
}: ConnectionStatusIndicatorProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-hide when connected after 2 seconds
  useEffect(() => {
    if (status === 'connected') {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [status]);

  if (!isVisible) return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'connecting':
        return {
          bg: 'bg-blue-100',
          border: 'border-blue-300',
          text: 'text-blue-800',
          icon: '🔄',
          message: 'Connecting...',
          showRetry: false,
        };
      case 'connected':
        return {
          bg: 'bg-green-100',
          border: 'border-green-300',
          text: 'text-green-800',
          icon: '✓',
          message: 'Connected',
          showRetry: false,
        };
      case 'disconnected':
        return {
          bg: 'bg-yellow-100',
          border: 'border-yellow-300',
          text: 'text-yellow-800',
          icon: '⚠️',
          message: `Reconnecting... (Attempt ${reconnectAttempts})`,
          showRetry: false,
        };
      case 'error':
        return {
          bg: 'bg-red-100',
          border: 'border-red-300',
          text: 'text-red-800',
          icon: '❌',
          message: 'Connection lost',
          showRetry: true,
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div 
      className={`fixed top-4 right-4 ${statusConfig.bg} ${statusConfig.border} border-2 rounded-lg px-4 py-3 shadow-lg transition-opacity duration-300 z-50 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex items-center space-x-3">
        <span className="text-2xl">{statusConfig.icon}</span>
        <span className={`font-semibold ${statusConfig.text}`}>
          {statusConfig.message}
        </span>
        {statusConfig.showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="ml-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
