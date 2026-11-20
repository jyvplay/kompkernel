#!/usr/bin/env bash
# Build isolated experimental bundles without leaving a production hot-path edit.
set -euo pipefail
cd "$(dirname "$0")/../.."
git apply --check bench/x140/memo-experiment.patch
git apply bench/x140/memo-experiment.patch
trap 'git apply -R bench/x140/memo-experiment.patch' EXIT
node_modules/.bin/esbuild bench/x140/memo_unit.ts --bundle --platform=node --format=esm --outfile=bench/x140/memo_unit.mjs
node_modules/.bin/esbuild bench/x140/speed.ts --bundle --platform=node --format=esm --outfile=bench/x140/speed.mjs
