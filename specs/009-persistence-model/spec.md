# Feature Specification: Database Schema Design

**Feature Branch**: `009-persistence-model`  
**Created**: January 3, 2026  
**Status**: Draft  
**Input**: Design the relational database schema for the Live Event Polling Application based on approved domain specifications and backend module boundaries

## User Scenarios & Testing

### User Story 1 - Define Core Entity Tables (Priority: P1)

Database administrators and developers need clear table definitions for sessions, polls, votes, and participants to store the core business entities with proper constraints.

**Why this priority**: Without core entity tables, the application cannot persist any data. This is the foundation for all database operations.

**Independent Test**: Can be validated by reviewing table definitions against domain specifications and confirming each entity has primary keys, required fields, and proper data types.

**Acceptance Scenarios**:

1. **Given** domain entity specifications exist, **When** defining tables, **Then** each entity has a corresponding table with all required attributes
2. **Given** a table definition, **When** checking constraints, **Then** primary keys and NOT NULL constraints are properly defined
3. **Given** business rules for entity attributes, **When** reviewing table schema, **Then** all domain constraints are enforceable at the database level

---

### User Story 2 - Define Entity Relationships (Priority: P1)

Developers need explicit foreign key relationships between tables to maintain referential integrity and support entity associations (poll belongs to session, vote references poll and participant).

**Why this priority**: Relationships enforce data integrity and prevent orphaned records. Without them, the database cannot guarantee consistency per ADR-003.

**Independent Test**: Can be validated by drawing an entity-relationship diagram and confirming all relationships match module boundaries and domain specifications.

**Acceptance Scenarios**:

1. **Given** two related entities, **When** defining relationship, **Then** foreign key constraints ensure referential integrity
2. **Given** a cascading delete rule, **When** parent entity is deleted, **Then** child records are handled appropriately (cascade or restrict)
3. **Given** module boundaries, **When** reviewing relationships, **Then** tables owned by different modules do not have circular dependencies

---

### User Story 3 - Define Uniqueness Constraints (Priority: P1)

Database administrators need uniqueness constraints to prevent duplicate data and enforce business invariants (one vote per participant per poll, unique session slugs).

**Why this priority**: Uniqueness constraints guarantee critical business rules at the database level, preventing race conditions and data corruption per ADR-003 (ACID guarantees).

**Independent Test**: Can be validated by attempting to insert duplicate records and confirming the database rejects them with constraint violations.

**Acceptance Scenarios**:

1. **Given** a participant has voted on a poll, **When** attempting to vote again, **Then** database constraint prevents duplicate vote
2. **Given** a session slug exists, **When** creating another session with same slug, **Then** database constraint prevents duplicate slug
3. **Given** uniqueness constraints, **When** reviewing schema, **Then** all composite unique indexes are properly defined

---

### User Story 4 - Define State Transition Support (Priority: P2)

Developers need database fields that support state machine transitions for sessions (draft, active, ended) and polls (open, closed) with proper validation.

**Why this priority**: State fields enable business logic to enforce valid transitions and prevent invalid states, supporting reliability requirements.

**Independent Test**: Can be validated by confirming state fields have appropriate types (enums or check constraints) and match state machine specifications.

**Acceptance Scenarios**:

1. **Given** a session status field, **When** updating status, **Then** only valid status values are accepted
2. **Given** poll state transitions, **When** reviewing schema, **Then** fields exist to track current state and timestamps
3. **Given** state machine rules, **When** validating schema, **Then** database supports all required state transitions

---

### Edge Cases

- What happens when foreign key references are deleted? (Define cascade/restrict rules)
- How does schema handle concurrent vote submissions? (Uniqueness constraints must be atomic)
- What if a session has thousands of polls? (Schema must scale without performance degradation)
- How does schema prevent orphaned data? (Foreign keys with appropriate cascade rules)

## Requirements

### Functional Requirements

