# Live Poll App - Frontend

React + TypeScript frontend for the Live Event Polling Application participant view.

## Features

### ✅ Implemented

- **Participant Join Flow**
  - Enter session code to join
  - Optional display name
  - Form validation and error handling

- **Real-Time Poll Participation**
  - View active polls
  - Submit votes with single-click selection
  - Real-time vote count updates via WebSocket
  - Optimistic UI updates

- **Poll Results Visualization**
  - Interactive bar charts using Recharts
  - Results table with percentages
  - Live updates as votes come in
  - Color-coded options

- **Session Status Tracking**
  - Live connection status indicator
  - Session state display (PENDING/ACTIVE/ENDED)
  - Auto-reconnection on connection loss

- **WebSocket Integration**
  - Socket.IO client with auto-reconnect
  - Event listeners for all session/poll/vote events
  - Real-time synchronization with backend

## Technology Stack

- **Framework**: React 18.2
- **Build Tool**: Vite 5.0
- **Language**: TypeScript 5.3
- **Routing**: React Router DOM 6.20
- **Styling**: Tailwind CSS 3.4
- **Real-Time**: Socket.IO Client 4.6
- **Charts**: Recharts 2.10

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ActivePollsDisplay.tsx      # Display list of polls
│   │   ├── VotingComponent.tsx         # Vote submission form
│   │   ├── PollResultsVisualization.tsx # Charts and results
│   │   └── ErrorDisplay.tsx            # Error messages
│   ├── pages/
│   │   ├── ParticipantJoinPage.tsx     # Session join page
│   │   └── ParticipantPollViewPage.tsx # Main poll view
│   ├── services/
│   │   ├── api.ts                      # REST API calls
│   │   └── websocket.ts                # WebSocket service
│   ├── types/
│   │   └── index.ts                    # TypeScript types
│   ├── App.tsx                         # App component
│   ├── main.tsx                        # Entry point
│   └── index.css                       # Global styles
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── package.json
```

## Setup

### Prerequisites

- Node.js 18+ (or 20+ for latest Vite)
- Backend server running on http://localhost:3000

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The app will run on http://localhost:5173

### Build for Production

```bash
npm run build
```

The optimized build will be in the `dist` directory.

## API Integration

The frontend connects to the backend via:

1. **REST API** (proxied through Vite dev server):
   - `/api/sessions/code/:code` - Get session by code
   - `/api/sessions/:id` - Get session details
   - `/api/sessions/:id/polls` - Get session polls
   - `/api/sessions/:id/participants` - Join session
   - `/api/polls/:id/votes` - Submit vote (fallback)

2. **WebSocket** (Socket.IO):
   - `connection:established` - Connection confirmation
   - `session:started` - Session started event
   - `session:ended` - Session ended event
   - `poll:created` - New poll created
   - `poll:activated` - Poll opened for voting
   - `poll:closed` - Poll closed
   - `vote:accepted` - Vote accepted with updated counts
   - `vote:rejected` - Vote rejected with reason
   - `participant:joined` - New participant joined
   - `error:general` - General errors

## User Flow

1. **Join Session**:
   - Participant enters 6-character session code
   - Optionally provides display name
   - Clicks "Join Session"
   - Stored in localStorage for persistence

2. **View Polls**:
   - Connected via WebSocket to session room
   - Sees active poll (if any)
   - Views past polls and their results

3. **Vote**:
   - Selects an option from active poll
   - Clicks "Submit Vote"
   - Optimistically marked as voted
   - Receives confirmation via WebSocket event

4. **View Results**:
   - After voting, sees live results with charts
   - Results update in real-time as others vote
   - Can see results of closed polls

## Configuration

### Vite Proxy

The Vite dev server proxies API requests and WebSocket connections:

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    },
    '/socket.io': {
      target: 'http://localhost:3000',
      ws: true,
      changeOrigin: true
    }
  }
}
```

## Alignment with Specifications

### API Contracts (specs/004-api-contracts/spec.md)

✅ **FR-001**: REST endpoints for all domain commands
✅ **FR-006**: Persistent event stream via WebSocket
✅ **FR-007**: Events pushed within 100ms
✅ **FR-011**: REST responses include sufficient information
✅ **FR-012**: Event messages include full entity snapshots
✅ **FR-016**: JSON payloads only
✅ **FR-017**: JSON format for events

### Real-Time Events (specs/010-realtime-events/spec.md)

✅ Implemented all participant-relevant events:
- `connection:established`
- `session:started`
- `session:ended`
- `poll:created`
- `poll:activated`
- `poll:closed`
- `vote:submitted` (client→server)
- `vote:accepted` (server→client)
- `vote:rejected` (server→client)
- `participant:joined`
- `error:general`

### Task Breakdown (specs/012-task-breakdown/tasks.md)

✅ **Task 1.2**: Initialize Frontend Project
✅ **Task 1.8**: Setup React Application Structure
✅ **Task 1.9**: Setup Socket.IO Client
✅ **Task 6.7**: Create Participant Join Page
✅ **Task 6.8**: Create Active Polls Display Component
✅ **Task 6.9**: Create Voting Component
✅ **Task 6.10**: Create Poll Results Visualization Component
✅ **Task 6.12**: Create Error Display Component
✅ **Task 7.1**: Setup WebSocket Client Connection
✅ **Task 7.2**: Implement WebSocket Event Listeners
✅ **Task 7.3**: Implement WebSocket Event Emitters
✅ **Task 7.4**: Create Session State Management
✅ **Task 7.5**: Create Poll State Management
✅ **Task 7.6**: Create Participant State Management
✅ **Task 7.7**: Implement Optimistic UI Updates
✅ **Task 7.8**: Implement API Service Layer
✅ **Task 7.9**: Implement Local State Synchronization

## Constraints Met

✅ **React only** - No Vue components
✅ **No backend changes** - Only frontend implementation
✅ **No mock behavior** - Real API and WebSocket integration

## Known Limitations

- **Presenter view not implemented** - Only participant view
- **Poll creation not implemented** - Polls must be created via backend
- **Multiple choice voting** - Only single-option voting implemented
- **Rating scale polls** - Not yet supported
- **Open text polls** - Not yet supported
- **Event replay** - Connection restoration without replay
- **Offline support** - No service worker or offline capability

## Next Steps

To complete the full application:

1. Implement Presenter View
2. Add poll creation interface
3. Support multi-select voting
4. Implement rating scale and open text poll types
5. Add event replay on reconnection
6. Improve accessibility (ARIA labels, keyboard navigation)
7. Add unit and integration tests
8. Optimize bundle size and performance
9. Add error boundaries and better error handling
10. Implement proper authentication/authorization

## License

MIT
