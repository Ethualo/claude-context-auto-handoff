---
description: Restore previous session context from handoff file. Use when user runs /resume or asks to continue from last session.
---

Reads `.claude/handoff.md`. Falls back to latest file in `.claude/handoffs/`.

## Steps

1. Read `.claude/handoff.md`
2. If missing, find latest `handoff-*.md` in `.claude/handoffs/`
3. If neither found: tell user "No handoff file. Run /handoff first."
4. If found:
   - Parse: Task Description, Current Status, Key Decisions, Failed Approaches, Blockers, Next Steps
   - Brief user in their language
   - Never retry Failed Approaches
   - Start from first Next Step immediately
