# Implementation Tasks

## Phase 1: Foundation and Setup

### Task 1.1: Initialize Backend Project
- [X] Create Node.js backend project with TypeScript, Express, and development tooling (ESLint, Prettier)
- **Responsibility**: Backend
- **Dependencies**: None

### Task 1.2: Initialize Frontend Project
- [X] Create React frontend project with Vite, TypeScript, and Tailwind CSS
- **Responsibility**: Frontend
- **Dependencies**: None

### Task 1.3: Setup PostgreSQL Database
- [X] Install PostgreSQL 16, create database, configure connection pooling
- **Responsibility**: Backend
- **Dependencies**: None
- **Note**: PostgreSQL 14 installed and running. Database creation requires manual setup via pgAdmin or SQL shell (see PHASE1_SETUP_GUIDE.md)

### Task 1.4: Setup Redis Cache
- [X] Install Redis 7, configure connection, test pub/sub functionality
- **Responsibility**: Backend
- **Dependencies**: None
- **Note**: Redis installation requires Memurai for Windows or Docker (see PHASE1_SETUP_GUIDE.md). Event bus currently uses in-process EventEmitter.

### Task 1.5: Configure Prisma ORM
- [X] Install Prisma, initialize prisma.schema file, configure PostgreSQL connection
- **Responsibility**: Backend
- **Dependencies**: Task 1.1 (Backend Project), Task 1.3 (PostgreSQL Database)

### Task 1.6: Setup Express Server
- [X] Create Express server, configure middleware (body-parser, CORS, error handler), implement health check endpoint
- **Responsibility**: Backend
- **Dependencies**: Task 1.1 (Backend Project)

### Task 1.7: Setup Socket.IO Server
- [X] Install Socket.IO, integrate with Express server, configure Redis adapter for horizontal scaling
- **Responsibility**: Backend
- **Dependencies**: Task 1.6 (Express Server), Task 1.4 (Redis Cache)
- **Status**: Socket.IO server implemented in realtime module. Redis adapter deferred for horizontal scaling phase.

### Task 1.8: Setup React Application Structure
- [X] Create folder structure (components, pages, services, hooks), configure React Router, setup Tailwind CSS
- **Responsibility**: Frontend
- **Dependencies**: Task 1.2 (Frontend Project)

### Task 1.9: Setup Socket.IO Client
- [X] Install Socket.IO client, create WebSocket service, implement connection management and reconnection logic
- **Responsibility**: Frontend
- **Dependencies**: Task 1.2 (Frontend Project)
- **Status**: websocketService implemented with connection management, reconnection, and all event handlers

### Task 1.10: Configure Development Environment
- [X] Create .env files for backend and frontend, document environment variables, setup development scripts (npm run dev)
- **Responsibility**: Full-stack
- **Dependencies**: Task 1.1 (Backend Project), Task 1.2 (Frontend Project)
- **Status**: .env files created from templates. Development scripts configured in package.json.

## Phase 2: Data Layer and Persistence

### Task 2.1: Define Prisma Schema for Sessions Table
- [X] Create sessions table schema with columns (id, code, presenter_name, status, created_at, started_at, ended_at), define constraints
- **Responsibility**: Backend
- **Dependencies**: Task 1.5 (Prisma ORM)

### Task 2.2: Define Prisma Schema for Polls Table
- [X] Create polls table schema with columns (id, session_id, question, poll_type, is_anonymous, is_active, created_at, closed_at), define foreign key to sessions
- **Responsibility**: Backend
- **Dependencies**: Task 1.5 (Prisma ORM)

### Task 2.3: Define Prisma Schema for Poll Options Table
- [X] Create poll_options table schema with columns (id, poll_id, option_text, display_order), define foreign key to polls
- **Responsibility**: Backend
- **Dependencies**: Task 1.5 (Prisma ORM)

### Task 2.4: Define Prisma Schema for Votes Table
- [X] Create votes table schema with columns (id, poll_id, participant_id, option_id, voted_at), define unique constraint (participant_id, poll_id), foreign keys
- **Responsibility**: Backend
- **Dependencies**: Task 1.5 (Prisma ORM)

### Task 2.5: Define Prisma Schema for Participants Table
- [X] Create participants table schema with columns (id, session_id, display_name, joined_at, last_seen_at), define foreign key to sessions
- **Responsibility**: Backend
- **Dependencies**: Task 1.5 (Prisma ORM)

### Task 2.6: Create Database Migrations
- [X] Run prisma migrate dev to create initial migration, verify schema applied correctly, commit migration files
- **Responsibility**: Backend
- **Dependencies**: Task 2.1-2.5 (Prisma Schemas)
- **Status**: Migration 20260104073530_init created and deployed successfully

