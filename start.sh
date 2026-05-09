#!/bin/bash
echo "Building frontend..."
npx vite build --config vite.web.config.ts
echo "Starting server..."
exec tsx server/index.ts