- **FR-001**: Schema MUST define tables for sessions, polls, poll_options, votes, and participants
- **FR-002**: Schema MUST enforce one vote per participant per poll via composite unique constraint
- **FR-003**: Schema MUST use foreign keys to maintain referential integrity between related entities
- **FR-004**: Schema MUST support session state transitions (draft, active, ended) with status field
- **FR-005**: Schema MUST support poll lifecycle tracking with timestamps (created_at, closed_at)
- **FR-006**: Schema MUST enforce unique session slugs via uniqueness constraint
- **FR-007**: Schema MUST associate each poll with exactly one session via session_id foreign key
- **FR-008**: Schema MUST associate each vote with exactly one poll and one participant via foreign keys
- **FR-009**: Schema MUST support multiple poll types (multiple_choice, rating_scale, open_text) via type field
- **FR-010**: Schema MUST track which poll is currently active in a session via active_poll_id field
- **FR-011**: Schema MUST align table ownership with backend module boundaries
- **FR-012**: Schema MUST support presenter authorization by storing presenter_id in sessions table
- **FR-013**: Schema MUST prevent vote loss through ACID guarantees (per ADR-003)
- **FR-014**: Schema MUST support efficient vote counting via indexed foreign keys
- **FR-015**: Schema MUST track participant join timestamps for analytics

### Key Entities

**Note**: This specification defines logical schema design, not SQL DDL or ORM annotations.

- **sessions**: Owned by Session Management module - stores polling event metadata, lifecycle state, and active poll reference
- **polls**: Owned by Poll Management module - stores questions, poll type, anonymity settings, and closure state
- **poll_options**: Owned by Poll Management module - stores option text for multiple-choice polls
- **votes**: Owned by Vote Management module - stores individual vote records with participant and poll references
- **participants**: Owned by Participant Management module - stores participant information and session association

## Success Criteria

### Measurable Outcomes

- **SC-001**: Schema prevents duplicate votes (100% constraint enforcement for participant+poll combination)
- **SC-002**: Schema enforces referential integrity (0 orphaned records possible)
- **SC-003**: Schema supports all domain entity attributes (100% coverage of required fields)
- **SC-004**: Schema aligns with module boundaries (each table owned by exactly one module)
- **SC-005**: Schema guarantees ACID properties (per ADR-003 - all transactions are atomic, consistent, isolated, durable)
- **SC-006**: Schema supports efficient vote retrieval (indexed foreign keys enable sub-second poll results aggregation)

---

## Schema Definitions

### Table: sessions

**Owned by**: Session Management Module

**Purpose**: Stores presenter polling events with lifecycle state and access control

**Fields**:
- `id` (UUID, Primary Key): Unique session identifier
- `presenter_id` (UUID, NOT NULL): Identifier for the presenter who owns this session
- `title` (VARCHAR(200), NOT NULL): Human-readable session title
- `slug` (VARCHAR(50), UNIQUE, NOT NULL): URL-safe unique access code for joining session
- `status` (ENUM, NOT NULL): Session lifecycle state - `draft`, `active`, `ended`
- `active_poll_id` (UUID, NULLABLE): Foreign key to currently active poll (NULL if no active poll)
- `created_at` (TIMESTAMP, NOT NULL): Session creation timestamp
- `started_at` (TIMESTAMP, NULLABLE): When session transitioned to active state
- `ended_at` (TIMESTAMP, NULLABLE): When session transitioned to ended state

**Constraints**:
- Primary Key: `id`
- Unique: `slug` (prevents duplicate access codes)
- Foreign Key: `active_poll_id` REFERENCES `polls(id)` ON DELETE SET NULL
- Check: `status IN ('draft', 'active', 'ended')`
- Check: `started_at IS NULL OR started_at >= created_at`
- Check: `ended_at IS NULL OR ended_at >= started_at`

