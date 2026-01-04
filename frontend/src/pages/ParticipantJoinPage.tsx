import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { participantApi } from '../services/api';
import { isApiError, ApiErrorCode } from '../services/errors';
import { Layout } from '../components/Layout';
import { Loading } from '../components/Loading';

export default function ParticipantJoinPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefilledSessionCode = (location.state as any)?.sessionCode || '';
  
  const [sessionCode, setSessionCode] = useState(prefilledSessionCode);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateSessionCode = (code: string): boolean => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Please enter a session code');
      return false;
    }
    if (trimmed.length !== 6) {
      setError('Session code must be 6 characters');
      return false;
    }
    if (!/^[A-Z0-9]+$/.test(trimmed)) {
      setError('Session code must contain only letters and numbers');
      return false;
    }
    return true;
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const code = sessionCode.trim().toUpperCase();
    if (!validateSessionCode(code)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { participant, session } = await participantApi.joinSessionByCode(
        code,
        displayName.trim() || undefined
      );

      // Store participant info in localStorage for session persistence
      localStorage.setItem('participantId', participant.id);
      localStorage.setItem('sessionId', session.id);
      localStorage.setItem('sessionCode', session.code);
      if (displayName.trim()) {
        localStorage.setItem('displayName', displayName.trim());
      }

      // Navigate to session view
      navigate(`/session/${session.code}`);
    } catch (err) {
      // Handle API errors with specific messages
      if (isApiError(err)) {
        switch (err.code) {
          case ApiErrorCode.SESSION_NOT_FOUND:
            setError('Session not found. Please check the code and try again.');
            break;
          case ApiErrorCode.INVALID_ACCESS_CODE:
            setError('Invalid session code. Please check and try again.');
            break;
          case ApiErrorCode.INVALID_STATE:
          case ApiErrorCode.SESSION_NOT_ACTIVE:
            setError('This session is not currently active. Please wait for the presenter to start it.');
            break;
          case ApiErrorCode.INVALID_PAYLOAD:
            setError('Invalid input. Please check your session code.');
            break;
          default:
            setError(err.getUserMessage());
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to join session. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCodeInput = (value: string) => {
    // Auto-uppercase and limit to 6 characters
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setSessionCode(cleaned);
    // Clear error when user starts typing
    if (error) setError(null);
  };

  if (loading) {
    return (
      <Layout>
        <Loading message="Joining session..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
        <div className="max-w-md w-full">
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Live Session</h1>
              <p className="text-gray-600">
                {prefilledSessionCode 
                  ? 'Please enter your name to join the session' 
                  : 'Enter your session code to participate in the poll'}
              </p>
            </div>

            {/* Info message for direct link access */}
            {prefilledSessionCode && (
              <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
                <p className="text-sm font-medium">
                  📋 Session code <strong>{prefilledSessionCode}</strong> detected. Enter your name below to join!
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleJoinSession} className="space-y-6">
              {/* Session Code Input */}
              <div>
                <label htmlFor="sessionCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Session Code *
                </label>
                <input
                  type="text"
                  id="sessionCode"
                  value={sessionCode}
                  onChange={(e) => handleCodeInput(e.target.value)}
                  placeholder="ABC123"
                  maxLength={6}
                  className="w-full px-4 py-4 text-center text-3xl font-bold border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase tracking-[0.5em] transition-all"
                  disabled={loading}
                  autoComplete="off"
                  autoFocus
                />
                <p className="mt-2 text-sm text-gray-500 text-center">
                  6-character code (letters and numbers)
                </p>
              </div>

              {/* Display Name Input */}
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  maxLength={50}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={loading}
                />
                <p className="mt-2 text-sm text-gray-500">
                  <svg className="inline w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Leave blank to participate anonymously
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl animate-shake">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !sessionCode.trim() || sessionCode.length !== 6}
                className="w-full bg-blue-600 text-white font-semibold py-4 px-4 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Joining...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Join Session
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              Don't have a session code?
              <br />
              Ask your presenter to share the 6-character code displayed on their screen.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
