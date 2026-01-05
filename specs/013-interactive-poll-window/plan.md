# Implementation Plan: Interactive Poll Window

**Branch**: `013-interactive-poll-window` | **Date**: January 5, 2026 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-interactive-poll-window/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable clickable poll titles in the poll management interface that open dedicated browser windows displaying individual polls with enhanced presentation (bar chart visualizations, large fonts, high contrast) and real-time animated updates as votes arrive. Each poll window maintains an independent WebSocket connection for live data updates and supports smooth animations (0.5-1s transitions) for vote count changes and bar chart growth.

## Technical Context

**Language/Version**: TypeScript 5.3+, Node.js 20+, React 18.2+  
**Primary Dependencies**: React (frontend), Express 4.18+ (backend), Socket.IO 4.8+ (real-time), Recharts 2.10+ (charts)  
**Storage**: PostgreSQL via Prisma ORM (existing polls, sessions, votes)  
**Testing**: React Testing Library (frontend), Jest (unit tests)  
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge) with window.open() support
**Project Type**: Web application (existing frontend + backend structure)  
**Performance Goals**: Window open <1s, real-time updates <500ms, 60fps animations, 10 simultaneous windows  
**Constraints**: Smooth animations (0.5-1s bar chart transitions), responsive layout, 2-hour connection stability  
**Scale/Scope**: Single poll per window, up to 10 concurrent windows, bar chart rendering for up to 20 poll options

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial Check (Pre-Phase 0)**: ✅ PASS - No constitution principles defined yet; proceeding with standard development practices

**Post-Design Check (After Phase 1)**: ✅ PASS

This feature follows existing project patterns:
- Extends existing React frontend with new component and page
- Reuses existing Socket.IO infrastructure for real-time updates
- Follows modular component architecture already established
- No new architectural patterns or external dependencies beyond visualization
- All components independently testable
- No violations of simplicity principles (uses existing patterns)
- Performance targets achievable with current tech stack

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/           # Existing: Poll, Session, Vote entities
│   ├── services/         # Existing: Poll service, Vote service
│   ├── api/              # Existing: REST endpoints
│   └── events/           # Existing: Socket.IO event handlers
└── tests/

frontend/
├── src/
│   ├── components/
│   │   └── PollWindow/   # NEW: Poll window components
│   │       ├── PollWindowDisplay.tsx      # Main poll display component
│   │       ├── PollBarChart.tsx           # Bar chart visualization
│   │       └── AnimatedVoteCounter.tsx    # Animated vote counter
│   ├── pages/
│   │   ├── PresenterDashboard.tsx         # MODIFIED: Add click handlers
│   │   └── PollWindowPage.tsx             # NEW: Standalone poll window page
│   ├── services/
│   │   └── pollWindowSocket.ts            # NEW: Socket connection for poll windows
│   ├── hooks/
│   │   └── usePollWindowData.ts           # NEW: Hook for poll window state
│   └── types/
│       └── pollWindow.ts                  # NEW: TypeScript types
└── tests/

specs/013-interactive-poll-window/
├── plan.md              # This file
├── research.md          # Phase 0 output (technology evaluation)
├── data-model.md        # Phase 1 output (component structure)
├── quickstart.md        # Phase 1 output (development guide)
└── contracts/           # Phase 1 output (component interfaces)
```

**Structure Decision**: This feature extends the existing web application structure with new frontend components in the `frontend/src/components/PollWindow/` directory and a new page component at `frontend/src/pages/PollWindowPage.tsx`. The backend requires minimal changes - only potential optimization of existing Socket.IO event subscriptions to support multiple concurrent connections per user. The modular component structure allows independent development and testing of the poll window functionality.

## Complexity Tracking

**Status**: ✅ No violations - Feature follows existing patterns and principles

This feature introduces no additional complexity:
- Uses existing technology stack (React, Socket.IO, Recharts)
- Follows established component architecture
- Leverages existing backend infrastructure
- No new dependencies beyond visualization library (already in package.json)
- All components independently testable and documented

---

## Phase Completion Summary

### ✅ Phase 0: Research (Complete)

**Output**: [research.md](./research.md)

**Key Decisions**:
1. Window Management: Native window.open() API
2. Real-time Updates: Separate Socket.IO connection per window
3. Bar Chart Visualization: Recharts library (existing dependency)
4. Animations: CSS transitions + Recharts built-in animation
5. Lifecycle Management: React useEffect cleanup pattern
6. Responsive Layout: Tailwind CSS (existing approach)

**All NEEDS CLARIFICATION resolved**: ✅ Yes

### ✅ Phase 1: Design (Complete)

**Outputs**:
- [data-model.md](./data-model.md) - Component state structures and data flow
- [contracts/components.md](./contracts/components.md) - Component interfaces and API contracts
- [quickstart.md](./quickstart.md) - Development setup and workflow guide

**Key Artifacts**:
1. **5 Component Contracts**: PollWindowPage, PollWindowDisplay, PollBarChart, AnimatedVoteCounter, ConnectionStatusIndicator
2. **4 WebSocket Events**: poll:subscribe, poll:${pollId}:vote-submitted, poll:${pollId}:updated, poll:${pollId}:deleted
3. **1 REST API Endpoint**: GET /api/polls/:pollId (existing, documented)
4. **State Management Model**: PollWindowState, PollData, VoteUpdate, ConnectionStatus
5. **Animation Strategy**: 800ms bar transitions, counter interpolation, pulse effects

**Constitution Re-check**: ✅ PASS (post-design validation)

**Agent Context Updated**: ✅ Yes - GitHub Copilot instructions file created

---

## Next Steps

**This planning phase is now complete.** To proceed with implementation:

1. **Run `/speckit.tasks`** - Break down into specific implementation tasks
2. **Begin Development** - Follow quickstart.md for P1, P2, P3 phases
3. **Testing** - Use contracts for test specifications
4. **Documentation** - Update as implementation progresses

**Current Branch**: `013-interactive-poll-window`  
**Specification**: [spec.md](./spec.md)  
**Planning Artifacts**: All Phase 0 and Phase 1 deliverables complete
