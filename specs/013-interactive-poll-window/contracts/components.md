# Component Contracts: Interactive Poll Window

**Feature**: Interactive Poll Window  
**Phase**: 1 - Design  
**Date**: January 5, 2026

## Component Interface Specifications

### 1. PollWindowPage Component

**Purpose**: Root component for the standalone poll window, manages data fetching and WebSocket connection.

**Location**: `frontend/src/pages/PollWindowPage.tsx`

**Props**: None (receives pollId from URL route parameter)

**Route**: `/poll-window/:pollId`

**Responsibilities**:
- Parse pollId from URL parameters
- Fetch initial poll data from REST API
- Establish and manage Socket.IO connection
- Handle connection lifecycle and cleanup
- Render child components with poll data
- Display loading, error, and deleted states

**State Management**:
```typescript
interface PollWindowPageState {
  pollData: PollData | null;
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  error: string | null;
}
```

**Key Methods**:
- `fetchPollData(): Promise<void>` - Fetch initial poll data
- `connectSocket(): void` - Establish WebSocket connection
- `handleVoteUpdate(update: VoteUpdate): void` - Process incoming vote events
- `handlePollDeleted(): void` - Handle poll deletion event
- `cleanup(): void` - Disconnect and clean up resources

**Error Handling**:
- 404 Poll Not Found: Display "Poll not found" message
- Network Error: Display "Connection failed" with retry button
- Poll Deleted: Display "This poll has been deleted" message

### 2. PollWindowDisplay Component

**Purpose**: Main display component for poll presentation, orchestrates chart and counters.

**Location**: `frontend/src/components/PollWindow/PollWindowDisplay.tsx`

**Props**:
```typescript
interface PollWindowDisplayProps {
  poll: PollData;
  connectionStatus: ConnectionStatus;
}
```

**Responsibilities**:
- Display poll question prominently
- Render PollBarChart with options
- Display connection status indicator
- Apply presentation-optimized styling
- Handle responsive layout

**Styling Requirements** (from FR-005):
- Question: 36pt font, bold, high contrast
- Body text: 24pt font minimum
- High contrast colors suitable for projection
- Adequate spacing for readability

### 3. PollBarChart Component

**Purpose**: Renders animated bar chart visualization of poll results.

**Location**: `frontend/src/components/PollWindow/PollBarChart.tsx`

**Props**:
```typescript
interface PollBarChartProps {
  options: PollOption[];
  animationDuration?: number; // Default: 800ms
  layout?: 'horizontal' | 'vertical'; // Default: 'horizontal'
  onAnimationComplete?: () => void;
}
```

**Responsibilities**:
- Render bar chart using Recharts library
- Assign distinct colors to each option (FR-005b)
- Animate bar length changes (FR-007: 0.5-1s transitions)
- Display option labels and vote counts
- Handle responsive sizing
- Highlight recently updated bars (FR-008)

**Animation Behavior**:
- Bar length changes: 800ms ease-out transition
- Pulse effect on updated bar: 300ms highlight then fade
- Queue animations if multiple updates arrive rapidly

**Accessibility**:
- Include aria-label with poll results
- Ensure color contrast meets WCAG AA standards
- Provide text alternative for chart data

### 4. AnimatedVoteCounter Component

**Purpose**: Displays vote count with smooth numerical animation.

**Location**: `frontend/src/components/PollWindow/AnimatedVoteCounter.tsx`

**Props**:
```typescript
interface AnimatedVoteCounterProps {
  value: number;
  previousValue: number;
  duration?: number; // Default: 800ms
  suffix?: string; // e.g., " votes"
}
```

**Responsibilities**:
- Animate number changes from previousValue to value
- Use easing function for smooth transition (FR-006)
- Format numbers with thousand separators if > 999
- Display optional suffix text

**Animation Implementation**:
```typescript
// Interpolate from previousValue to value over duration
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
```

### 5. ConnectionStatusIndicator Component

**Purpose**: Displays current WebSocket connection status.

**Location**: `frontend/src/components/PollWindow/ConnectionStatusIndicator.tsx`

**Props**:
```typescript
interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
  reconnectAttempts?: number;
  onRetry?: () => void;
}
```

**Responsibilities**:
- Display connection status icon and text
- Show reconnection progress
- Provide manual retry button on error
- Auto-hide when connected (fade out after 2 seconds)