**Indexes**:
- Primary index on `id`
- Unique index on `slug` (for slug-based lookups)
- Index on `presenter_id` (for presenter's session list queries)
- Index on `status` (for filtering active sessions)

---

### Table: polls

**Owned by**: Poll Management Module

**Purpose**: Stores questions presented to participants with type and configuration

**Fields**:
- `id` (UUID, Primary Key): Unique poll identifier
- `session_id` (UUID, NOT NULL): Foreign key to owning session
- `question` (TEXT, NOT NULL): Poll question text
- `poll_type` (ENUM, NOT NULL): Type of poll - `multiple_choice`, `rating_scale`, `open_text`
- `allow_multiple` (BOOLEAN, NOT NULL, DEFAULT false): Whether participants can select multiple options
- `is_anonymous` (BOOLEAN, NOT NULL, DEFAULT true): Whether votes are anonymous
- `min_rating` (INTEGER, NULLABLE): Minimum rating value (for rating_scale polls)
- `max_rating` (INTEGER, NULLABLE): Maximum rating value (for rating_scale polls)
- `sequence_order` (INTEGER, NOT NULL): Display order within session
- `created_at` (TIMESTAMP, NOT NULL): Poll creation timestamp
- `closed_at` (TIMESTAMP, NULLABLE): When poll was closed (NULL if still open)

**Constraints**:
- Primary Key: `id`
- Foreign Key: `session_id` REFERENCES `sessions(id)` ON DELETE CASCADE
- Check: `poll_type IN ('multiple_choice', 'rating_scale', 'open_text')`
- Check: `(poll_type = 'rating_scale' AND min_rating IS NOT NULL AND max_rating IS NOT NULL) OR (poll_type != 'rating_scale')`
- Check: `min_rating IS NULL OR max_rating IS NULL OR min_rating < max_rating`
- Check: `closed_at IS NULL OR closed_at >= created_at`
- Check: `sequence_order > 0`

**Indexes**:
- Primary index on `id`
- Index on `session_id` (for session's polls queries)
- Index on `session_id, sequence_order` (for ordered poll display)
- Index on `closed_at` (for filtering open vs closed polls)

---

### Table: poll_options

**Owned by**: Poll Management Module

**Purpose**: Stores selectable options for multiple-choice polls

**Fields**:
- `id` (UUID, Primary Key): Unique option identifier
- `poll_id` (UUID, NOT NULL): Foreign key to owning poll
- `option_text` (VARCHAR(500), NOT NULL): Text displayed for this option
- `sequence_order` (INTEGER, NOT NULL): Display order within poll

**Constraints**:
- Primary Key: `id`
- Foreign Key: `poll_id` REFERENCES `polls(id)` ON DELETE CASCADE
- Unique: `(poll_id, sequence_order)` (prevents duplicate sequence numbers within same poll)
- Check: `sequence_order > 0`

**Indexes**:
- Primary index on `id`
- Index on `poll_id` (for poll's options queries)
- Unique index on `(poll_id, sequence_order)` (for ordered option display)

**Notes**:
- Only applies to `multiple_choice` polls
- Empty table for `rating_scale` and `open_text` polls

---

### Table: votes

**Owned by**: Vote Management Module

**Purpose**: Stores individual participant responses to polls with audit trail

**Fields**:
- `id` (UUID, Primary Key): Unique vote identifier
- `poll_id` (UUID, NOT NULL): Foreign key to poll being voted on
- `participant_id` (UUID, NOT NULL): Foreign key to participant who voted
- `option_id` (UUID, NULLABLE): Foreign key to selected option (for multiple_choice polls)
- `rating_value` (INTEGER, NULLABLE): Rating value submitted (for rating_scale polls)
- `text_response` (TEXT, NULLABLE): Free text response (for open_text polls)
- `submitted_at` (TIMESTAMP, NOT NULL): When vote was submitted

**Constraints**:
- Primary Key: `id`
- Foreign Key: `poll_id` REFERENCES `polls(id)` ON DELETE CASCADE
- Foreign Key: `participant_id` REFERENCES `participants(id)` ON DELETE CASCADE
- Foreign Key: `option_id` REFERENCES `poll_options(id)` ON DELETE CASCADE (nullable)
- Unique: `(participant_id, poll_id)` **CRITICAL** - prevents duplicate votes
- Check: `(option_id IS NOT NULL) OR (rating_value IS NOT NULL) OR (text_response IS NOT NULL)` (at least one response type must be filled)

**Indexes**:
- Primary index on `id`
- Unique index on `(participant_id, poll_id)` **CRITICAL** - enforces one vote per participant per poll
- Index on `poll_id` (for vote counting queries)
- Index on `option_id` (for option-specific vote counts)
- Index on `submitted_at` (for chronological vote analysis)

**Notes**:
- The `(participant_id, poll_id)` unique constraint is the **primary mechanism** for preventing duplicate votes
- Database-level enforcement guarantees atomicity even under concurrent submissions

---

### Table: participants

**Owned by**: Participant Management Module

**Purpose**: Stores information about attendees who joined sessions

**Fields**:
- `id` (UUID, Primary Key): Unique participant identifier
- `session_id` (UUID, NOT NULL): Foreign key to session participant joined
- `display_name` (VARCHAR(100), NULLABLE): Optional participant display name
- `joined_at` (TIMESTAMP, NOT NULL): When participant joined session

**Constraints**:
- Primary Key: `id`
- Foreign Key: `session_id` REFERENCES `sessions(id)` ON DELETE CASCADE

**Indexes**:
- Primary index on `id`
- Index on `session_id` (for session's participant list queries)
- Index on `joined_at` (for chronological join order)

**Notes**:
- `display_name` is nullable to support anonymous participation
- Each join creates a new participant record (no de-duplication)

---

## Relationship Summary

**One-to-Many Relationships**:
1. `sessions` (1) → `polls` (many): One session has many polls
2. `sessions` (1) → `participants` (many): One session has many participants
3. `polls` (1) → `poll_options` (many): One poll has many options (for multiple_choice type)
4. `polls` (1) → `votes` (many): One poll has many votes
5. `participants` (1) → `votes` (many): One participant can submit many votes (across different polls)

**One-to-One Relationships**:
1. `sessions` (1) → `polls` (0 or 1): One session has one active poll (via `active_poll_id`)

**Many-to-Many Relationships**:
- NONE (all relationships are expressed through foreign keys)

**Cross-Module Dependencies** (via foreign keys):
- Vote Management → Poll Management: `votes.poll_id` references `polls.id`
- Vote Management → Participant Management: `votes.participant_id` references `participants.id`
- Vote Management → Poll Management: `votes.option_id` references `poll_options.id`
- Poll Management → Session Management: `polls.session_id` references `sessions.id`
- Participant Management → Session Management: `participants.session_id` references `sessions.id`
- Session Management → Poll Management: `sessions.active_poll_id` references `polls.id`

**No Circular Dependencies**: All foreign key relationships flow in one direction per module boundaries

---

## Cascade Rules

**DELETE CASCADE** (child records deleted when parent is deleted):
- `sessions` deleted → cascade to `polls`, `participants`
- `polls` deleted → cascade to `poll_options`, `votes`
- `participants` deleted → cascade to `votes`
- `poll_options` deleted → cascade to `votes` (via `option_id`)

**SET NULL** (child reference set to NULL when parent is deleted):
- `polls` deleted → set `sessions.active_poll_id` to NULL (session continues without active poll)

**Rationale**: Cascade deletes maintain referential integrity while preventing orphaned data. SET NULL for `active_poll_id` allows poll deletion without breaking session.

---

## Data Integrity Guarantees

### Vote Uniqueness (Critical)
- **Constraint**: `UNIQUE (participant_id, poll_id)` on `votes` table
- **Guarantees**: Participant cannot vote twice on same poll
- **Enforcement**: Database rejects duplicate inserts with constraint violation
- **Concurrency**: Atomic enforcement prevents race conditions

### Referential Integrity
- **Constraint**: Foreign keys with CASCADE/SET NULL rules
- **Guarantees**: No orphaned votes, options, participants, or polls
- **Enforcement**: Database prevents deletes that would create orphans
- **Consistency**: All relationships remain valid per ADR-003

### State Transition Support
- **Constraint**: CHECK constraints on status/state enums
- **Guarantees**: Only valid states can be persisted
- **Enforcement**: Database rejects invalid state values
- **Alignment**: Supports state machine specifications

### Timestamp Ordering
- **Constraint**: CHECK constraints on timestamp fields
- **Guarantees**: `ended_at >= started_at >= created_at`
- **Enforcement**: Database prevents time paradoxes
- **Reliability**: Enables accurate lifecycle tracking

---

## Module Ownership Mapping

| Table | Owned by Module | Exposed Capabilities |
|-------|----------------|---------------------|
| `sessions` | Session Management | Session CRUD, state transitions, active poll tracking |
| `polls` | Poll Management | Poll CRUD, options management, results aggregation |
| `poll_options` | Poll Management | Option management for multiple-choice polls |
| `votes` | Vote Management | Vote submission, vote retrieval, duplicate prevention |
| `participants` | Participant Management | Participant registration, session join tracking |

**Boundary Enforcement**:
- Each module has exclusive write access to its owned tables
- Other modules access data via module APIs, not direct SQL queries
- No shared tables between modules
- Foreign keys represent inter-module dependencies (allowed per module boundaries spec)

---

## Out of Scope

This specification intentionally does NOT include:

- **SQL DDL Statements**: No CREATE TABLE syntax (implementation detail)
- **ORM Annotations**: No Prisma/TypeORM/Sequelize-specific code
- **Database-Specific Tuning**: No PostgreSQL-specific performance optimizations
- **Index Tuning**: General indexing strategy defined, but no EXPLAIN ANALYZE results
- **Migration Strategy**: No versioning, rollback, or migration tooling
- **Redis Schema**: Event replay buffer and cache are out of scope
- **Partitioning Strategy**: No sharding or table partitioning (future scaling concern)
- **Backup Strategy**: No backup/restore procedures
- **Replication**: No read replicas or multi-region setup

---

## Assumptions

- PostgreSQL 16 will be used (per implementation-technology-stack.md)
- UUID generation will be handled by application layer or database (pg_crypto extension)
- Timestamps are stored in UTC timezone
- VARCHAR lengths are reasonable defaults and can be adjusted during implementation
- ENUM types will be implemented using CHECK constraints or native PostgreSQL ENUMs
- Database enforces ACID guarantees per ADR-003
- Connection pooling and query optimization are handled at application layer
- Database user permissions will restrict modules to their owned tables

---

## Validation Against Requirements

✅ **Vote Uniqueness**: `UNIQUE (participant_id, poll_id)` constraint guarantees one vote per participant per poll

✅ **Vote Loss Prevention**: Foreign key CASCADE rules and ACID guarantees prevent orphaned or lost votes

✅ **State Transitions**: Status fields and CHECK constraints support session (draft/active/ended) and poll (open/closed) states

✅ **Module Alignment**: Table ownership explicitly mapped to backend modules with no shared tables

✅ **Domain Specs**: All entity attributes from domain specs (session.md, poll.md, vote.md) are represented

✅ **Referential Integrity**: Foreign keys maintain relationships per ADR-003 persistence strategy

✅ **Scalability**: Indexed foreign keys support horizontal scaling per ADR-004

---

## Next Steps

After this specification is approved:

1. **Implementation Phase**: Convert logical schema to Prisma schema.prisma
2. **Migration Phase**: Generate SQL migrations for database creation
3. **Seeding Phase**: Create seed data for testing
4. **Testing Phase**: Validate constraints with integration tests
5. **Documentation Phase**: Update API contracts with data model details

**Note**: This specification focuses on WHAT data is stored and HOW it relates. The implementation phase will define database-specific syntax and ORM mappings.
