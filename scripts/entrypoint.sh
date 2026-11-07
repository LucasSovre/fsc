#!/bin/bash
set -e

node node_modules/prisma/dist/prisma.js db migrate --no-interactive

node --import tsx scripts/worker.ts &
worker=$!
node node_modules/next/dist/bin/next start &
server=$!

trap 'kill -TERM $worker $server 2>/dev/null' TERM INT

status=0
wait -n $worker $server || status=$?
kill -TERM $worker $server 2>/dev/null || true
wait || true
exit $status
