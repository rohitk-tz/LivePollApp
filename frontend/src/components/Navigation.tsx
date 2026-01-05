import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';

interface NavigationProps {
  sessionCode?: string;
  userRole?: 'presenter' | 'participant' | 'display';
  showBackButton?: boolean;
}

/**
 * Navigation Component
 * Provides navigation bar with session info and controls
 */
export default function Navigation({ sessionCode, userRole, showBackButton = false }: NavigationProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('participantId');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('sessionCode');
    localStorage.removeItem('displayName');
    localStorage.removeItem('presenterId');
    localStorage.removeItem('presenterName');
    
    // Navigate to home
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and Back button */}
          <div className="flex items-center">
            {showBackButton ? (
              <button
                onClick={() => navigate(-1)}
                className="mr-4 text-gray-600 hover:text-gray-900 flex items-center"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            ) : (
              <Link to="/" className="flex items-center">
                <svg className="w-8 h-8 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-xl font-bold text-gray-900">Live Poll</span>
              </Link>
            )}
          </div>

          {/* Center - Session Info */}
          {sessionCode && (
            <div className="hidden sm:flex items-center space-x-4">
              <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                <span className="text-sm text-gray-600 mr-2">Session:</span>
                <span className="font-mono font-bold text-blue-600">{sessionCode}</span>
              </div>
              {userRole && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  userRole === 'presenter' 
                    ? 'bg-purple-100 text-purple-800'
                    : userRole === 'participant'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                </span>
              )}
            </div>
          )}

          {/* Right side - Menu */}
          <div className="flex items-center">
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                  <Link
                    to="/"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setMenuOpen(false)}
                  >
                    Join Session
                  </Link>
                  <Link
                    to="/create"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setMenuOpen(false)}
                  >
                    Create Session
                  </Link>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    Leave Session
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile session info */}
        {sessionCode && (
          <div className="sm:hidden pb-3 flex items-center justify-center space-x-2">
            <div className="bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
              <span className="text-xs text-gray-600 mr-1">Session:</span>
              <span className="font-mono font-bold text-blue-600 text-sm">{sessionCode}</span>
            </div>
            {userRole && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                userRole === 'presenter' 
                  ? 'bg-purple-100 text-purple-800'
                  : userRole === 'participant'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </span>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