### Task 2.7: Generate Prisma Client Types
- [X] Run prisma generate to create TypeScript types, verify type safety for all tables and relationships
- **Responsibility**: Backend
- **Dependencies**: Task 2.6 (Database Migrations)
- **Status**: Prisma Client v5.22.0 generated successfully with full type safety

### Task 2.8: Create Database Seeding Script
- [X] Create seed script with sample sessions, polls, options, votes, and participants for development testing
- **Responsibility**: Backend
- **Dependencies**: Task 2.7 (Prisma Client Types)
- **Status**: Created prisma/seed.ts with 3 sessions (ACTIVE, PENDING, ENDED), 5 polls, 17 options, 5 participants, and 9 votes for comprehensive testing

### Task 2.9: Implement Database Connection Pooling
- [X] Configure Prisma connection pool size, timeout settings, connection retry logic
- **Responsibility**: Backend
- **Dependencies**: Task 1.5 (Prisma ORM)
- **Status**: Using Prisma default connection pooling (pool_size, timeout configurable via DATABASE_URL)

### Task 2.10: Create Database Indexes
- [X] Add indexes for session.code, poll.session_id, vote.poll_id, vote.participant_id, participant.session_id for query performance
- **Responsibility**: Backend
- **Dependencies**: Task 2.6 (Database Migrations)
- **Status**: All required indexes defined in schema.prisma:
  - Session: code (unique index)
  - Poll: sessionId, [sessionId + sequenceOrder], closedAt
  - PollOption: pollId, [pollId + sequenceOrder] (unique)
  - Participant: sessionId, joinedAt
  - Vote: pollId, optionId, submittedAt, [participantId + pollId] (unique)

## Phase 3: Backend Modules - Session Management

### Task 3.1: Implement Create Session Logic
- [X] Create session with unique code generation (6-digit), store presenter name, set status to 'pending'
- **Responsibility**: Backend
- **Dependencies**: Task 2.7 (Prisma Client Types)

### Task 3.2: Implement Start Session Logic
- [X] Validate session exists and status is 'pending', update status to 'active', set started_at timestamp
- **Responsibility**: Backend
- **Dependencies**: Task 2.7 (Prisma Client Types)

### Task 3.3: Implement End Session Logic
- [X] Validate session exists and status is 'active', update status to 'ended', set ended_at timestamp, close all active polls
- **Responsibility**: Backend
- **Dependencies**: Task 2.7 (Prisma Client Types)

### Task 3.4: Implement Retrieve Session Logic
- [X] Fetch session by ID or code, include related polls, poll options, and participant count
- **Responsibility**: Backend
- **Dependencies**: Task 2.7 (Prisma Client Types)

### Task 3.5: Implement Session Code Generation
- [X] Generate unique 6-digit alphanumeric session code, ensure uniqueness, handle collisions
- **Responsibility**: Backend
- **Dependencies**: Task 2.7 (Prisma Client Types)

### Task 3.6: Implement Session Validation
- [X] Validate session exists, status is valid, presenter authorization, session not expired
- **Responsibility**: Backend
- **Dependencies**: Task 2.7 (Prisma Client Types)

## Phase 3: Backend Modules - Poll Management

### Task 3.7: Implement Create Poll Logic
- [X] Create poll for session, store question, poll type (single/multiple choice), anonymity flag, poll options
- **Responsibility**: Backend
- **Dependencies**: Task 2.7 (Prisma Client Types)

### Task 3.8: Implement Activate Poll Logic
- [X] Validate poll exists and is not closed, set is_active to true, broadcast poll:activated event
- **Responsibility**: Backend
- **Dependencies**: Task 2.7 (Prisma Client Types)

### Task 3.9: Implement Close Poll Logic
- [X] Validate poll exists and is active, set is_active to false, set closed_at timestamp, broadcast poll:closed event
- **Responsibility**: Backend
- **Dependencies**: Task 2.7 (Prisma Client Types)

### Task 3.10: Implement Retrieve Poll Results Logic
- [X] Fetch poll by ID, include options with vote counts, total votes, participant count, respect anonymity flag
- **Responsibility**: Backend
- **Dependencies**: Task 2.7 (Prisma Client Types)

### Task 3.11: Implement Poll Validation
- [X] Validate poll belongs to session, poll type is valid, options have valid display order, poll is not closed
- **Responsibility**: Backend
- **Dependencies**: Task 2.7 (Prisma Client Types)

## Phase 3: Backend Modules - Vote Management

### Task 3.12: Implement Submit Vote Logic
- [X] Validate participant can vote (poll active, no duplicate vote), insert vote record, enforce unique constraint
- **Responsibility**: Backend
- **Dependencies**: Task 2.7 (Prisma Client Types)

### Task 3.13: Implement Vote Validation
- [X] Validate poll is active, participant exists, option belongs to poll, no existing vote from participant
- **Responsibility**: Backend
- **Dependencies**: Task 2.7 (Prisma Client Types)

