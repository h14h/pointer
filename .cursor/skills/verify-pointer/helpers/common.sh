#!/usr/bin/env bash
# Shared paths and defaults for verify-pointer helpers.
# Sourced by launch / doctor / cleanup. Not invoked directly.

set -euo pipefail

VERIFY_POINTER_SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERIFY_POINTER_REPO_ROOT="$(cd "${VERIFY_POINTER_SKILL_DIR}/../../.." && pwd)"
VERIFY_POINTER_RUN_DIR="${VERIFY_POINTER_RUN_DIR:-${VERIFY_POINTER_SKILL_DIR}/.run}"
VERIFY_POINTER_STATE="${VERIFY_POINTER_STATE:-${VERIFY_POINTER_RUN_DIR}/state.json}"
VERIFY_POINTER_LOG="${VERIFY_POINTER_LOG:-${VERIFY_POINTER_RUN_DIR}/dev.log}"
VERIFY_POINTER_EVIDENCE_DIR="${VERIFY_POINTER_EVIDENCE_DIR:-${VERIFY_POINTER_SKILL_DIR}/evidence}"
export VERIFY_POINTER_STATE VERIFY_POINTER_LOG VERIFY_POINTER_EVIDENCE_DIR VERIFY_POINTER_SKILL_DIR VERIFY_POINTER_REPO_ROOT VERIFY_POINTER_PORT VERIFY_POINTER_HOST VERIFY_POINTER_URL

# Scenarios and Playwright isolate on an explicit port. Default 3231 is the
# port used in scenarios/README.md — it avoids Vite's 3200 default and the
# stale README :3000 / Tidewave session.
VERIFY_POINTER_PORT="${VERIFY_POINTER_PORT:-3231}"

# Vite on this stack answers IPv6 localhost only unless --host is passed.
# Always use the hostname "localhost", never 127.0.0.1.
VERIFY_POINTER_HOST="${VERIFY_POINTER_HOST:-localhost}"
VERIFY_POINTER_URL="${VERIFY_POINTER_URL:-http://${VERIFY_POINTER_HOST}:${VERIFY_POINTER_PORT}}"

export PATH="${HOME}/.bun/bin:${PATH}"

if ! command -v bun >/dev/null 2>&1; then
  echo "verify-pointer: bun is not on PATH. Install bun, then: bun install" >&2
  exit 1
fi

mkdir -p "${VERIFY_POINTER_RUN_DIR}" "${VERIFY_POINTER_EVIDENCE_DIR}"

json_get() {
  local key="$1"
  local file="${2:-$VERIFY_POINTER_STATE}"
  python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get(sys.argv[2],''))" "$file" "$key"
}

process_alive() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

# PIDs in the launch tree (parent first). Empty if no state.
launch_pids() {
  if [[ ! -f "${VERIFY_POINTER_STATE}" ]]; then
    return 0
  fi
  python3 - <<'PY'
import json, os, sys
path = os.environ.get("VERIFY_POINTER_STATE")
if not path:
    sys.exit(0)
try:
    state = json.load(open(path))
except Exception:
    sys.exit(0)
for key in ("pgid", "bun_pid", "dev_pid", "vite_pid"):
    val = state.get(key)
    if val:
        print(val)
PY
}

port_listener_pid() {
  local port="$1"
  # Vite binds ::1 (IPv6 localhost) by default on this machine.
  lsof -nP -iTCP:"${port}" -sTCP:LISTEN 2>/dev/null \
    | awk 'NR>1 {print $2; exit}'
}

http_ok() {
  local url="$1"
  curl -fsS --max-time 5 "$url" >/dev/null
}
