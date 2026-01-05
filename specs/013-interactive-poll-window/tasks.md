---
description: "Task list for Interactive Poll Window feature implementation"
---

# Tasks: Interactive Poll Window

**Input**: Design documents from `/specs/013-interactive-poll-window/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in specification - focusing on implementation tasks only

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Following existing LivePollApp structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify dependencies and prepare development environment

- [X] T001 Verify Recharts dependency in frontend/package.json (should be ^2.10.0)
- [X] T002 Verify Socket.IO client in frontend/package.json (should be ^4.6.0)
- [X] T003 [P] Verify React Router DOM in frontend/package.json (should be ^6.20.0)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create TypeScript type definitions in frontend/src/types/pollWindow.ts (PollWindowState, PollData, PollOption, VoteUpdate, ConnectionStatus interfaces)
- [X] T005 [P] Create color palette constant in frontend/src/config.ts or new file frontend/src/constants/chartColors.ts
- [X] T006 [P] Create chart configuration constants in frontend/src/config.ts (DEFAULT_CHART_CONFIG with layout, barSize, animationDuration, fontSize)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Single Poll in Dedicated Window (Priority: P1) 🎯 MVP

**Goal**: Enable clicking poll title to open dedicated window with basic poll display (question, options, vote counts)

**Independent Test**: Click any poll title in presenter dashboard, verify new window opens with poll details displayed

### Implementation for User Story 1

- [X] T007 [P] [US1] Create PollWindowPage component in frontend/src/pages/PollWindowPage.tsx with route parameter parsing, initial state setup, loading/error states
- [X] T008 [P] [US1] Create basic PollWindowDisplay component in frontend/src/components/PollWindow/PollWindowDisplay.tsx with props interface (poll, connectionStatus)
- [X] T009 [US1] Add poll data fetching logic to PollWindowPage (fetch from GET /api/polls/:pollId endpoint)
- [X] T010 [US1] Add route configuration in frontend/src/App.tsx for /poll-window/:pollId path
- [X] T011 [US1] Modify PresenterDashboard component in frontend/src/pages/PresenterDashboard.tsx to add click handler for poll titles
- [X] T012 [US1] Implement window.open() call in PresenterDashboard with proper window features (width=1200, height=800, no menubar/toolbar)
- [X] T013 [US1] Add popup blocker detection and user notification in PresenterDashboard handlePollClick function
- [X] T014 [US1] Implement basic poll display layout in PollWindowDisplay (question header, options list with vote counts)
- [X] T015 [US1] Add error boundary handling for poll not found (404) and network errors in PollWindowPage

**Checkpoint**: At this point, User Story 1 should be fully functional - clicking poll titles opens windows with poll data

---

## Phase 4: User Story 2 - Enhanced Visual Presentation (Priority: P2)

**Goal**: Replace basic text display with bar chart visualization and presentation-optimized styling

**Independent Test**: Open poll window, verify bar chart displays with distinct colors, large fonts (24pt body, 36pt heading), and professional layout

### Implementation for User Story 2

- [X] T016 [P] [US2] Create PollBarChart component in frontend/src/components/PollWindow/PollBarChart.tsx with Recharts BarChart implementation
- [X] T017 [P] [US2] Create ConnectionStatusIndicator component in frontend/src/components/PollWindow/ConnectionStatusIndicator.tsx with status display logic
- [X] T018 [US2] Implement bar chart data transformation in PollBarChart (convert PollOption[] to chart data format)
- [X] T019 [US2] Configure Recharts bar chart with horizontal layout, XAxis (numeric), YAxis (category with option text)
- [X] T020 [US2] Implement color assignment logic in PollBarChart using color palette (cycle through colors for each bar)
- [X] T021 [US2] Add Cell components to Recharts Bar with distinct colors for each option
- [X] T022 [US2] Set animation duration to 800ms on Recharts Bar component (animationDuration prop)
- [X] T023 [US2] Apply presentation styling to PollWindowDisplay (large fonts: text-5xl for question, text-2xl for options, bg-gray-50, padding, rounded corners)
- [X] T024 [US2] Wrap PollBarChart in ResponsiveContainer with appropriate height (400-600px)
- [X] T025 [US2] Add vote count and percentage display alongside bar chart labels
- [X] T026 [US2] Implement responsive layout with Tailwind breakpoints (mobile, tablet, desktop views)
- [X] T027 [US2] Handle text overflow for long poll questions and options (truncate or wrap with max-width)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - windows show professional bar chart presentations

---

## Phase 5: User Story 3 - Real-time Animated Updates (Priority: P3)

**Goal**: Add Socket.IO connection for real-time updates with smooth bar chart and number animations

**Independent Test**: Open poll window, submit vote from participant view, verify window updates within 500ms with smooth 800ms animations

### Implementation for User Story 3

- [X] T028 [P] [US3] Create AnimatedVoteCounter component in frontend/src/components/PollWindow/AnimatedVoteCounter.tsx with number interpolation logic
- [X] T029 [P] [US3] Create custom hook usePollWindowData in frontend/src/hooks/usePollWindowData.ts for socket connection and state management
- [X] T030 [US3] Implement Socket.IO connection initialization in PollWindowPage useEffect
- [X] T031 [US3] Add socket subscription to poll-specific events (emit 'poll:subscribe' with pollId)
- [X] T032 [US3] Implement event handler for 'poll:${pollId}:vote-submitted' in PollWindowPage
- [X] T033 [US3] Update poll state when vote events received (increment vote count for specific option)
- [X] T034 [US3] Recalculate percentages for all options when vote count changes
- [X] T035 [US3] Add socket disconnect handler and cleanup in PollWindowPage useEffect return
- [X] T036 [US3] Implement 'poll:unsubscribe' emission before socket disconnect
- [X] T037 [US3] Add window beforeunload event listener for cleanup in PollWindowPage
- [X] T038 [US3] Implement connection status tracking in PollWindowPage (connecting, connected, disconnected, error states)
- [X] T039 [US3] Add socket event handlers for 'connect', 'disconnect', 'connection:error' events
- [X] T040 [US3] Integrate ConnectionStatusIndicator component into PollWindowDisplay with connection status prop
- [X] T041 [US3] Implement automatic reconnection logic with exponential backoff (1s, 2s, 4s, 8s, 16s up to 5 attempts)
- [X] T042 [US3] Add AnimatedVoteCounter to display vote counts with animation in PollBarChart or PollWindowDisplay
- [X] T043 [US3] Implement number animation logic in AnimatedVoteCounter using requestAnimationFrame (ease-out cubic, 800ms duration)
- [X] T044 [US3] Add pulse effect CSS animation for recently updated bars (300ms highlight then fade)
- [X] T045 [US3] Track which option was just updated to apply pulse effect in PollBarChart
- [X] T046 [US3] Implement animation queue in PollWindowPage state to handle rapid vote updates (max 10 queued)
- [X] T047 [US3] Add 'poll:${pollId}:deleted' event handler to show "Poll has been deleted" message
- [X] T048 [US3] Add 'poll:${pollId}:updated' event handler for poll metadata changes (question, status updates)
- [X] T049 [US3] Test and optimize animation performance to maintain 60fps (check with browser DevTools Performance tab)

**Checkpoint**: All user stories should now be independently functional - real-time updates with smooth animations work

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final touches

- [X] T050 [P] Add error boundary component wrapping PollWindowPage for graceful failure handling
- [X] T051 [P] Add manual retry button in ConnectionStatusIndicator for 'error' state
- [X] T052 [P] Implement connection status auto-hide (fade out after 2 seconds when 'connected')
- [X] T053 [P] Format large numbers with thousand separators in AnimatedVoteCounter (if voteCount > 999)
- [X] T054 [P] Add aria-label to PollBarChart for accessibility
- [X] T055 [P] Verify WCAG AA color contrast standards for bar colors
- [ ] T056 Test multiple simultaneous poll windows (open 5-10 windows and verify no performance issues)
- [ ] T057 Test popup blocker scenario and verify user-friendly error message displays
- [ ] T058 Test window resizing for responsive layout (resize to mobile, tablet, desktop sizes)
- [ ] T059 Test network disconnection scenario (disconnect WiFi, verify reconnection indicator and automatic reconnect)
- [ ] T060 Test poll deletion scenario (delete poll while window open, verify appropriate message)
- [ ] T061 Test animation performance with rapid vote submissions (submit 10+ votes quickly, verify smooth 60fps)
- [X] T062 [P] Update README.md or add feature documentation in frontend/README.md
- [ ] T063 Run through quickstart.md validation steps
- [ ] T064 Browser compatibility testing (Chrome, Firefox, Safari, Edge)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 but can be tested independently (replaces basic display with bar chart)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Adds real-time layer to US2 but independently testable

### Within Each User Story

- **US1**: Route and page setup → Fetch logic → Click handler → Display → Error handling
- **US2**: Chart component → Styling → Color assignment → Responsive layout
- **US3**: Socket connection → Event handlers → Animation components → Performance optimization

### Parallel Opportunities

**Setup Phase**:
- T001, T002, T003 can all run in parallel (independent verification tasks)

**Foundational Phase**:
- T004, T005, T006 can all run in parallel (creating different files)

**User Story 1**:
- T007 and T008 can run in parallel (different components)
- After T007-T010 complete, T011-T012 can run together (modifying PresenterDashboard)

**User Story 2**:
- T016 and T017 can run in parallel (different components)
- T018-T022 are sequential (configuring same chart component)
- T023-T027 styling tasks can partially overlap

**User Story 3**:
- T028 and T029 can run in parallel (different component and hook)
- T030-T049 are mostly sequential (socket integration requires order)

**Polish Phase**:
- T050, T051, T052, T053, T054, T055 can all run in parallel (independent improvements)
- T056-T064 testing tasks can be distributed across team members

---

## Parallel Example: User Story 1

```bash
# Launch foundational tasks together:
Task: "Create TypeScript type definitions in frontend/src/types/pollWindow.ts"
Task: "Create color palette constant in frontend/src/constants/chartColors.ts"
Task: "Create chart configuration constants in frontend/src/config.ts"