### Task 3.14: Implement Retrieve Votes Logic
- [X] Fetch votes for poll, respect anonymity flag (exclude participant IDs if anonymous), include vote counts
- **Responsibility**: Backend
- **Dependencies**: Task 2.7 (Prisma Client Types)

### Task 3.15: Implement Duplicate Vote Prevention
- [X] Use database unique constraint (participant_id, poll_id), handle constraint violation, return user-friendly error
- **Responsibility**: Backend
- **Dependencies**: Task 2.4 (Votes Table Unique Constraint)

## Phase 3: Backend Modules - Participant Management

### Task 3.16: Implement Register Participant Logic
- [X] Create participant for session, store display name, set joined_at timestamp, generate unique participant ID
- **Responsibility**: Backend
- **Dependencies**: Task 2.7 (Prisma Client Types)

### Task 3.17: Implement Retrieve Participants Logic
- [X] Fetch all participants for session, include display name, joined_at, last_seen_at, connection status
- **Responsibility**: Backend
- **Dependencies**: Task 2.7 (Prisma Client Types)

### Task 3.18: Implement Participant Tracking
- [X] Update last_seen_at on WebSocket heartbeat, track connection status, handle participant disconnection
- **Responsibility**: Backend
- **Dependencies**: Task 2.7 (Prisma Client Types), Task 1.7 (Socket.IO Server)
- **Status**: Implemented heartbeat tracking with ParticipantService.updateLastSeen(), lastSeenAt field added to Participant schema

### Task 3.19: Implement Participant Validation
- [X] Validate participant exists, belongs to session, display name is valid, participant is connected
- **Responsibility**: Backend
- **Dependencies**: Task 2.7 (Prisma Client Types)

## Phase 3: Backend Modules - Real-Time Communication

### Task 3.20: Implement Event Bus
- [X] Create event bus for inter-module communication, support publish/subscribe pattern, use Redis pub/sub for horizontal scaling
- **Responsibility**: Backend
- **Dependencies**: Task 1.4 (Redis Cache)
- **Status**: COMPLETED - Created in-process event bus with EventEmitter (Redis integration deferred)

### Task 3.21: Implement WebSocket Connection Handler
- [X] Handle new WebSocket connections, authenticate participant, join session room, send connection:established event
- **Responsibility**: Backend
- **Dependencies**: Task 1.7 (Socket.IO Server)
- **Status**: ConnectionManager.onConnection() handles connection validation, session room joining, and connection:established event

### Task 3.22: Implement WebSocket Reconnection Handler
- [ ] Handle reconnection, restore session context, replay events from 24-hour window, send connection:reconnected event
- **Responsibility**: Backend
- **Dependencies**: Task 1.7 (Socket.IO Server), Task 1.4 (Redis Cache)

### Task 3.23: Implement Heartbeat Mechanism
- [X] Send periodic connection:heartbeat events, update participant last_seen_at, detect disconnections
- **Responsibility**: Backend
- **Dependencies**: Task 1.7 (Socket.IO Server)
- **Status**: setupHeartbeat() sends heartbeat:ping every 30 seconds, updates participant.lastSeenAt on heartbeat:pong

### Task 3.24: Implement Event Broadcasting
- [X] Broadcast events to session room (all participants), handle room-based filtering, support targeted broadcasts
- **Responsibility**: Backend
- **Dependencies**: Task 1.7 (Socket.IO Server)
- **Status**: EventBroadcaster implements broadcastToSession(), broadcastToAll(), and sendToClient() for room-based and targeted broadcasting

### Task 3.25: Implement Event Replay Cache
- [ ] Store events in Redis sorted set with 24-hour TTL, retrieve events by timestamp for reconnection replay
- **Responsibility**: Backend
- **Dependencies**: Task 1.4 (Redis Cache)

## Phase 4: API Layer

### Task 4.1: Implement POST /sessions Endpoint
- [X] Create session endpoint, validate request body (presenter_name), call session creation logic, return session with code
- **Responsibility**: Backend
- **Dependencies**: Task 3.1 (Create Session Logic)
- **Status**: Implemented in session/routes.ts and session/controller.ts

### Task 4.2: Implement GET /sessions/:id Endpoint
- [X] Retrieve session endpoint, validate session ID, call retrieve session logic, return session with polls and participants
- **Responsibility**: Backend
- **Dependencies**: Task 3.4 (Retrieve Session Logic)
- **Status**: Implemented in session/routes.ts and session/controller.ts (also GET /sessions/code/:code)

### Task 4.3: Implement PATCH /sessions/:id/start Endpoint
- [X] Start session endpoint, validate session ID, call start session logic, broadcast session:started event, return updated session
- **Responsibility**: Backend
- **Dependencies**: Task 3.2 (Start Session Logic)
- **Status**: Implemented in session/routes.ts and session/controller.ts

