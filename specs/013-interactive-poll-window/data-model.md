# Data Model: Interactive Poll Window

**Feature**: Interactive Poll Window  
**Phase**: 1 - Design  
**Date**: January 5, 2026

## Overview

This document defines the data structures and state management for the interactive poll window feature. The data model supports displaying individual polls in dedicated windows with bar chart visualizations and real-time animated updates.

## Frontend Data Model

### 1. Poll Window State

Represents the complete state of a poll window instance.

```typescript
interface PollWindowState {
  pollId: string;
  poll: PollData | null;
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  error: string | null;
  animationQueue: VoteUpdate[];
}
```

**Fields**:
- `pollId`: Unique identifier for the poll being displayed
- `poll`: Complete poll data including question, options, and current vote counts
- `connectionStatus`: Current WebSocket connection state
- `isLoading`: Loading state during initial poll data fetch
- `error`: Error message for display (network errors, poll not found, poll deleted)
- `animationQueue`: Queue of pending vote updates for smooth animation sequencing

**State Transitions**:
1. Initial: `isLoading: true`, `poll: null`, `connectionStatus: 'connecting'`
2. Loaded: `isLoading: false`, `poll: <data>`, `connectionStatus: 'connected'`
3. Vote Update: `poll.options[x].voteCount` incremented, animation triggered
4. Disconnected: `connectionStatus: 'disconnected'`, display reconnection indicator
5. Error: `error: <message>`, display error state

### 2. Poll Data

Represents the poll entity displayed in the window.

```typescript
interface PollData {
  id: string;
  sessionId: string;
  question: string;
  options: PollOption[];
  status: PollStatus;
  totalVotes: number;
  createdAt: string;
}

interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  percentage: number;
  color: string; // Assigned color for bar chart
}

type PollStatus = 'draft' | 'active' | 'closed';
```

**Validation Rules**:
- `question`: Must be 1-500 characters
- `options`: Must have 2-20 options (constraint from research - bar chart readability)
- `option.text`: Must be 1-200 characters
- `totalVotes`: Computed from sum of all option vote counts
- `percentage`: Computed as (voteCount / totalVotes) * 100, rounded to 1 decimal

### 3. Vote Update Event

Represents a real-time vote submission event.

```typescript
interface VoteUpdate {
  pollId: string;
  optionId: string;
  timestamp: number;
  previousVoteCount: number;
  newVoteCount: number;
}
```

**Fields**:
- `pollId`: ID of the poll receiving the vote
- `optionId`: ID of the option that was voted for
- `timestamp`: Unix timestamp of vote submission
- `previousVoteCount`: Vote count before this vote (for animation start value)
- `newVoteCount`: Vote count after this vote (for animation end value)

### 4. Connection Status

Represents WebSocket connection state.

```typescript
type ConnectionStatus = 
  | 'connecting'    // Initial connection attempt
  | 'connected'     // Successfully connected, receiving updates
  | 'disconnected'  // Connection lost, attempting reconnect
  | 'error';        // Connection error, manual retry required

interface ConnectionInfo {
  status: ConnectionStatus;
  lastHeartbeat: number;
  reconnectAttempts: number;
  maxReconnectAttempts: number; // 5
}
```

### 5. Chart Display Configuration

Configuration for bar chart rendering.

```typescript
interface ChartConfig {
  layout: 'horizontal' | 'vertical';
  barSize: number;
  animationDuration: number; // 500-1000ms per FR-007
  colorPalette: string[];
  fontSize: {
    question: number;  // 36pt (heading)
    optionLabel: number; // 24pt (body)
    voteCount: number; // 24pt (body)
  };
}

const DEFAULT_CHART_CONFIG: ChartConfig = {
  layout: 'horizontal',
  barSize: 40,
  animationDuration: 800,
  colorPalette: [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
  ],
  fontSize: {
    question: 36,
    optionLabel: 24,
    voteCount: 24,
  },
};
```

## Component State Management

### PollWindowPage Component

**Local State**:
- `pollWindowState: PollWindowState` - Main state object
- `socket: Socket | null` - Socket.IO connection instance