# Launch US1 component creation together:
Task: "Create PollWindowPage component in frontend/src/pages/PollWindowPage.tsx"
Task: "Create basic PollWindowDisplay component in frontend/src/components/PollWindow/PollWindowDisplay.tsx"
```

---

## Parallel Example: User Story 2

```bash
# Launch US2 components together:
Task: "Create PollBarChart component in frontend/src/components/PollWindow/PollBarChart.tsx"
Task: "Create ConnectionStatusIndicator component in frontend/src/components/PollWindow/ConnectionStatusIndicator.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify dependencies)
2. Complete Phase 2: Foundational (type definitions and constants)
3. Complete Phase 3: User Story 1 (clickable titles → windows open)
4. **STOP and VALIDATE**: Test clicking polls, opening multiple windows
5. Demo if ready - basic functionality complete!

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP! - Basic poll windows work)
3. Add User Story 2 → Test independently → Deploy/Demo (Enhanced! - Bar charts and professional styling)
4. Add User Story 3 → Test independently → Deploy/Demo (Complete! - Real-time animations)
5. Polish Phase → Final touches and optimization

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (T007-T015)
   - Developer B: User Story 2 (T016-T027) - can start components in parallel
   - Developer C: User Story 3 (T028-T029) - can prep components while US1/US2 complete
3. Stories integrate and complete independently

---

## Task Count Summary

- **Total Tasks**: 64
- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 3 tasks
- **Phase 3 (User Story 1)**: 9 tasks
- **Phase 4 (User Story 2)**: 12 tasks
- **Phase 5 (User Story 3)**: 22 tasks
- **Phase 6 (Polish)**: 15 tasks

**Parallelizable Tasks**: 15 tasks marked with [P]

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (15 tasks total for basic working feature)

---

## Notes

- [P] tasks = different files, no dependencies, can run simultaneously
- [US1], [US2], [US3] labels map tasks to specific user stories for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- No backend changes required - all work is frontend-only
- Recharts and Socket.IO already in dependencies - no new packages needed
- Performance targets: <1s window open, <500ms updates, 60fps animations