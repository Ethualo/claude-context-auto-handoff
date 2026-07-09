---
description: Save current session context to handoff file. Use when user runs /handoff or asks to save session state before ending.
---

Save session context to `.claude/handoff.md` and timestamped archive to `.claude/handoffs/`.

## Content Generation Rules (STRICT)

Write all field values using telegraphese — drop articles, pronouns, polite words. Maximize density.

- **NO code snippets** in any field. Reference file paths + line-level delta notes only.
- **WHY over WHAT**: Every decision/status must state the reason, not just the action.
- **failedApproaches**: Format each entry as `"Approach: X → Result: Y → Lesson: Z"`. This prevents the next session from repeating mistakes.
- **taskDescription**: Include both Goal and Core Intent (why this matters to the project).
- **implicitRules**: Capture tech stack, naming conventions, env vars — anything not derivable from reading the code.

## Steps

1. Gather from current session:
   - taskDescription: final goal + core intent (why)
   - summary: terse session recap (telegraphese)
   - currentStatus: done vs remaining
   - keyDecisions: architecture choices + why (prevents post-compaction amnesia)
   - failedApproaches: already-failed attempts in `Approach→Result→Lesson` format
   - blockers: unresolved errors
   - modifiedFiles: changed files with delta notes (no code, path + what changed)
   - implicitRules: stack, conventions, env vars

2. Call `generate_handoff_manifest`:
   - `summary`, `nextSteps` — required
   - `taskDescription`, `currentStatus`, `keyDecisions`, `failedApproaches`, `modifiedFiles`, `implicitRules` — recommended
   - `blockers` — optional

3. Confirm to user:
   - Latest: `.claude/handoff.md`
   - Archive: `.claude/handoffs/handoff-{timestamp}.md`
   - Next session: run `/resume` or SessionStart hook auto-restores
