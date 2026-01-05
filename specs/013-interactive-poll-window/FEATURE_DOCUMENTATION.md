# Interactive Poll Window Feature

## Overview

The Interactive Poll Window feature enables presenters to open individual polls in dedicated browser windows, providing a professional, real-time visualization optimized for presentation scenarios.

## Key Features

### 1. Dedicated Poll Windows (User Story 1 - P1)
- **One-click opening**: Click any poll title in the presenter dashboard
- **Dedicated windows**: Each poll opens in a separate 1200x800px window
- **Professional layout**: Clean, distraction-free design optimized for projection/screen sharing
- **Error handling**: Graceful degradation with popup blocker detection

### 2. Enhanced Visual Presentation (User Story 2 - P2)
- **Bar chart visualization**: Professional horizontal bar charts using Recharts library
- **Distinct colors**: 8-color palette with unique color per option
- **Large, readable fonts**: 
  - Poll question: 36pt (text-5xl/6xl)
  - Option labels: 20pt (text-xl)
  - Vote counts/percentages: 24pt (text-2xl)
- **Responsive design**: Adapts to different window sizes with Tailwind breakpoints
- **Detailed results table**: Supplementary table view with color-coded options

### 3. Real-time Animated Updates (User Story 3 - P3)
- **Live vote tracking**: Socket.IO connection for sub-500ms update latency
- **Smooth animations**: 800ms cubic ease-out transitions for vote count changes
- **Pulse effects**: 300ms highlight animation for recently updated options
- **Connection status indicator**: Real-time display with auto-hide after 2 seconds
- **Automatic reconnection**: Exponential backoff (1s, 2s, 4s, 8s, 16s) up to 5 attempts
- **Graceful cleanup**: Proper socket unsubscription on window close

## Architecture

### Components

```
frontend/src/
├── pages/
│   └── PollWindowPage.tsx              # Root page component
├── components/PollWindow/
│   ├── PollWindowDisplay.tsx           # Main display orchestrator
│   ├── PollBarChart.tsx                # Recharts bar chart
│   ├── ConnectionStatusIndicator.tsx   # Socket.IO status display
│   ├── AnimatedVoteCounter.tsx         # Number animation component
│   └── PollWindowErrorBoundary.tsx     # Error boundary wrapper
├── hooks/
│   └── usePollWindowData.ts            # Socket.IO connection hook
├── types/
│   └── pollWindow.ts                   # TypeScript type definitions
└── constants/
    └── chartColors.ts                  # 8-color palette
```

### Data Flow

1. **Initial Load**: 
   - PollWindowPage fetches poll data from `GET /api/polls/:pollId`
   - Calculates initial vote percentages
   - Passes data to usePollWindowData hook

2. **Socket.IO Connection**:
   - Hook establishes WebSocket connection to server
   - Emits `poll:subscribe` with pollId
   - Listens for `poll:${pollId}:vote-submitted`, `poll:${pollId}:updated`, `poll:${pollId}:deleted`

3. **Real-time Updates**:
   - Server broadcasts vote events to all subscribed clients
   - Hook updates poll state and recalculates percentages
   - Sets `recentlyUpdatedOptionId` for pulse effect (300ms duration)
   - PollBarChart re-renders with smooth 800ms animation

4. **Cleanup**:
   - Window `beforeunload` event triggers `poll:unsubscribe`
   - Socket disconnects gracefully
   - Reconnection timer cleanup on unmount

### Configuration

All feature settings are centralized in `frontend/src/config.ts`:

```typescript
pollWindow: {
  chart: {
    layout: 'horizontal',
    barSize: 40,
    animationDuration: 800,  // ms
    fontSize: 24,            // pt
  },
  window: {
    width: 1200,             // px
    height: 800,             // px
    features: 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no',
  },
}
```

## Usage

### For Presenters

1. **Navigate to Presenter Dashboard**: `/presenter/:sessionCode`
2. **Click a poll title**: Opens dedicated window
3. **Position for presentation**: Drag window to projector/second screen
4. **Live updates**: Vote counts update automatically with animations
5. **Close when done**: Window cleanup is automatic

### For Developers

#### Opening Poll Windows Programmatically

```typescript
import config from './config';

function openPollWindow(pollId: string) {
  const url = `${window.location.origin}/poll-window/${pollId}`;
  const windowHandle = window.open(url, `poll-${pollId}`, config.pollWindow.window.features);
  
  if (!windowHandle || windowHandle.closed) {
    alert('Please enable popups for this site to view poll windows.');
  }
}
```

#### Customizing Colors

Edit `frontend/src/constants/chartColors.ts`:

```typescript
export const CHART_COLOR_PALETTE = [
  '#3b82f6', // blue-500
  '#10b981', // green-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // purple-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
] as const;
```

#### Customizing Animations

```typescript
// AnimatedVoteCounter duration
<AnimatedVoteCounter value={voteCount} duration={1000} />

// Bar chart animation
<PollBarChart options={poll.options} animationDuration={600} />
```

## Testing

### Manual Testing Checklist

- [ ] **Multiple windows**: Open 5-10 poll windows simultaneously
- [ ] **Popup blockers**: Test with browser popup blocker enabled
- [ ] **Responsive layout**: Resize window from 320px to 1920px width
- [ ] **Network disconnection**: Disconnect WiFi, verify reconnection indicator
- [ ] **Poll deletion**: Delete poll while window open, verify graceful handling
- [ ] **Animation performance**: Submit 10+ votes rapidly, verify 60fps with DevTools
- [ ] **Browser compatibility**: Test in Chrome, Firefox, Safari, Edge

