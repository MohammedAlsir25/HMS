#!/bin/sh
set -e
echo "Starting Al Jawarih backend..."
exec node dist/server.js