**Effects**:
1. **Poll Data Fetch**: On mount, fetch initial poll data via REST API
2. **Socket Connection**: Establish WebSocket connection and subscribe to poll events
3. **Event Handlers**: Register handlers for vote updates and poll status changes
4. **Cleanup**: Disconnect socket and remove event listeners on unmount

### PollBarChart Component

**Props**:
```typescript
interface PollBarChartProps {
  options: PollOption[];
  chartConfig: ChartConfig;
  animating: boolean;
}
```

**Local State**:
- `highlightedOption: string | null` - Option ID currently pulsing from new vote

### AnimatedVoteCounter Component

**Props**:
```typescript
interface AnimatedVoteCounterProps {
  value: number;
  duration: number;
  animating: boolean;
}
```

**Local State**:
- `displayValue: number` - Current animated value (interpolated)

## Data Flow

### Initial Load Flow

1. User clicks poll title in presenter dashboard
2. `window.open()` creates new window with route `/poll-window/:pollId`
3. `PollWindowPage` component mounts
4. Fetch initial poll data: `GET /api/polls/:pollId`
5. Establish Socket.IO connection to backend
6. Subscribe to poll-specific events: `poll:${pollId}:subscribe`
7. Render `PollBarChart` with initial data

### Real-time Update Flow

1. Vote submitted by participant (different window/device)
2. Backend emits `poll:${pollId}:vote-submitted` event
3. Socket event handler receives `VoteUpdate` payload
4. Update `PollData.options[x].voteCount` in state
5. Recalculate percentages for all options
6. Trigger re-render with animation flags
7. `PollBarChart` animates bar length change (800ms)
8. `AnimatedVoteCounter` interpolates number change (800ms)
9. Apply pulse effect to updated option bar (300ms)
10. Remove animation flags after completion

### Error Handling Flow

1. **Poll Not Found**: Display "Poll not found" message with close button
2. **Poll Deleted**: Socket event `poll:${pollId}:deleted` → Display "Poll has been deleted" message
3. **Network Disconnect**: `socket.disconnect` event → Set status to 'disconnected' → Show reconnection indicator
4. **Reconnection**: Automatic reconnect with exponential backoff (1s, 2s, 4s, 8s, 16s)
5. **Max Retries Exceeded**: Display "Connection lost" with manual retry button

## State Transitions Diagram

```
[Window Opens] 
    ↓
[Loading] (fetch poll data)
    ↓
[Connected] (socket established)
    ↓
┌───[Receiving Updates] ←──────┐
│   ↓                          │
│ [Vote Received]              │
│   ↓                          │
│ [Update State]               │
│   ↓                          │
│ [Animate Changes] ───────────┘
│   
├─[Disconnect] → [Reconnecting] → [Connected]
│   ↓
│ [Max Retries] → [Error State]
│
├─[Poll Deleted] → [Deleted State]
│
└─[Window Closes] → [Cleanup] → [Destroyed]
```

## Persistence

**No Server-Side Persistence Required**: Poll window state is ephemeral and derived from existing database entities (Poll, Vote). The window maintains transient state for display purposes only.

**Existing Database Entities** (no changes required):
- `Poll`: Contains question, options, status
- `PollOption`: Contains option text
- `Vote`: Contains vote submissions (aggregated for counts)

## Validation Rules

### Client-Side Validation

1. **Poll ID Format**: Must be valid nanoid or UUID format
2. **Option Text Display**: Truncate at 50 characters with ellipsis if exceeds in bar chart labels
3. **Color Assignment**: Cycle through color palette if options exceed palette length
4. **Animation Queue**: Maximum 10 queued updates (drop oldest if exceeded)
5. **Connection Retries**: Maximum 5 reconnection attempts before requiring manual retry

### Business Rules

1. **Total Votes Consistency**: `totalVotes = sum(option.voteCount)` must always hold
2. **Percentage Calculation**: Percentages must sum to 100% (handle rounding)
3. **Real-time Guarantee**: Updates must appear within 500ms (SC-003)
4. **Animation Performance**: Must maintain 60fps during animations (SC-004)

## Next Steps

1. Create component interface contracts in `/contracts` directory
2. Generate quickstart guide for development setup
3. Update agent context with new components and patterns