### Performance Metrics

- **Initial load**: < 500ms to first contentful paint
- **Vote update latency**: < 500ms from server broadcast to UI update
- **Animation frame rate**: Stable 60fps during vote count transitions
- **Memory footprint**: < 50MB per window (DevTools Memory Profiler)
- **Socket reconnection**: < 2s average reconnection time

## Accessibility

### WCAG AA Compliance

- ✅ **Color contrast**: All text meets WCAG AA standards (4.5:1 ratio)
- ✅ **ARIA labels**: Chart has descriptive aria-label
- ✅ **Keyboard navigation**: All interactive elements keyboard-accessible
- ✅ **Screen readers**: Semantic HTML with proper heading hierarchy
- ✅ **Focus indicators**: Visible focus outlines on buttons

### Features for Accessibility

- **Large fonts**: 24pt+ for body text, 36pt for headings
- **High contrast**: Dark text on light backgrounds
- **Clear status indicators**: Visual + text for connection status
- **Error messages**: Clear, actionable error descriptions
- **Responsive text**: Scales appropriately at different zoom levels

## Troubleshooting

### Common Issues

#### Popup Blocker Prevents Window Opening

**Symptom**: Clicking poll title does nothing, or shows browser notification

**Solution**: 
```typescript
// Check for popup blocker in PresenterDashboard
if (!windowHandle || windowHandle.closed) {
  alert('Please enable popups for this site to view poll windows.');
}
```

**User action**: Add site to browser's popup exception list

#### Connection Status Shows "Disconnected"

**Symptom**: Red "Disconnected" indicator, no live updates

**Causes**:
1. Backend server not running
2. WebSocket port blocked by firewall
3. Network connectivity issues

**Solutions**:
- Verify backend is running: `npm run dev` in `backend/`
- Check WebSocket URL in `frontend/src/config.ts`
- Click "Retry" button in status indicator
- Check browser console for Socket.IO errors

#### Animation Performance Issues (< 60fps)

**Symptom**: Choppy animations during vote updates

**Causes**:
1. Too many simultaneous poll windows (> 10)
2. Browser DevTools open (Performance tab overhead)
3. Underpowered hardware

**Solutions**:
- Close unnecessary poll windows
- Disable DevTools Performance recording
- Reduce animation duration in config:
  ```typescript
  pollWindow: { chart: { animationDuration: 400 } }
  ```

#### Vote Counts Not Updating

**Symptom**: Vote submitted but chart doesn't change

**Debugging**:
1. Check browser console for WebSocket errors
2. Verify Socket.IO connection: Look for green "Live" indicator
3. Test backend event emission:
   ```powershell
   # In backend directory
   node -e "const io = require('socket.io-client'); const socket = io('http://localhost:3000'); socket.on('connect', () => console.log('Connected:', socket.id));"
   ```
4. Check poll subscription:
   ```typescript
   // In usePollWindowData.ts, verify:
   socket.emit('poll:subscribe', { pollId });
   ```

## Future Enhancements

### Planned Features (Not Yet Implemented)

1. **Full-screen mode**: F11 toggle for presentation mode
2. **Custom themes**: Dark mode, high contrast, color blind friendly
3. **Export options**: PNG/SVG chart export for reports
4. **Multi-language support**: i18n for question/option text
5. **Audio cues**: Optional sound effects for vote submissions
6. **Advanced animations**: 
   - Confetti effect when vote count reaches milestone
   - Bar race animation for competitive polls
   - Smooth sort transitions when rankings change

### Backend Requirements

The feature requires these Socket.IO events to be implemented on the backend:

```typescript
// Server-side event emissions (backend/src/modules/socket/handlers/)
io.to(`poll:${pollId}`).emit('poll:${pollId}:vote-submitted', {
  pollId: string;
  optionId: string;
  newVoteCount: number;
  timestamp: Date;
});

io.to(`poll:${pollId}`).emit('poll:${pollId}:updated', {
  pollId: string;
  question?: string;
  status?: 'draft' | 'active' | 'closed';
});

io.to(`poll:${pollId}`).emit('poll:${pollId}:deleted', {
  pollId: string;
  deletedAt: Date;
});

// Client event subscriptions
socket.on('poll:subscribe', ({ pollId }) => {
  socket.join(`poll:${pollId}`);
});

socket.on('poll:unsubscribe', ({ pollId }) => {
  socket.leave(`poll:${pollId}`);
});
```

## Related Documentation

- [Feature Specification](../../specs/013-interactive-poll-window/spec.md)
- [Technical Planning](../../specs/013-interactive-poll-window/plan.md)
- [Task Breakdown](../../specs/013-interactive-poll-window/tasks.md)
- [Component Contracts](../../specs/013-interactive-poll-window/contracts/components.md)
- [Quick Start Guide](../../specs/013-interactive-poll-window/quickstart.md)

## Contributing

When adding features to the interactive poll window:

1. **Update types**: Add new interfaces to `types/pollWindow.ts`
2. **Maintain accessibility**: Ensure WCAG AA compliance
3. **Test performance**: Verify 60fps animations with DevTools
4. **Update documentation**: Keep this README in sync with code changes
5. **Follow conventions**: Use existing component patterns

## License

Part of the LivePollApp project. See root LICENSE file.