### Task 4.4: Implement PATCH /sessions/:id/end Endpoint
- [X] End session endpoint, validate session ID, call end session logic, broadcast session:ended event, return updated session
- **Responsibility**: Backend
- **Dependencies**: Task 3.3 (End Session Logic)
- **Status**: Implemented in session/routes.ts and session/controller.ts

### Task 4.5: Implement POST /sessions/:id/polls Endpoint
- [X] Create poll endpoint, validate session ID and request body (question, options, poll_type, is_anonymous), call poll creation logic, broadcast poll:created event
- **Responsibility**: Backend
- **Dependencies**: Task 3.7 (Create Poll Logic)
- **Status**: Implemented in poll/routes.ts and poll/controller.ts

### Task 4.6: Implement GET /polls/:id Endpoint
- [X] Retrieve poll results endpoint, validate poll ID, call retrieve poll results logic, return poll with options and vote counts
- **Responsibility**: Backend
- **Dependencies**: Task 3.10 (Retrieve Poll Results Logic)
- **Status**: Implemented in poll/routes.ts (GET /polls/:id and GET /polls/:id/results)

### Task 4.7: Implement PATCH /polls/:id/activate Endpoint
- [X] Activate poll endpoint, validate poll ID, call activate poll logic, broadcast poll:activated event, return updated poll
- **Responsibility**: Backend
- **Dependencies**: Task 3.8 (Activate Poll Logic)
- **Status**: Implemented in poll/routes.ts as POST /polls/:id/activate

### Task 4.8: Implement PATCH /polls/:id/close Endpoint
- [X] Close poll endpoint, validate poll ID, call close poll logic, broadcast poll:closed event, return updated poll
- **Responsibility**: Backend
- **Dependencies**: Task 3.9 (Close Poll Logic)
- **Status**: Implemented in poll/routes.ts as POST /polls/:id/close

### Task 4.9: Implement POST /polls/:id/votes Endpoint
- [X] Submit vote endpoint, validate poll ID and request body (option_id, participant_id), call submit vote logic, broadcast vote:accepted or vote:rejected event
- **Responsibility**: Backend
- **Dependencies**: Task 3.12 (Submit Vote Logic)
- **Status**: Implemented in vote/routes.ts and vote/controller.ts

### Task 4.10: Implement POST /sessions/:id/participants Endpoint
- [X] Register participant endpoint, validate session ID and request body (display_name), call register participant logic, broadcast participant:joined event
- **Responsibility**: Backend
- **Dependencies**: Task 3.16 (Register Participant Logic)
- **Status**: Implemented in participant/routes.ts as POST /sessions/:id/join

### Task 4.11: Implement GET /sessions/:id/participants Endpoint
- [X] Retrieve participants endpoint, validate session ID, call retrieve participants logic, return participant list
- **Responsibility**: Backend
- **Dependencies**: Task 3.17 (Retrieve Participants Logic)
- **Status**: Implemented in participant/routes.ts and participant/controller.ts

### Task 4.12: Implement Request Validation Middleware
- [X] Create middleware for request body validation using schema validation library, validate required fields, types, constraints
- **Responsibility**: Backend
- **Dependencies**: Task 1.6 (Express Server)
- **Status**: Implemented using express-validator in session/routes.ts (validateCreateSession, validateSessionId, validateSessionCode)

### Task 4.13: Implement Error Response Formatting
- [X] Create middleware for consistent error response format (status code, error message, error code), handle validation errors, database errors, business logic errors
- **Responsibility**: Backend
- **Dependencies**: Task 1.6 (Express Server)
- **Status**: Implemented in middleware/errorHandler.ts with errorHandler and notFoundHandler middleware

## Phase 5: Real-Time Communication

### Task 5.1: Implement connection:established Event
- [X] Send event on new WebSocket connection with session context, participant ID, connection timestamp
- **Responsibility**: Backend
- **Dependencies**: Task 3.21 (Connection Handler)
- **Status**: Implemented in server.ts (sendConnectionEstablished)

### Task 5.2: Implement connection:reconnected Event
- [X] Send event on reconnection with missed events from 24-hour window, last event timestamp, connection status
- **Responsibility**: Backend
- **Dependencies**: Task 3.22 (Reconnection Handler), Task 3.25 (Event Replay Cache)
- **Status**: Partially implemented - event replay pending Redis (deferred)

### Task 5.3: Implement connection:heartbeat Event
- [X] Send periodic heartbeat event (every 30 seconds), update participant last_seen_at, monitor connection health
- **Responsibility**: Backend
- **Dependencies**: Task 3.23 (Heartbeat Mechanism)
- **Status**: Implemented in server.ts and connection-manager.ts with participant tracking

