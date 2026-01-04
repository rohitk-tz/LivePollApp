import { useState } from 'react';
import type { Session } from '../types';

interface SessionDashboardProps {
  session: Session;
  participantCount: number;
  onStartSession: () => Promise<void>;
  onEndSession: () => Promise<void>;
}

/**
 * Session Dashboard Component
 * Displays session status and controls for presenter
 */
export default function SessionDashboard({
  session,
  participantCount,
  onStartSession,
  onEndSession,
}: SessionDashboardProps) {
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState<string>('');

  const handleAction = async (action: () => Promise<void>, type: string) => {
    setLoading(true);
    setActionType(type);
    try {
      await action();
    } catch (error) {
      console.error(`Failed to ${type}:`, error);
    } finally {
      setLoading(false);
      setActionType('');
    }
  };

  const getStatusBadge = () => {
    switch (session.status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Active
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
            Pending
          </span>
        );
      case 'ENDED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
            Ended
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Session Dashboard
          </h2>
          <p className="text-sm text-gray-600">
            Code: <span className="font-mono font-bold text-blue-600">{session.code}</span>
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Participants</p>
              <p className="text-3xl font-bold text-blue-600">{participantCount}</p>
            </div>
            <svg 
              className="w-10 h-10 text-blue-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
              />
            </svg>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <p className="text-lg font-bold text-purple-600">{session.status}</p>
            </div>
            <svg 
              className="w-10 h-10 text-purple-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Session Info */}
      {session.presenterName && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Presenter:</span> {session.presenterName}
          </p>
          {session.startedAt && (
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">Started:</span> {new Date(session.startedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {session.status === 'PENDING' && (
          <button
            onClick={() => handleAction(onStartSession, 'start')}
            disabled={loading}
            className="w-full bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {loading && actionType === 'start' ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Session
              </>
            )}
          </button>
        )}

        {session.status === 'ACTIVE' && (
          <button
            onClick={() => handleAction(onEndSession, 'end')}
            disabled={loading}
            className="w-full bg-red-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {loading && actionType === 'end' ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Ending...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                End Session
              </>
            )}
          </button>
        )}
      </div>

      {session.status === 'ENDED' && (
        <div className="bg-gray-100 rounded-lg p-4 text-center">
          <p className="text-gray-600">
            This session has ended. Thank you for using Live Poll!
          </p>
          {session.endedAt && (
            <p className="text-sm text-gray-500 mt-2">
              Ended at: {new Date(session.endedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
