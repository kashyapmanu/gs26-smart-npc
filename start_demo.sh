#!/usr/bin/env bash
# Start the Smart NPCs demo in one shot:
#   - Django frontend on port 8000 (background)
#   - FastAPI LLM/feed API on port 8001 (background)
#   - Open the demo URL in the default browser
#
# Logs: /tmp/smart-npc-{django,api}.log
# Stop: ./start_demo.sh --stop   (or kill the PIDs printed here)
#
# Usage:
#   ./start_demo.sh             # start both + open browser
#   ./start_demo.sh --stop      # stop both servers
#   ./start_demo.sh --status    # show running PIDs and recent logs
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT/smallville"

PY="$ROOT/smallville/.venv/bin/python"
UVICORN="$ROOT/smallville/.venv/bin/uvicorn"
DJANGO_DIR="$ROOT/smallville/environment/frontend_server"
API_DIR="$ROOT/smallville/reverie/backend_server"
DJANGO_LOG="/tmp/smart-npc-django.log"
API_LOG="/tmp/smart-npc-api.log"
DJANGO_PID_FILE="/tmp/smart-npc-django.pid"
API_PID_FILE="/tmp/smart-npc-api.pid"
DEMO_URL="http://127.0.0.1:8000/smart-npc-demo/"

is_running() {
  local pidfile="$1"
  [[ -f "$pidfile" ]] || return 1
  local pid
  pid="$(cat "$pidfile")"
  kill -0 "$pid" 2>/dev/null
}

stop_one() {
  local name="$1" pidfile="$2"
  if is_running "$pidfile"; then
    local pid
    pid="$(cat "$pidfile")"
    kill "$pid" 2>/dev/null || true
    echo "  stopped $name (pid $pid)"
  else
    echo "  $name not running"
  fi
  rm -f "$pidfile"
}

status_one() {
  local name="$1" pidfile="$2" logfile="$3"
  if is_running "$pidfile"; then
    echo "  $name: RUNNING (pid $(cat "$pidfile"))  log: $logfile"
  else
    echo "  $name: stopped"
  fi
}

case "${1:-start}" in
  --stop|stop)
    echo "Stopping Smart NPCs demo servers..."
    stop_one "django frontend" "$DJANGO_PID_FILE"
    stop_one "fastapi smart_npc_api" "$API_PID_FILE"
    echo "Done."
    exit 0
    ;;

  --status|status)
    echo "Smart NPCs demo status:"
    status_one "django frontend"      "$DJANGO_PID_FILE" "$DJANGO_LOG"
    status_one "fastapi smart_npc_api" "$API_PID_FILE"   "$API_LOG"
    exit 0
    ;;

  start|--start)
    :

    # Reject re-launch if already running.
    if is_running "$DJANGO_PID_FILE" || is_running "$API_PID_FILE"; then
      echo "One or both servers are already running."
      echo "Run './start_demo.sh --status' to inspect, or './start_demo.sh --stop' to restart."
      exit 1
    fi
    ;;

  *)
    echo "Usage: $0 [--start|--stop|--status]" >&2
    exit 2
    ;;
esac

# Sanity checks.
if [[ ! -f "$ROOT/smallville/.env" ]]; then
  echo "WARNING: smallville/.env not found. Copy .env.example and fill in API keys:"
  echo "  cp smallville/.env.example smallville/.env"
fi
if [[ ! -x "$PY" ]]; then
  echo "ERROR: Python venv not found at $PY" >&2
  echo "  Run: cd smallville && .venv/bin/pip install -r requirements.txt fastapi uvicorn httpx python-dotenv openai" >&2
  exit 1
fi

# Kill anything squatting on the demo ports.
for port in 8000 8001; do
  squatter="$(lsof -ti tcp:$port 2>/dev/null || true)"
  if [[ -n "$squatter" ]]; then
    echo "WARNING: port $port in use (pid $squatter). Killing it."
    kill "$squatter" 2>/dev/null || true
    sleep 1
  fi
done

echo "Starting FastAPI smart_npc_api on :8001..."
( cd "$API_DIR" && "$UVICORN" smart_npc_api:app --port 8001 --host 127.0.0.1 >"$API_LOG" 2>&1 & echo $! >"$API_PID_FILE" )

echo "Starting Django frontend on :8000..."
( cd "$DJANGO_DIR" && "$PY" manage.py runserver 127.0.0.1:8000 --noreload >"$DJANGO_LOG" 2>&1 & echo $! >"$DJANGO_PID_FILE" )

# Wait for both servers to come up.
echo -n "Waiting for servers "
ok=0
for _ in $(seq 1 40); do
  echo -n "."
  sleep 0.4
  api_ok=0; django_ok=0
  curl -fsS http://127.0.0.1:8001/feed >/dev/null 2>&1 && api_ok=1
  curl -fsS http://127.0.0.1:8000/ >/dev/null 2>&1 && django_ok=1
  if [[ $api_ok -eq 1 && $django_ok -eq 1 ]]; then ok=1; break; fi
done
echo " "

if [[ $ok -ne 1 ]]; then
  echo "ERROR: servers did not become healthy in time."
  echo "--- API log tail ---"; tail -15 "$API_LOG" 2>/dev/null || true
  echo "--- Django log tail ---"; tail -15 "$DJANGO_LOG" 2>/dev/null || true
  exit 1
fi

echo "Both servers are up."
echo "  Django frontend : http://127.0.0.1:8000  (pid $(cat "$DJANGO_PID_FILE"))"
echo "  FastAPI LLM/feed: http://127.0.0.1:8001  (pid $(cat "$API_PID_FILE"))"
echo "  Demo URL        : $DEMO_URL"
echo "Logs: $DJANGO_LOG  |  $API_LOG"
echo
echo "Next: trigger Beat 2 (propagation) from the browser console, or:"
echo "  curl -X POST http://127.0.0.1:8001/orchestrator/start"
echo
echo "Stop with: $0 --stop"

# Open the browser last so the demo URL is ready to use.
if command -v open >/dev/null 2>&1; then
  open "$DEMO_URL"
fi