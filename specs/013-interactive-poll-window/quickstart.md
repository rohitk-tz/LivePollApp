# Quickstart Guide: Interactive Poll Window

**Feature**: Interactive Poll Window  
**Phase**: 1 - Design  
**Date**: January 5, 2026

## Overview

This guide helps developers set up their environment and begin implementing the interactive poll window feature. This feature enables clickable poll titles that open in dedicated browser windows with bar chart visualizations and real-time animated updates.

## Prerequisites

- Node.js 20+ installed
- PostgreSQL running (existing database)
- Existing LivePollApp repository cloned
- Backend and frontend dependencies installed

## Quick Setup

### 1. Checkout Feature Branch

```bash
git checkout 013-interactive-poll-window
```

### 2. Verify Dependencies

The feature uses existing dependencies - no new packages required:

**Frontend** (already in package.json):
- `react@^18.2.0` - UI framework
- `socket.io-client@^4.6.0` - Real-time communication
- `recharts@^2.10.0` - Bar chart visualization
- `react-router-dom@^6.20.0` - Routing for poll window page
- `tailwindcss@^3.4.0` - Styling

**Backend** (no changes required):
- Existing Socket.IO event handlers
- Existing REST API endpoints for polls

### 3. Start Development Servers

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

Backend runs on: http://localhost:3000
Frontend runs on: http://localhost:5173

## Development Workflow

### Phase 1: Core Window Opening (P1 - View Single Poll)

**Goal**: Click poll title → new window opens with poll data

#### Step 1.1: Create Poll Window Page Route

**File**: `frontend/src/pages/PollWindowPage.tsx`

