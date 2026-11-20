#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
git apply --check bench/x144b/fastscan-experiment.patch
git apply bench/x144b/fastscan-experiment.patch
trap 'git apply -R bench/x144b/fastscan-experiment.patch' EXIT
for f in speed scan_unit; do
 node_modules/.bin/esbuild bench/x144b/$f.ts --bundle --platform=node --format=esm --outfile=bench/x144b/$f.mjs
done