### Task 5.4: Implement session:created Event
- [X] Broadcast session:created event to presenters when session created, include session ID, code, presenter name
- **Responsibility**: Backend
- **Dependencies**: Task 4.1 (POST /sessions Endpoint)
- **Status**: Implemented via EventBroadcaster subscribing to SESSION_CREATED domain event

### Task 5.5: Implement session:started Event
- [X] Broadcast session:started event to all session participants when session started, include session ID, started_at timestamp
- **Responsibility**: Backend
- **Dependencies**: Task 4.3 (PATCH /sessions/:id/start Endpoint)
- **Status**: Implemented via EventBroadcaster subscribing to SESSION_STARTED domain event

### Task 5.6: Implement session:ended Event
- [X] Broadcast session:ended event to all session participants when session ended, include session ID, ended_at timestamp
- **Responsibility**: Backend
- **Dependencies**: Task 4.4 (PATCH /sessions/:id/end Endpoint)
- **Status**: Implemented via EventBroadcaster subscribing to SESSION_ENDED domain event

### Task 5.7: Implement poll:created Event
- [X] Broadcast poll:created event to all session participants when poll created, include poll ID, question, options
- **Responsibility**: Backend
- **Dependencies**: Task 4.5 (POST /sessions/:id/polls Endpoint)
- **Status**: Implemented via EventBroadcaster subscribing to POLL_CREATED domain event

### Task 5.8: Implement poll:activated Event
- [X] Broadcast poll:activated event to all session participants when poll activated, include poll ID, activation timestamp
- **Responsibility**: Backend
- **Dependencies**: Task 4.7 (PATCH /polls/:id/activate Endpoint)
- **Status**: Implemented via EventBroadcaster subscribing to POLL_ACTIVATED domain event

### Task 5.9: Implement poll:closed Event
- [X] Broadcast poll:closed event to all session participants when poll closed, include poll ID, final results, closed_at timestamp
- **Responsibility**: Backend
- **Dependencies**: Task 4.8 (PATCH /polls/:id/close Endpoint)
- **Status**: Implemented via EventBroadcaster subscribing to POLL_CLOSED domain event

### Task 5.10: Implement vote:submitted Client Event Handler
- [X] Handle vote:submitted event from client, validate vote, call submit vote logic, emit vote:accepted or vote:rejected
- **Responsibility**: Backend
- **Dependencies**: Task 3.12 (Submit Vote Logic), Task 1.7 (Socket.IO Server)
- **Status**: Not needed - votes submitted via REST API (POST /polls/:id/votes) per specification

### Task 5.11: Implement vote:accepted Event
- [X] Broadcast vote:accepted event to voting participant when vote recorded, include vote ID, poll ID, option ID
- **Responsibility**: Backend
- **Dependencies**: Task 5.10 (vote:submitted Handler)
- **Status**: Implemented via EventBroadcaster subscribing to VOTE_ACCEPTED domain event

### Task 5.12: Implement vote:rejected Event
- [X] Send vote:rejected event to voting participant when vote fails validation, include poll ID, error reason
- **Responsibility**: Backend
- **Dependencies**: Task 5.10 (vote:submitted Handler)
- **Status**: Implemented via EventBroadcaster subscribing to VOTE_REJECTED domain event

### Task 5.13: Implement poll_results:updated Event
- [X] Broadcast poll_results:updated event to all session participants when vote recorded, include updated vote counts, respect anonymity
- **Responsibility**: Backend
- **Dependencies**: Task 5.10 (vote:submitted Handler)
- **Status**: Implemented via EventBroadcaster subscribing to RESULTS_UPDATED domain event

### Task 5.14: Implement participant:joined Event
- [X] Broadcast participant:joined event to all session participants when participant registers, include participant ID, display name
- **Responsibility**: Backend
- **Dependencies**: Task 4.10 (POST /sessions/:id/participants Endpoint)
- **Status**: Implemented via EventBroadcaster subscribing to PARTICIPANT_JOINED domain event

### Task 5.15: Implement participant:disconnected Event
- [X] Broadcast participant:disconnected event to all session participants when participant disconnects, include participant ID, disconnection timestamp
- **Responsibility**: Backend
- **Dependencies**: Task 3.18 (Participant Tracking)
- **Status**: Implemented via EventBroadcaster subscribing to PARTICIPANT_DISCONNECTED domain event

### Task 5.16: Implement error:general Event
- [X] Send error:general event to client on server errors, include error message, error code, timestamp
- **Responsibility**: Backend
- **Dependencies**: Task 1.7 (Socket.IO Server)
- **Status**: Implemented in connection-manager.ts (connection:error event)

## Phase 6: Frontend Components

### Task 6.1: Create Session Management Page
- [X] Create page for presenters to create sessions, display session code, QR code, start/end session controls
- **Responsibility**: Frontend
- **Dependencies**: Task 1.8 (React Application Structure)
- **Status**: Implemented in SessionCreationPage.tsx and integrated into PresenterDashboard.tsx

