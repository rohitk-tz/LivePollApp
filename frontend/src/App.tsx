import { Routes, Route } from 'react-router-dom';
import ParticipantJoinPage from './pages/ParticipantJoinPage';
import ParticipantPollViewPage from './pages/ParticipantPollViewPage';
import ParticipantPollDisplayPage from './pages/ParticipantPollDisplayPage';
import PresenterDashboard from './pages/PresenterDashboard';
import SessionCreationPage from './pages/SessionCreationPage';
import { PollWindowPage } from './pages/PollWindowPage';
import { PollWindowErrorBoundary } from './components/PollWindow/PollWindowErrorBoundary';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<ParticipantJoinPage />} />
        <Route path="/create" element={<SessionCreationPage />} />
        <Route path="/session/:sessionCode" element={<ParticipantPollViewPage />} />
        <Route path="/display/:sessionCode" element={<ParticipantPollDisplayPage />} />
        <Route path="/presenter/:sessionCode" element={<PresenterDashboard />} />
        <Route 
          path="/poll-window/:pollId" 
          element={
            <PollWindowErrorBoundary>
              <PollWindowPage />
            </PollWindowErrorBoundary>
          } 
        />
        <Route path="*" element={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
              <p className="text-gray-600 mb-6">The page you're looking for doesn't exist.</p>
              <a href="/" className="text-blue-600 hover:text-blue-800 underline">
                Go back to home
              </a>
            </div>
          </div>
        } />
      </Routes>
    </div>
  );
}

export default App;
