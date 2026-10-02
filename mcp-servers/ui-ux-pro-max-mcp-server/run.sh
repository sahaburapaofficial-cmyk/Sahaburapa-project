#!/bin/bash
# Entry point for .mcp.json: builds the server on first use, then runs it over stdio.
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"
bash "$dir/build.sh"
exec node "$dir/dist/index.js" "$@"
