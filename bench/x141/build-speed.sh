#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
git apply --check bench/x141/decimal-experiment.patch
git apply bench/x141/decimal-experiment.patch
trap 'git apply -R bench/x141/decimal-experiment.patch' EXIT
node_modules/.bin/esbuild bench/x141/decimal_unit.ts --bundle --platform=node --format=esm --outfile=bench/x141/decimal_unit.mjs
node_modules/.bin/esbuild bench/x141/speed.ts --bundle --platform=node --format=esm --outfile=bench/x141/speed.mjs
