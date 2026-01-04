# Live Event Polling Application - Backend

Backend server for the Live Event Polling Application implementing the Session Management module.

## Architecture

This backend follows a **Modular Monolith** architecture (ADR-001) with clear module boundaries:

- **Session Management Module**: Handles session lifecycle (create, start, end)
- Clean separation of concerns: Repository → Service → Controller → Routes
- Type-safe database access using Prisma ORM
- RESTful API endpoints with validation

## Technology Stack

- **Runtime**: Node.js 20 LTS
- **Framework**: Express 4.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL 16
- **ORM**: Prisma 5.x
- **Validation**: express-validator

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── modules/
│   │   └── session/           # Session Management Module
│   │       ├── types.ts       # Domain types and interfaces
│   │       ├── repository.ts  # Data access layer
│   │       ├── service.ts     # Business logic
│   │       ├── controller.ts  # HTTP handlers
│   │       ├── routes.ts      # Route definitions
│   │       ├── validation.ts  # Request validation
│   │       └── index.ts       # Module exports
│   ├── middleware/
│   │   └── errorHandler.ts   # Global error handling
│   ├── app.ts                 # Express app configuration
│   └── server.ts              # Server entry point
├── package.json
├── tsconfig.json
└── .env.example
```

## Setup

### Prerequisites

- Node.js 20 or later
- PostgreSQL 16
- npm or yarn

### Installation

1. Clone the repository and navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from example:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your PostgreSQL connection string:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/livepoll?schema=public"
   PORT=3000
   NODE_ENV=development
   ```

5. Generate Prisma Client:
   ```bash
   npm run prisma:generate
   ```

6. Run database migrations:
   ```bash
   npm run prisma:migrate
   ```

## Development

Start the development server with hot reload:
```bash
npm run dev
```

The server will start on http://localhost:3000

## API Endpoints

### Session Management

#### Create Session
```http
POST /sessions
Content-Type: application/json

{
  "presenterName": "John Doe"
}

Response: 201 Created
{
  "session": {
    "id": "uuid",
    "code": "ABC123",
    "presenterName": "John Doe",
    "status": "PENDING",
    "createdAt": "2026-01-03T...",
    "startedAt": null,
    "endedAt": null
  },
  "event": {
    "sessionId": "uuid",
    "code": "ABC123",
    "presenterName": "John Doe",
    "createdAt": "2026-01-03T..."
  }
}
```

#### Get Session by ID
```http
GET /sessions/:id

Response: 200 OK
{
  "session": { ... }
}
```

#### Get Session by Code
```http
GET /sessions/code/:code

Response: 200 OK
{
  "session": { ... }
}
```

#### Start Session
```http
PATCH /sessions/:id/start

Response: 200 OK
{
  "session": { ... },
  "event": {
    "sessionId": "uuid",
    "startedAt": "2026-01-03T..."
  }
}
```

#### End Session
```http
PATCH /sessions/:id/end

Response: 200 OK
{
  "session": { ... },
  "event": {
    "sessionId": "uuid",
    "endedAt": "2026-01-03T..."
  }
}
```

### Health Check
```http
GET /health

Response: 200 OK
{
  "status": "ok",
  "timestamp": "2026-01-03T..."
}
```

## Error Responses

All errors follow a consistent format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "details": { ... }
}
```

Common status codes:
- `400` - Invalid state transition or bad request
- `404` - Session not found
- `422` - Validation failed
- `500` - Internal server error

## Module Boundaries

The Session Management Module has:

**Owned Entities**: Session

**Responsibilities**:
- Session lifecycle management (create, start, end)
- Unique session code generation
- Session state validation
- Presenter authorization (future)

**Published Events**:
- SessionCreated
- SessionStarted
- SessionEnded

**Dependencies**: None (root aggregate)

## Build for Production

1. Build TypeScript:
   ```bash
   npm run build
   ```

2. Start production server:
   ```bash
   npm start
   ```

## License

MIT