```typescript
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

export function PollWindowPage() {
  const { pollId } = useParams();
  const [poll, setPoll] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch poll data
    fetch(`http://localhost:3000/api/polls/${pollId}`)
      .then(res => res.json())
      .then(data => {
        setPoll(data);
        setIsLoading(false);
      });
  }, [pollId]);

  if (isLoading) return <div>Loading...</div>;
  if (!poll) return <div>Poll not found</div>;

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold">{poll.question}</h1>
      <div className="mt-4">
        {poll.options.map(opt => (
          <div key={opt.id}>
            {opt.text}: {opt.voteCount} votes
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### Step 1.2: Add Route Configuration

**File**: `frontend/src/App.tsx`

```typescript
import { PollWindowPage } from './pages/PollWindowPage';

// Add to routes
<Route path="/poll-window/:pollId" element={<PollWindowPage />} />
```

#### Step 1.3: Add Click Handler to Presenter Dashboard

**File**: `frontend/src/pages/PresenterDashboard.tsx`

```typescript
const handlePollClick = (pollId: string) => {
  window.open(
    `/poll-window/${pollId}`,
    `poll-${pollId}`,
    'width=1200,height=800,menubar=no,toolbar=no'
  );
};

// Modify poll rendering
<div 
  onClick={() => handlePollClick(poll.id)}
  className="cursor-pointer hover:text-blue-600"
>
  {poll.question}
</div>
```

#### Test P1:
1. Open presenter dashboard
2. Click any poll title
3. Verify new window opens showing poll question and options
4. Verify multiple clicks create separate windows

### Phase 2: Bar Chart Visualization (P2 - Enhanced Presentation)

**Goal**: Replace simple text with animated bar charts

#### Step 2.1: Create Bar Chart Component

**File**: `frontend/src/components/PollWindow/PollBarChart.tsx`

```typescript
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function PollBarChart({ options }) {
  const data = options.map(opt => ({
    name: opt.text,
    votes: opt.voteCount,
    percentage: opt.percentage || 0
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} layout="horizontal">
        <XAxis type="number" domain={[0, 'dataMax']} />
        <YAxis type="category" dataKey="name" width={200} />
        <Bar dataKey="votes" animationDuration={800}>
          {data.map((entry, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

#### Step 2.2: Integrate Chart into Poll Window

Update `PollWindowPage.tsx`:

```typescript
import { PollBarChart } from '../components/PollWindow/PollBarChart';

// Replace options list with chart
<PollBarChart options={poll.options} />
```

#### Step 2.3: Apply Presentation Styling

```typescript
<div className="min-h-screen bg-gray-50 p-8">
  <h1 className="text-5xl font-bold text-gray-900 mb-8">
    {poll.question}
  </h1>
  <div className="bg-white rounded-lg shadow-lg p-6">
    <PollBarChart options={poll.options} />
  </div>
</div>
```

#### Test P2:
1. Open poll window
2. Verify bar chart displays with distinct colors
3. Verify text is large and readable (24pt minimum)
4. Verify appropriate spacing between elements

### Phase 3: Real-time Updates (P3 - Animated Updates)

**Goal**: Automatic updates with smooth animations when votes arrive

#### Step 3.1: Add Socket Connection

Update `PollWindowPage.tsx`:

```typescript
import { io } from 'socket.io-client';

useEffect(() => {
  const socket = io('http://localhost:3000');
  
  socket.emit('poll:subscribe', { pollId });
  
  socket.on(`poll:${pollId}:vote-submitted`, (update) => {
    setPoll(prevPoll => {
      const updatedOptions = prevPoll.options.map(opt => {
        if (opt.id === update.optionId) {
          return { ...opt, voteCount: update.newVoteCount };
        }
        return opt;
      });
      return { ...prevPoll, options: updatedOptions };
    });
  });

  return () => {
    socket.emit('poll:unsubscribe', { pollId });
    socket.disconnect();
  };
}, [pollId]);
```

#### Step 3.2: Add Connection Status Indicator

```typescript
const [connectionStatus, setConnectionStatus] = useState('connecting');

// In useEffect
socket.on('connect', () => setConnectionStatus('connected'));
socket.on('disconnect', () => setConnectionStatus('disconnected'));

// In render
<div className="absolute top-4 right-4">
  {connectionStatus === 'connected' && (
    <span className="text-green-500">● Connected</span>
  )}
  {connectionStatus === 'disconnected' && (
    <span className="text-red-500">● Disconnected</span>
  )}
</div>
```

#### Step 3.3: Add Animated Vote Counter Component

**File**: `frontend/src/components/PollWindow/AnimatedVoteCounter.tsx`

```typescript
import { useState, useEffect } from 'react';

export function AnimatedVoteCounter({ value, duration = 800 }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const start = displayValue;
    const end = value;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(start + (end - start) * progress);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [value, duration]);

  return <span>{displayValue}</span>;
}
```

#### Test P3:
1. Open poll window
2. Submit a vote from participant view
3. Verify poll window updates within 500ms
4. Verify bar animates smoothly (800ms)
5. Verify vote count animates smoothly
6. Open multiple poll windows and verify all update independently

## Testing Checklist

### Manual Testing

- [ ] Poll window opens when clicking poll title
- [ ] Window has no menu bar, toolbar
- [ ] Poll question displays prominently (large text)
- [ ] Bar chart displays with distinct colors for each option
- [ ] Vote counts and percentages visible
- [ ] New votes trigger automatic updates
- [ ] Bar lengths animate smoothly (no jumps)
- [ ] Vote numbers animate smoothly
- [ ] Connection status indicator displays correctly
- [ ] Multiple windows can be open simultaneously
- [ ] Closing window cleans up socket connection
- [ ] Window resizing adjusts layout appropriately
- [ ] Poll deletion displays appropriate message
- [ ] Network disconnection shows reconnecting indicator

### Performance Testing

- [ ] Window opens in < 1 second
- [ ] Updates appear within 500ms of vote
- [ ] Animations run at 60fps (check browser DevTools)
- [ ] Can open 10 windows without lag
- [ ] Memory usage stable over 2 hour session

### Browser Compatibility

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari

## Troubleshooting

### Popup Blocker

**Issue**: Window doesn't open when clicking poll title

**Solution**: 
- Check browser console for popup blocking message
- Add site to browser's popup whitelist
- Display user-friendly message: "Please allow popups for this site"

### Socket Connection Fails

**Issue**: Real-time updates not working

**Solution**:
- Verify backend is running on port 3000
- Check browser console for Socket.IO connection errors
- Ensure CORS configured: `cors({ origin: 'http://localhost:5173' })`
- Verify firewall not blocking WebSocket connections

### Chart Not Rendering

**Issue**: Bar chart appears empty or broken

**Solution**:
- Verify Recharts imported correctly
- Check that data has correct shape: `{ name: string, votes: number }`
- Ensure ResponsiveContainer has explicit height
- Check browser console for React errors

### Animation Jank

**Issue**: Animations not smooth, frame drops

**Solution**:
- Check DevTools Performance tab for long tasks
- Reduce animation duration if needed
- Ensure not animating layout properties
- Test on lower-end device to identify bottlenecks

## Next Steps

1. Implement components according to contracts in `/contracts/components.md`
2. Write unit tests for each component
3. Perform integration testing with multiple windows
4. Optimize animation performance
5. Add error boundary for graceful failure handling
6. Update documentation with any implementation learnings

## Resources

- [Recharts Documentation](https://recharts.org/)
- [Socket.IO Client Documentation](https://socket.io/docs/v4/client-api/)
- [React Router Documentation](https://reactrouter.com/)
- [MDN window.open()](https://developer.mozilla.org/en-US/docs/Web/API/Window/open)