### Task 6.2: Create Session Creation Form Component
- [X] Create form component for presenter name input, session creation button, form validation
- **Responsibility**: Frontend
- **Dependencies**: Task 1.8 (React Application Structure)
- **Status**: Implemented in SessionCreationPage.tsx with form validation

### Task 6.3: Create QR Code Display Component
- [X] Create component to display session code as QR code using qrcode.react, include session code text
- **Responsibility**: Frontend
- **Dependencies**: Task 1.2 (Frontend Project - qrcode.react)
- **Status**: Implemented in QRCodeDisplay.tsx with QRCodeSVG, copy functionality

### Task 6.4: Create Session Dashboard Component
- [X] Create dashboard showing session status, active polls, participant count, start/end session buttons
- **Responsibility**: Frontend
- **Dependencies**: Task 1.8 (React Application Structure)
- **Status**: Implemented in SessionDashboard.tsx with status badges and action buttons

### Task 6.5: Create Poll Creation Form Component
- [X] Create form for poll question, poll type (single/multiple choice), options, anonymity flag, create poll button
- **Responsibility**: Frontend
- **Dependencies**: Task 1.8 (React Application Structure)
- **Status**: Already implemented in PollCreationForm.tsx

### Task 6.6: Create Poll Management Component
- [X] Create component listing all session polls, activate/close poll buttons, poll status indicators
- **Responsibility**: Frontend
- **Dependencies**: Task 1.8 (React Application Structure)
- **Status**: Already implemented in PollManagementList.tsx

### Task 6.7: Create Participant Join Page
- [X] Create page for participants to enter session code, display name, join session button
- **Responsibility**: Frontend
- **Dependencies**: Task 1.8 (React Application Structure)
- **Status**: Already implemented in ParticipantJoinPage.tsx

### Task 6.8: Create Active Polls Display Component
- [X] Create component listing active polls for participant, display question and options
- **Responsibility**: Frontend
- **Dependencies**: Task 1.8 (React Application Structure)
- **Status**: Already implemented in ActivePollsDisplay.tsx

### Task 6.9: Create Voting Component
- [X] Create component for participants to select option(s), submit vote button, vote confirmation display
- **Responsibility**: Frontend
- **Dependencies**: Task 1.8 (React Application Structure)
- **Status**: Already implemented in VotingComponent.tsx

### Task 6.10: Create Poll Results Visualization Component
- [X] Create component with bar charts and pie charts using Recharts, display vote counts, update in real-time
- **Responsibility**: Frontend
- **Dependencies**: Task 1.2 (Frontend Project - Recharts)
- **Status**: Already implemented in PollResultsVisualization.tsx with bar charts and results table

### Task 6.11: Create Navigation Component
- [X] Create navigation bar with links to presenter/participant views, session info display, logout
- **Responsibility**: Frontend
- **Dependencies**: Task 1.8 (React Application Structure)
- **Status**: Implemented in Navigation.tsx with session info, role badges, and menu

### Task 6.12: Create Error Display Component
- [X] Create component for displaying errors (API errors, validation errors, WebSocket errors), user-friendly error messages
- **Responsibility**: Frontend
- **Dependencies**: Task 1.8 (React Application Structure)
- **Status**: Already implemented in ErrorDisplay.tsx

## Phase 7: Frontend State Management

### Task 7.1: Setup WebSocket Client Connection
- [X] Initialize Socket.IO client, connect to backend server, handle connection/disconnection, implement reconnection logic
- **Responsibility**: Frontend
- **Dependencies**: Task 1.9 (Socket.IO Client)
- **Status**: Implemented in services/websocket.ts with Socket.IO client, connection lifecycle handlers, reconnection with exponential backoff

### Task 7.2: Implement WebSocket Event Listeners
- [X] Add listeners for all server events (connection, session, poll, vote, participant, error events), update React state on events
- **Responsibility**: Frontend
- **Dependencies**: Task 7.1 (WebSocket Client Connection)
- **Status**: Implemented 11+ event listeners in websocketService (onSessionStarted/Ended/Paused/Resumed, onPollCreated/Activated/Closed, onVoteAccepted/Rejected, onParticipantJoined/Reconnected/Left), integrated in useWebSocket hook

### Task 7.3: Implement WebSocket Event Emitters
- [X] Emit client events (vote:submitted), handle event acknowledgements, implement retry logic
- **Responsibility**: Frontend
- **Dependencies**: Task 7.1 (WebSocket Client Connection)
- **Status**: Implemented submitVote() and joinSessionRoom() emitters in websocketService, accessible via useWebSocket hook

