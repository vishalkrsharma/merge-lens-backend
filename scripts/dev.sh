#!/bin/bash

# Load env
export $(cat .env | grep -v '^#' | xargs)

# Start tunnel
ngrok start my-app --config config/ngrok.yml &
NGROK_PID=$!

# Start redis
docker compose -f config/redis-compose.yml up -d

# Start nest
nest start --watch &
NEST_PID=$!

# On Ctrl+C, kill everything
cleanup() {
  echo "\n🛑 Shutting down..."
  kill $NGROK_PID 2>/dev/null
  kill $NEST_PID 2>/dev/null
  docker compose -f config/redis-compose.yml down
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait
wait