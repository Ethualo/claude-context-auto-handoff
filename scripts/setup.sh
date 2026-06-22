#!/usr/bin/env bash
# context-handoff-mcp-server — one-line setup for Linux/macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/Ethualo/context-handoff-mcp-server/main/scripts/setup.sh | bash

set -e

PLUGIN_NAME="claude-context-handoff"
HOOKS_TARGET="$HOME/.claude/hooks.json"

echo "[Handoff Setup] Installing $PLUGIN_NAME..."

# 1. npm global install (builds TypeScript)
npm install -g claude-context-auto-handoff

# 2. hooks.json 등록 (기존 파일이 있으면 경고만)
HOOKS_SRC="$(npm root -g)/claude-context-auto-handoff/hooks/hooks.json"

if [ -f "$HOOKS_TARGET" ]; then
  echo "[Handoff Setup] WARNING: $HOOKS_TARGET 이미 존재합니다."
  echo "  수동으로 $HOOKS_SRC 내용을 병합하세요."
else
  mkdir -p "$(dirname "$HOOKS_TARGET")"
  cp "$HOOKS_SRC" "$HOOKS_TARGET"
  echo "[Handoff Setup] hooks.json 등록 완료: $HOOKS_TARGET"
fi

echo ""
echo "[Handoff Setup] 완료!"
echo ""
echo "  사용법:"
echo "    /handoff  — 현재 세션 저장"
echo "    /resume   — 이전 세션 복원"
echo ""
echo "  SessionStart 훅이 세션 시작 시 자동으로 이전 컨텍스트를 복원합니다."
