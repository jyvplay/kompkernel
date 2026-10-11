#!/usr/bin/env bash
# Static audit of openai/ten-proofs (Astra, Aug 2026). Usage: ten-proofs-audit.sh <dir-with-fetched-lean>
# Checks escape hatches in solution files, sorry sites in Comparator challenges, and permitted axioms.
# This is NOT a compile and NOT a Comparator run (no Lean toolchain in this sandbox).
set -u
D="${1:?dir}"
PAT='\bsorry\b|\badmit\b|native_decide|^\s*axiom\b|implemented_by|@\[extern|\bunsafe\b|ofReduceBool'
echo "== solution files (top level): hatches / lines / bytes"
for f in "$D"/*.lean; do printf "%s %s %s %s\n" "$(grep -cE "$PAT" "$f")" "$(wc -l <"$f")" "$(wc -c <"$f")" "$(basename "$f")"; done
echo "== challenge files: sorry sites (expected: statement stubs only)"
for f in "$D"/ComparatorChallenges/*.lean; do printf "%s %s\n" "$(grep -c '\bsorry\b' "$f")" "$(basename "$f")"; done
echo "== permitted_axioms per Comparator config"
for f in "$D"/ComparatorChallenges/*.json; do printf "%s: %s\n" "$(basename "$f")" "$(tr -d '\n ' <"$f" | grep -o '"permitted_axioms":\[[^]]*\]')"; done
echo "== toolchain"; cat "$D/lean-toolchain"
