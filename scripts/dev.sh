#!/bin/bash

# Load env
export $(cat .env | grep -v '^#' | xargs)

# Start redis
docker compose -f config/redis-compose.yml up -d

# Start nest in background
nest start --watch &
NEST_PID=$!

# Wait for nest to be ready
echo "⏳ Waiting for NestJS to start on port $PORT..."
until curl -s http://localhost:$PORT > /dev/null 2>&1; do
  sleep 1
done
echo "✅ NestJS is up!"

# Start tunnel (pass port directly, skip ngrok.yml addr)
ngrok http --url=https://noncounterfeit-unshriven-thomasina.ngrok-free.dev $PORT &
NGROK_PID=$!

# On Ctrl+C, kill everything
cleanup() {
  echo "\n🛑 Shutting down..."
  kill $NGROK_PID 2>/dev/null
  kill $NEST_PID 2>/dev/null
  docker compose -f config/redis-compose.yml down
  exit 0
}

trap cleanup SIGINT SIGTERM

wait