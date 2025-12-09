---
description: Generate an actionable, dependency-ordered tasks.md for the feature based on available design artifacts.
---

## Language Instruction

**IMPORTANT**: Think in English but write all documentation in Japanese. Use Japanese templates and output all content in Japanese.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Setup**: Run `.specify/scripts/bash/check-prerequisites.sh --json` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. **Load design documents**: Read from FEATURE_DIR:

   - **Required**: plan.md (tech stack, libraries, structure), spec.md (user stories with priorities)
   - **Optional**: data-model.md (entities), contracts/ (API endpoints), research.md (decisions), quickstart.md (test scenarios)
   - Note: Not all projects have all documents. Generate tasks based on what's available.

3. **Execute task generation workflow**:

   - Load plan.md and extract tech stack, libraries, project structure
   - Load spec.md and extract user stories with their priorities (P1, P2, P3, etc.)
   - If data-model.md exists: Extract entities and map to user stories
   - If contracts/ exists: Map endpoints to user stories
   - If research.md exists: Extract decisions for setup tasks
   - Generate tasks organized by user story (see Task Generation Rules below)
   - Generate dependency graph showing user story completion order
   - Create parallel execution examples per user story
   - Validate task completeness (each user story has all needed tasks, independently testable)

4. **Generate tasks.md**: Use `.specify/templates/tasks-template-ja.md` (Japanese template) as structure, if not found use `.specify/templates/tasks-template.md` and translate to Japanese, fill with:

   - Correct feature name from plan.md
   - Phase 1: Setup tasks (project initialization)
   - Phase 2: Foundational tasks (blocking prerequisites for all user stories)
   - Phase 3+: One phase per user story (in priority order from spec.md)
   - Each phase includes: story goal, independent test criteria, tests (if requested), implementation tasks
   - Final Phase: Polish & cross-cutting concerns
   - All tasks must follow the strict checklist format (see Task Generation Rules below)
   - Clear file paths for each task
   - Dependencies section showing story completion order
   - Parallel execution examples per story
   - Implementation strategy section (MVP first, incremental delivery)

5. **Vibe-Kanban Integration (Optional)**:

   - Check if vibe-kanban MCP tools are available (look for mcp\_\_vibe_kanban functions)
   - If available, ask user: "Would you like to register these tasks to vibe-kanban board? (yes/no)"
   - If yes, parse tasks.md and for each task:
     - Extract task ID, description, story label, parallel marker
     - Use MCP tools to create kanban cards with:
       - Title: [TaskID] Description
       - Labels: Story label (e.g., US1), parallel marker if present
       - Status: "Todo"
       - Description: Full task details including file paths
   - Report number of tasks registered to kanban board

6. **Report**: Output path to generated tasks.md and summary:
   - Total task count
   - Task count per user story
   - Parallel opportunities identified
   - Independent test criteria for each story
   - Suggested MVP scope (typically just User Story 1)
   - Format validation: Confirm ALL tasks follow the checklist format (checkbox, ID, labels, file paths)
   - If vibe-kanban integration was used: Number of tasks registered to board

Context for task generation: $ARGUMENTS

The tasks.md should be immediately executable - each task must be specific enough that an LLM can complete it without additional context.

## Task Generation Rules

**CRITICAL**: Tasks MUST be organized by user story to enable independent implementation and testing.

**Tests are OPTIONAL**: Only generate test tasks if explicitly requested in the feature specification or if user requests TDD approach.

### Checklist Format (REQUIRED)

Every task MUST strictly follow this format:

```text
- [ ] [TaskID] [P?] [Story?] Description with file path
```

**Format Components**:

1. **Checkbox**: ALWAYS start with `- [ ]` (markdown checkbox)
2. **Task ID**: Sequential number (T001, T002, T003...) in execution order
3. **[P] marker**: Include ONLY if task is parallelizable (different files, no dependencies on incomplete tasks)
4. **[Story] label**: REQUIRED for user story phase tasks only
   - Format: [US1], [US2], [US3], etc. (maps to user stories from spec.md)
   - Setup phase: NO story label
   - Foundational phase: NO story label
   - User Story phases: MUST have story label
   - Polish phase: NO story label
5. **Description**: Clear action with exact file path

