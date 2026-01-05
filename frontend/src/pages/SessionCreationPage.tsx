import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionApi } from '../services/api';
import { isApiError } from '../services/errors';
import { Layout } from '../components/Layout';
import { Loading } from '../components/Loading';
import ErrorDisplay from '../components/ErrorDisplay';

/**
 * Session Creation Page
 * Allows presenters to create new polling sessions
 */
export default function SessionCreationPage() {
  const [presenterName, setPresenterName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError(null);

    try {
      const { session } = await sessionApi.createSession({
        presenterName: presenterName.trim() || undefined
      });

      // Store presenter info in localStorage
      localStorage.setItem('presenterId', session.id); // Use session ID as presenter identifier
      localStorage.setItem('sessionId', session.id);
      localStorage.setItem('sessionCode', session.code);
      if (presenterName.trim()) {
        localStorage.setItem('presenterName', presenterName.trim());
      }

      // Navigate to presenter dashboard
      navigate(`/presenter/${session.code}`);
    } catch (err) {
      if (isApiError(err)) {
        setError(err.getUserMessage());
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create session. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <Layout title="Create Polling Session">
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="w-full max-w-md">
          {error && (
            <div className="mb-6">
              <ErrorDisplay 
                message={error} 
                onRetry={() => setError(null)}
              />
            </div>
          )}

          <div className="bg-white shadow-xl rounded-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Create a Session
              </h2>
              <p className="text-gray-600">
                Start a new live polling session for your audience
              </p>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-6">
              <div>
                <label 
                  htmlFor="presenterName" 
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  id="presenterName"
                  value={presenterName}
                  onChange={(e) => setPresenterName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={100}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-gray-500">
                  This will be shown to participants (optional)
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <Loading />
                    <span className="ml-2">Creating Session...</span>
                  </div>
                ) : (
                  'Create Session'
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Are you a participant?
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm underline"
                >
                  Join an existing session
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
