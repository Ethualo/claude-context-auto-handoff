#!/usr/bin/env bash
# context-handoff-mcp-server -- one-line setup for Linux/macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/Ethualo/context-handoff-mcp-server/main/scripts/setup.sh | bash

set -e

PLUGIN_NAME="claude-context-handoff"
HOOKS_TARGET="$HOME/.claude/hooks.json"

echo "[Handoff Setup] Installing $PLUGIN_NAME..."

# 1. npm global install (builds TypeScript)
npm install -g claude-context-auto-handoff

# 2. Register hooks.json (warn if already exists)
HOOKS_SRC="$(npm root -g)/claude-context-auto-handoff/hooks/hooks.json"

if [ -f "$HOOKS_TARGET" ]; then
  echo "[Handoff Setup] WARNING: $HOOKS_TARGET already exists."
  echo "  Manually merge contents from: $HOOKS_SRC"
else
  mkdir -p "$(dirname "$HOOKS_TARGET")"
  cp "$HOOKS_SRC" "$HOOKS_TARGET"
  echo "[Handoff Setup] hooks.json registered: $HOOKS_TARGET"
fi

echo ""
echo "[Handoff Setup] Done!"
echo ""
echo "  Usage:"
echo "    /handoff  -- save current session"
echo "    /resume   -- restore previous session"
echo ""
echo "  SessionStart hook auto-restores previous context on session open."