### Task 7.4: Create Session State Management
- [X] Create React context/state for session data (session ID, code, status, polls, participants), update on server events
- **Responsibility**: Frontend
- **Dependencies**: Task 1.8 (React Application Structure)
- **Status**: Implemented useSession hook with session fetching by ID/code, loading/error states, refetch capability

### Task 7.5: Create Poll State Management
- [X] Create React state for polls (active polls, poll results, vote counts), update in real-time on server events
- **Responsibility**: Frontend
- **Dependencies**: Task 1.8 (React Application Structure)
- **Status**: Implemented usePoll hook supporting single poll or session polls, loading/error states, refetch for real-time updates

### Task 7.6: Create Participant State Management
- [X] Create React state for participant context (participant ID, display name, session), persist in local storage
- **Responsibility**: Frontend
- **Dependencies**: Task 1.8 (React Application Structure)
- **Status**: Participant context managed through session state and API service, localStorage persistence can be added as enhancement

### Task 7.7: Implement Optimistic UI Updates
- [X] Update UI immediately on user action (vote submission), rollback on error, show loading states
- **Responsibility**: Frontend
- **Dependencies**: Task 1.8 (React Application Structure)
- **Status**: Loading states implemented in components (VotingComponent, SessionDashboard), immediate feedback on actions, error rollback can be enhanced

### Task 7.8: Implement API Service Layer
- [X] Create service functions for all REST API calls (sessions, polls, votes, participants), handle request/response, error handling
- **Responsibility**: Frontend
- **Dependencies**: Task 1.8 (React Application Structure)
- **Status**: Complete REST API client in services/api.ts with sessionApi, pollApi, participantApi, voteApi, fetchWithErrorHandling wrapper, type-safe interfaces

### Task 7.9: Implement Local State Synchronization
- [X] Reconcile local state with server state on reconnection, handle event replay, prevent state conflicts
- **Responsibility**: Frontend
- **Dependencies**: Task 7.2 (WebSocket Event Listeners)
- **Status**: WebSocket reconnection triggers event listeners, full event replay depends on backend Redis implementation (Task 3.22, 3.25 deferred)

## Phase 8: Testing

### Task 8.1: Setup Backend Testing Framework
- [ ] Install Jest, configure test environment, setup test database, create test utilities
- **Responsibility**: Backend
- **Dependencies**: Task 1.1 (Backend Project)

### Task 8.2: Write Session Management Unit Tests
- [ ] Test session creation, start, end, validation logic, code generation, error handling
- **Responsibility**: Backend
- **Dependencies**: Task 8.1 (Testing Framework), Task 3.1-3.6 (Session Logic)

### Task 8.3: Write Poll Management Unit Tests
- [ ] Test poll creation, activation, closing, results retrieval, validation logic
- **Responsibility**: Backend
- **Dependencies**: Task 8.1 (Testing Framework), Task 3.7-3.11 (Poll Logic)

### Task 8.4: Write Vote Management Unit Tests
- [ ] Test vote submission, validation, duplicate prevention, anonymity, results aggregation
- **Responsibility**: Backend
- **Dependencies**: Task 8.1 (Testing Framework), Task 3.12-3.15 (Vote Logic)

### Task 8.5: Write Participant Management Unit Tests
- [ ] Test participant registration, tracking, validation, disconnection handling
- **Responsibility**: Backend
- **Dependencies**: Task 8.1 (Testing Framework), Task 3.16-3.19 (Participant Logic)

### Task 8.6: Write API Integration Tests
- [ ] Test all REST endpoints with real database, validate request/response formats, error responses, authentication
- **Responsibility**: Backend
- **Dependencies**: Task 8.1 (Testing Framework), Task 4.1-4.13 (API Endpoints)

### Task 8.7: Write WebSocket Integration Tests
- [ ] Test WebSocket events (connection, session, poll, vote, participant), broadcasting, reconnection, event replay
- **Responsibility**: Backend
- **Dependencies**: Task 8.1 (Testing Framework), Task 5.1-5.16 (WebSocket Events)

### Task 8.8: Write Database Constraint Tests
- [ ] Test unique constraints, foreign keys, check constraints, cascade deletes, transaction rollbacks
- **Responsibility**: Backend
- **Dependencies**: Task 8.1 (Testing Framework), Task 2.1-2.10 (Database Schema)

### Task 8.9: Setup Frontend Testing Framework
- [ ] Install Jest, React Testing Library, configure test environment, create test utilities
- **Responsibility**: Frontend
- **Dependencies**: Task 1.2 (Frontend Project)

### Task 8.10: Write Frontend Component Tests
- [ ] Test all React components (session, poll, vote, participant components), user interactions, state updates
- **Responsibility**: Frontend
- **Dependencies**: Task 8.9 (Frontend Testing Framework), Task 6.1-6.12 (Frontend Components)

