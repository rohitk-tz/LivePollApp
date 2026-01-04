import { Routes, Route } from 'react-router-dom'
import ParticipantJoinPage from './pages/ParticipantJoinPage'
import ParticipantPollViewPage from './pages/ParticipantPollViewPage'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<ParticipantJoinPage />} />
        <Route path="/session/:sessionCode" element={<ParticipantPollViewPage />} />
      </Routes>
    </div>
  )
}

export default App