**Status Display**:
- `connecting`: "Connecting..." with spinner
- `connected`: "Connected" with green dot (fades out)
- `disconnected`: "Reconnecting..." with retry count
- `error`: "Connection lost" with retry button

## API Contracts

### REST API

#### GET /api/polls/:pollId

**Purpose**: Fetch initial poll data for window display

**Request**:
```
GET /api/polls/:pollId
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "id": "abc123",
  "sessionId": "sess456",
  "question": "What is your favorite color?",
  "options": [
    {
      "id": "opt1",
      "text": "Red",
      "voteCount": 42
    },
    {
      "id": "opt2",
      "text": "Blue",
      "voteCount": 58
    }
  ],
  "status": "active",
  "totalVotes": 100,
  "createdAt": "2026-01-05T10:00:00Z"
}
```

**Error Responses**:
- 404: Poll not found
- 401: Unauthorized (no valid session)

### WebSocket Events

#### Client → Server

**Event**: `poll:subscribe`

**Purpose**: Subscribe to updates for a specific poll

**Payload**:
```typescript
{
  pollId: string;
}
```

**Event**: `poll:unsubscribe`

**Purpose**: Unsubscribe from poll updates (sent before disconnect)

**Payload**:
```typescript
{
  pollId: string;
}
```

#### Server → Client

**Event**: `poll:${pollId}:vote-submitted`

**Purpose**: Notify when a new vote is cast

**Payload**:
```typescript
{
  pollId: string;
  optionId: string;
  timestamp: number;
  newVoteCount: number;
  totalVotes: number;
}
```

**Event**: `poll:${pollId}:updated`

**Purpose**: Notify when poll metadata changes (question edited, status changed)

**Payload**:
```typescript
{
  pollId: string;
  question?: string;
  status?: 'draft' | 'active' | 'closed';
}
```

**Event**: `poll:${pollId}:deleted`

**Purpose**: Notify when poll is deleted

**Payload**:
```typescript
{
  pollId: string;
}
```

**Event**: `connection:error`

**Purpose**: Notify client of connection issues

**Payload**:
```typescript
{
  message: string;
  code: string;
}
```

## Routing Configuration

**New Route**:
```typescript
{
  path: '/poll-window/:pollId',
  element: <PollWindowPage />,
  // No authentication required - allows sharing window on presentation displays
}
```

## Click Handler Integration

**Modification**: `frontend/src/pages/PresenterDashboard.tsx`

**Add Click Handler**:
```typescript
const handlePollTitleClick = (pollId: string) => {
  const windowFeatures = 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no';
  const windowName = `poll-window-${pollId}`;
  const url = `/poll-window/${pollId}`;
  
  const pollWindow = window.open(url, windowName, windowFeatures);
  
  if (!pollWindow) {
    // Popup blocked
    alert('Please allow popups for this site to open poll windows');
  }
};
```

**UI Change**:
```tsx
<div 
  className="poll-title cursor-pointer hover:text-blue-600"
  onClick={() => handlePollTitleClick(poll.id)}
>
  {poll.question}
</div>
```

## Testing Contracts

### Unit Tests Required

1. **PollWindowPage**:
   - Fetches poll data on mount
   - Establishes socket connection
   - Handles vote updates correctly
   - Cleans up on unmount
   - Displays error states

2. **PollBarChart**:
   - Renders bars for all options
   - Assigns distinct colors
   - Handles animation duration prop
   - Responds to data changes

3. **AnimatedVoteCounter**:
   - Animates from previous to new value
   - Completes animation in specified duration
   - Formats large numbers correctly

### Integration Tests Required

1. **Window Opening Flow**:
   - Click poll title → window opens
   - Window receives correct poll ID
   - Poll data loads and displays

2. **Real-time Updates**:
   - Submit vote → poll window updates
   - Multiple windows update independently
   - Animation completes smoothly

3. **Error Scenarios**:
   - Poll not found → error message displays
   - Socket disconnect → reconnection indicator shows
   - Poll deleted → deletion message displays

## Performance Contracts

- **Window Open**: < 1 second (SC-002)
- **Update Latency**: < 500ms from vote to display (SC-003)
- **Animation Frame Rate**: 60fps (SC-004)
- **Concurrent Windows**: Support 10 simultaneous windows (SC-005)
- **Connection Stability**: 2 hour continuous connection (SC-007)