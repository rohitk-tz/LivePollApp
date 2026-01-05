# Research: Interactive Poll Window

**Feature**: Interactive Poll Window  
**Phase**: 0 - Research & Discovery  
**Date**: January 5, 2026

## Research Tasks Summary

This document consolidates research findings for implementing clickable poll titles that open in dedicated windows with bar chart visualizations and real-time animated updates.

## 1. Browser Window Management

### Decision: Use window.open() with feature string

**Rationale**:
- Native browser API with broad support across modern browsers
- Provides control over window size, position, and features
- No external dependencies required
- Well-documented and tested approach

**Implementation Approach**:
```typescript
window.open(
  `/poll-window/${pollId}`,
  `poll-window-${pollId}`,
  'width=1200,height=800,menubar=no,toolbar=no,location=no'
)
```

**Alternatives Considered**:
- **Browser Tab (target="_blank")**: Rejected - Less control over window appearance, harder to distinguish from regular tabs
- **Modal/Dialog**: Rejected - Doesn't provide independent window that can be moved to second monitor
- **Electron/Desktop App**: Rejected - Out of scope, requires completely different deployment model

**Best Practices**:
- Include poll ID in window name for uniqueness (prevents duplicate windows)
- Remove unnecessary chrome (menu bars, toolbars) for presentation mode
- Handle popup blockers with user-friendly error messages
- Clean up event listeners when window closes (beforeunload event)

## 2. Real-time Data Updates in Multiple Windows

### Decision: Separate Socket.IO connections per window

**Rationale**:
- Socket.IO already used in existing implementation
- Each window maintains independent connection lifecycle
- Allows selective subscription to specific poll updates
- Simplifies state management (each window has isolated state)

**Implementation Approach**:
- Each poll window creates its own socket connection on mount
- Subscribe to poll-specific events: `poll:${pollId}:vote-submitted`, `poll:${pollId}:updated`
- Disconnect socket when window closes (useEffect cleanup)
- Reuse existing backend event emission logic

**Alternatives Considered**:
- **Shared WebSocket with message routing**: Rejected - More complex, requires coordination between windows via localStorage/BroadcastChannel
- **Polling with setInterval**: Rejected - Higher latency, increased server load, not real-time
- **Server-Sent Events (SSE)**: Rejected - Unidirectional, would need separate mechanism for commands

**Best Practices**:
- Implement automatic reconnection with exponential backoff
- Display connection status indicator in window
- Buffer updates during disconnection for smooth transition on reconnect
- Limit maximum concurrent connections (10 per user as per SC-005)

## 3. Bar Chart Visualization Library

### Decision: Use Recharts (already in project dependencies)

**Rationale**:
- Already included in frontend/package.json (recharts@^2.10.0)
- React-native components with good TypeScript support
- Declarative API fits React patterns
- Built-in animation support via animationDuration prop
- Responsive and accessible

**Implementation Approach**:
```tsx
<BarChart data={pollOptions} layout="horizontal">
  <XAxis type="number" domain={[0, 'dataMax']} />
  <YAxis type="category" dataKey="optionText" />
  <Bar dataKey="voteCount" fill="#3b82f6" animationDuration={800} />
</BarChart>
```

**Alternatives Considered**:
- **Chart.js + react-chartjs-2**: Rejected - Would require additional dependency, Recharts already available
- **D3.js**: Rejected - Lower-level, more complex implementation, steeper learning curve
- **CSS-only animated bars**: Rejected - More difficult to maintain, less accessible, no built-in axis/label support

**Best Practices**:
- Use horizontal layout for better label readability with longer option text
- Assign distinct colors per bar (use color array with index-based mapping)
- Set appropriate animation duration (500-1000ms per spec requirement FR-007)
- Ensure responsive sizing with ResponsiveContainer wrapper
- Use percentage scale for normalized comparison

## 4. Smooth Animation Implementation

### Decision: Combine CSS transitions with Recharts animation

**Rationale**:
- Recharts provides built-in bar animation via isAnimationActive prop
- CSS transitions for vote count number changes
- React state updates trigger automatic re-renders with animation
- Achieves 60fps performance target with GPU-accelerated transforms

