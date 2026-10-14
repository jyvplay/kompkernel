#!/bin/bash
set -e
gh api "repos/$1/issues/$2" -q .body | python3 bench/z48/extract-block.py "$3"
