# Context Handoff — Session Instructions

Copy this file to your project root as `AGENTS.md` when using the `context-handoff` MCP server with Codex.

## Session Start

If `.claude/handoff.md` exists in the project root, read it immediately before doing anything else. Restore all context: task description, current status, key decisions, failed approaches, blockers, and next steps. Begin from the first uncompleted next step.

If the file does not exist, proceed normally.

## Session End / Before Context Grows Large

Before ending the session or when the conversation is getting long, call `generate_handoff_manifest` with the following fields:

| Field | Required | Format |
|-------|----------|--------|
| `summary` | ✅ | Terse session recap. Telegraphese — no articles, no filler. |
| `nextSteps` | ✅ | Ordered array of next tasks |
| `taskDescription` | recommended | Goal + why it matters to the project |
| `currentStatus` | recommended | What is done vs what remains — state WHY, not just what |
| `keyDecisions` | recommended | `"Decision: X — Reason: Y"` |
| `failedApproaches` | recommended | `"Approach: X → Result: Y → Lesson: Z"` |
| `modifiedFiles` | recommended | `"path/to/file: what changed"` — NO code snippets |
| `implicitRules` | recommended | Tech stack, naming conventions, env vars |
| `blockers` | optional | Unresolved errors or open questions |

Output is saved to `.claude/handoff.md` (latest) and `.claude/handoffs/handoff-{timestamp}.md` (archive).

## Rules

- **WHY over WHAT**: Every decision and status must state the reason, not just the action.
- **No code snippets** in any field — reference file paths and delta notes only.
- **failedApproaches is mandatory** when any approach was tried and failed — prevents the next session from repeating mistakes.