**Implementation Approach**:
```css
.vote-count {
  transition: all 0.8s cubic-bezier(0.4, 0.0, 0.2, 1);
}
```

**Animation Queue Strategy**:
- Use React state batching for rapid updates
- Implement debouncing for vote count text (100ms) to reduce jank
- Let Recharts handle bar animation timing internally
- Add pulse effect on updated bars using CSS animation

**Alternatives Considered**:
- **React Spring**: Rejected - Additional dependency, overkill for simple transitions
- **Framer Motion**: Rejected - Large bundle size impact, existing solution sufficient
- **requestAnimationFrame loops**: Rejected - More complex to manage, CSS transitions handle GPU optimization

**Best Practices**:
- Use transform and opacity for performant animations (GPU-accelerated)
- Avoid animating layout properties (width, height) directly - let Recharts handle via SVG
- Implement animation queuing to prevent overlapping animations
- Test on lower-end devices to ensure 60fps target met

## 5. Window Lifecycle Management

### Decision: React useEffect cleanup pattern

**Rationale**:
- Standard React pattern for managing side effects
- Automatic cleanup on component unmount
- Handles both user-initiated close and browser-initiated close

**Implementation Approach**:
```typescript
useEffect(() => {
  const socket = io(SOCKET_URL);
  socket.emit('subscribe:poll', pollId);
  
  window.addEventListener('beforeunload', handleCleanup);
  
  return () => {
    socket.disconnect();
    window.removeEventListener('beforeunload', handleCleanup);
  };
}, [pollId]);
```

**Alternatives Considered**:
- **Heartbeat mechanism**: Rejected - Additional complexity, React cleanup sufficient
- **Parent window tracking**: Rejected - Breaks window independence, requires cross-window communication

**Best Practices**:
- Emit explicit unsubscribe event before disconnect
- Clear all timers and intervals in cleanup
- Remove all event listeners to prevent memory leaks
- Handle edge case where parent window closes first

## 6. Responsive Layout for Poll Windows

### Decision: Tailwind CSS with responsive breakpoints

**Rationale**:
- Already used throughout frontend (tailwind.config.js present)
- Utility-first approach for quick iteration
- Built-in responsive design utilities
- Maintains consistency with existing UI

**Implementation Approach**:
- Mobile (< 640px): Vertical stack, smaller fonts
- Tablet (640-1024px): Single column layout, medium fonts
- Desktop (> 1024px): Optimal presentation layout, large fonts (24pt body, 36pt heading)

**Alternatives Considered**:
- **CSS Grid only**: Rejected - Less flexible for complex responsive patterns
- **Styled Components**: Rejected - Different pattern from rest of codebase

**Best Practices**:
- Start with mobile-first approach
- Use rem units for font sizes (accessibility)
- Test text overflow handling with max-width and truncation
- Ensure minimum touch targets (44x44px) for mobile

## Summary of Technology Decisions

| Category | Selected Technology | Rationale |
|----------|-------------------|-----------|
| Window Management | window.open() API | Native, no dependencies, full control |
| Real-time Updates | Socket.IO (separate connections) | Already in use, isolated state per window |
| Chart Visualization | Recharts | Already in dependencies, React-native |
| Animations | CSS transitions + Recharts | GPU-accelerated, 60fps performance |
| Lifecycle Management | React useEffect cleanup | Standard pattern, automatic cleanup |
| Responsive Layout | Tailwind CSS | Consistency with existing codebase |

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Popup blockers preventing window open | Display clear error message, provide instructions to whitelist |
| Multiple connections overwhelming backend | Limit to 10 windows per user (FR-009), implement rate limiting |
| Animation performance on low-end devices | Use CSS will-change hints, implement performance monitoring |
| Memory leaks from unclosed connections | Strict cleanup in useEffect, beforeunload handler |
| Very long poll option text breaking layout | Implement text truncation, responsive font sizing |

## Next Steps (Phase 1)

1. Define component interface contracts (PollWindowDisplay, PollBarChart props)
2. Design data model for poll window state management
3. Create API contracts for poll-specific Socket.IO events
4. Write quickstart guide for local development and testing