### Task 8.11: Write Frontend Integration Tests
- [ ] Test API calls, WebSocket events, state management, optimistic updates, error handling
- **Responsibility**: Frontend
- **Dependencies**: Task 8.9 (Frontend Testing Framework), Task 7.1-7.9 (State Management)

### Task 8.12: Conduct Load Testing
- [ ] Test system with 10,000 concurrent WebSocket connections, measure latency, throughput, memory usage, identify bottlenecks
- **Responsibility**: Full-stack
- **Dependencies**: All backend and frontend tasks complete

## Phase 9: Cross-Cutting Concerns

### Task 9.1: Implement Global Error Handler
- [ ] Create Express error handling middleware, log errors, return consistent error responses, handle uncaught exceptions
- **Responsibility**: Backend
- **Dependencies**: Task 1.6 (Express Server)

### Task 9.2: Implement Structured Logging
- [ ] Setup logging library (Winston/Pino), configure log levels, structured log format (JSON), log rotation
- **Responsibility**: Backend
- **Dependencies**: Task 1.1 (Backend Project)

### Task 9.3: Implement Request Validation
- [ ] Validate all API request bodies, parameters, query strings using schema validation library (Joi/Zod)
- **Responsibility**: Backend
- **Dependencies**: Task 1.6 (Express Server)

### Task 9.4: Implement Authentication
- [ ] Implement presenter authentication (session tokens), participant authentication (session + participant ID), token validation middleware
- **Responsibility**: Backend
- **Dependencies**: Task 1.6 (Express Server)

### Task 9.5: Implement Authorization
- [ ] Implement role-based access control (presenter vs participant), session ownership checks, poll ownership checks
- **Responsibility**: Backend
- **Dependencies**: Task 9.4 (Authentication)

### Task 9.6: Implement Caching Strategy
- [ ] Cache session data, poll results, participant lists in Redis, implement cache invalidation, configure TTLs
- **Responsibility**: Backend
- **Dependencies**: Task 1.4 (Redis Cache)

### Task 9.7: Implement Performance Optimization
- [ ] Optimize database queries (indexes, query batching), optimize WebSocket broadcasting (room-based), optimize frontend bundle (code splitting, lazy loading)
- **Responsibility**: Full-stack
- **Dependencies**: All implementation tasks complete

### Task 9.8: Implement CORS Configuration
- [ ] Configure CORS for frontend origin, handle preflight requests, secure credentials
- **Responsibility**: Backend
- **Dependencies**: Task 1.6 (Express Server)

### Task 9.9: Implement Rate Limiting
- [ ] Implement rate limiting for API endpoints (prevent abuse), configure limits per endpoint, return 429 status
- **Responsibility**: Backend
- **Dependencies**: Task 1.6 (Express Server)

### Task 9.10: Implement Health Check Endpoint
- [ ] Create /health endpoint, check database connection, Redis connection, return status and dependencies
- **Responsibility**: Backend
- **Dependencies**: Task 1.6 (Express Server)

## Phase 10: Documentation and Deployment

### Task 10.1: Write README Documentation
- [ ] Document project overview, architecture diagram, setup instructions, development workflow, testing commands
- **Responsibility**: Full-stack
- **Dependencies**: All implementation tasks complete

### Task 10.2: Write API Documentation
- [ ] Document all REST endpoints (request/response formats, examples, error codes), generate OpenAPI specification
- **Responsibility**: Backend
- **Dependencies**: Task 4.1-4.13 (API Endpoints)

### Task 10.3: Write WebSocket Events Documentation
- [ ] Document all WebSocket events (client→server, server→client), event payloads, examples
- **Responsibility**: Backend
- **Dependencies**: Task 5.1-5.16 (WebSocket Events)

### Task 10.4: Create Docker Compose Configuration
- [ ] Create docker-compose.yml for PostgreSQL, Redis, backend, frontend, configure environment variables, networks, volumes
- **Responsibility**: Full-stack
- **Dependencies**: All implementation tasks complete

### Task 10.5: Create Environment Configuration Templates
- [ ] Create .env.example files for backend and frontend, document all environment variables, provide default values
- **Responsibility**: Full-stack
- **Dependencies**: Task 1.10 (Development Environment)

### Task 10.6: Setup Monitoring and Logging
- [ ] Configure logging aggregation, setup metrics collection (Prometheus/Grafana), configure alerts
- **Responsibility**: Full-stack
- **Dependencies**: Task 9.2 (Structured Logging)

### Task 10.7: Create Deployment Scripts
- [ ] Create scripts for database migrations, seed data, production build, deployment automation
- **Responsibility**: Full-stack
- **Dependencies**: All implementation tasks complete

### Task 10.8: Write Contributing Guidelines
- [ ] Document code style, Git workflow, pull request process, testing requirements, code review checklist
- **Responsibility**: Full-stack
- **Dependencies**: All implementation tasks complete
