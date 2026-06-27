#!/bin/sh
set -e
npx prisma db push --accept-data-loss
npx tsx prisma/seed.js
exec node dist/server.js