**Examples**:

- ✅ CORRECT: `- [ ] T001 Create project structure per implementation plan`
- ✅ CORRECT: `- [ ] T005 [P] Implement authentication middleware in src/middleware/auth.py`
- ✅ CORRECT: `- [ ] T012 [P] [US1] Create User model in src/models/user.py`
- ✅ CORRECT: `- [ ] T014 [US1] Implement UserService in src/services/user_service.py`
- ❌ WRONG: `- [ ] Create User model` (missing ID and Story label)
- ❌ WRONG: `T001 [US1] Create model` (missing checkbox)
- ❌ WRONG: `- [ ] [US1] Create User model` (missing Task ID)
- ❌ WRONG: `- [ ] T001 [US1] Create model` (missing file path)

### Task Organization

1. **From User Stories (spec.md)** - PRIMARY ORGANIZATION:
   - Each user story (P1, P2, P3...) gets its own phase
   - Map all related components to their story:
     - Models needed for that story
     - Services needed for that story
     - Endpoints/UI needed for that story
     - If tests requested: Tests specific to that story
   - Mark story dependencies (most stories should be independent)
2. **From Contracts**:
   - Map each contract/endpoint → to the user story it serves
   - If tests requested: Each contract → contract test task [P] before implementation in that story's phase
3. **From Data Model**:
   - Map each entity to the user story(ies) that need it
   - If entity serves multiple stories: Put in earliest story or Setup phase
   - Relationships → service layer tasks in appropriate story phase
4. **From Setup/Infrastructure**:
   - Shared infrastructure → Setup phase (Phase 1)
   - Foundational/blocking tasks → Foundational phase (Phase 2)
   - Story-specific setup → within that story's phase

### Phase Structure

- **Phase 1**: Setup (project initialization)
- **Phase 2**: Foundational (blocking prerequisites - MUST complete before user stories)
- **Phase 3+**: User Stories in priority order (P1, P2, P3...)
  - Within each story: Tests (if requested) → Models → Services → Endpoints → Integration
  - Each phase should be a complete, independently testable increment
- **Final Phase**: Polish & Cross-Cutting Concerns

## Vibe-Kanban MCP Integration Instructions

### When to Integrate

After generating tasks.md, check for vibe-kanban MCP availability and offer integration.

### Integration Process

1. **Check MCP Tool Availability**:

   - Look for mcp\_\_vibe_kanban or similar MCP functions
   - If not available, skip integration step

2. **Parse Generated Tasks**:

   ```javascript
   // Parse each task line from tasks.md
   // Format: - [ ] T001 [P] [US1] Description with path
   const taskPattern = /- \[ \] (T\d+)\s*(\[P\])?\s*(\[US\d+\])?\s*(.*)/;
   ```

3. **Create Kanban Cards**:
   For each parsed task, create a card with:

   - **Title**: TaskID + Short description
   - **Column**: "Todo" (initial status)
   - **Labels**:
     - Story label (US1, US2, etc.) if present
     - "parallel" if [P] marker present
     - Phase label (setup, foundational, polish)
   - **Description**: Full task text including file paths
   - **Priority**: Based on task sequence (T001=1, T002=2, etc.)

4. **User Confirmation Flow**:

   ```
   📋 Task Registration Summary:
   ================================
   Total tasks found: 25

   Phase breakdown:
   • Setup: 5 tasks
   • Foundational: 3 tasks
   • User Story 1 [P1]: 10 tasks (3 parallel)
   • User Story 2 [P2]: 5 tasks (2 parallel)
   • Polish: 2 tasks

   Would you like to register these tasks to vibe-kanban? (yes/no)
   ```

5. **Batch Registration**:

   - Register tasks in order of their IDs
   - Maintain phase grouping for better organization
   - Report progress: "Registering task 1/25..."

6. **Success Report**:
   ```
   ✅ Successfully registered 25 tasks to vibe-kanban
   🔗 Board URL: [if available from MCP]
   📊 Parallel tasks marked: 5
   🎯 Ready to start with User Story 1 (MVP)
   ```

### Error Handling

- If MCP connection fails, continue with tasks.md generation
- Offer to retry registration if partial failure occurs
- Always generate tasks.md regardless of kanban registration success
