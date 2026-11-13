#!/bin/sh
set -eu

REPO_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
PLUGIN_DIR="${LIGHTISLE_PLUGIN_TARGET:-/Users/queensu/Library/Application Support/LightIsle/plugins/cpe-monitor}"
PLUGIN_DATA_DIR="${LIGHTISLE_PLUGIN_DATA_TARGET:-/Users/queensu/Library/Application Support/LightIsle/plugin-data/cpe-monitor}"
BASE_PATH_VALUE="${BASE_PATH:-/apps/cpe-monitor}"

cd "$REPO_DIR"

echo "==> Building Next.js standalone with BASE_PATH=$BASE_PATH_VALUE"
BASE_PATH="$BASE_PATH_VALUE" NEXT_PUBLIC_BASE_PATH="$BASE_PATH_VALUE" npm run build

echo "==> Bundling one-shot cron-runner.cjs"
./node_modules/.bin/esbuild src/lib/cron-runner.ts \
  --bundle \
  --platform=node \
  --format=cjs \
  --outfile=.next/standalone/cron-runner.cjs \
  --external:better-sqlite3 \
  --tsconfig=tsconfig.json

echo "==> Syncing standalone build to $PLUGIN_DIR"
mkdir -p "$PLUGIN_DIR" "$PLUGIN_DATA_DIR"
chmod 700 "$PLUGIN_DIR" "$PLUGIN_DATA_DIR"

# Preserve LightIsle-managed plugin metadata and runtime scripts while refreshing build output.
rm -rf "$PLUGIN_DIR/.next" "$PLUGIN_DIR/node_modules" "$PLUGIN_DIR/public" "$PLUGIN_DIR/src"
cp -R .next/standalone/. "$PLUGIN_DIR/"
mkdir -p "$PLUGIN_DIR/.next/static"
cp -R .next/static/. "$PLUGIN_DIR/.next/static/"
if [ -d public ]; then
  mkdir -p "$PLUGIN_DIR/public"
  cp -R public/. "$PLUGIN_DIR/public/"
fi

echo "==> Done syncing cpe-monitor build artifacts to $PLUGIN_DIR"
