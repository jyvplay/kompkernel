#!/bin/sh
# RUN H — the 29-lane frontier re-confirmation AFTER X93 wired ΕΥΘΥΝΤΗΡΙΑ into workmeter.ts.
# What changed, precisely: the two size-gated search meters were DECOUPLED. The work meter
# keeps X89's verified factor 0.5 and the chiron meter drops to 0.25, both for inputs at or
# under 8 000 chars. An earlier draft of this turn shipped ONE factor 0.25 for both meters;
# that version regressed ps-aux-real 1042 -> 1053 and was withdrawn. See
# src/lib/omega/euthynteria.ts section 4 and bench/x91/receipts/decouple-sweep.json.
#
# WHAT MAKES THIS RUN A PREDICTION RATHER THAN A MEASUREMENT.
# ΕΥΘΥΝΤΗΡΙΑ changes the allowance the search runs under, not the search's output: on the 21
# small/mid lanes and the gated large lanes every setting swept produced a byte-identical
# message (SHA-256 of the complete message, 0 differing, 0 inexact). A budget bounds the
# SEARCH, not the VERIFICATION, so the only outcomes available are "identical" or "larger".
# Run H therefore has an exact expected value on both tiers and any deviation is a defect:
#
#     PASS 1 (gate,   tagstackFrontier)  must be 12 639 with 0 lanes differing from run G
#     PASS 2 (shipped, tagstackEncode)   must be 12 491 with 0 lanes differing from run G
#
# Those expected values are not hopes, they are already measured per lane: the control in
# bench/x91/receipts/decouple-sweep.json reproduces the committed frontier number on 7 of 7
# large gated lanes (1042, 886, 969, 673, 681, 862, 622) and the candidate is byte-identical
# (SHA-256 of the complete message) on all 7, plus 0 differing on the 21 small and mid lanes
# of bench/x91/receipts/chiron-sweep21.json. 28 of the 29 lanes are already accounted for;
# the 29th, ls-l-real, is outside the gate and is checked below.
#
# Pass 1 is the control that mattered last turn and matters again: workmeter.ts gained an
# import (euthynteria.ts, which imports nothing, so the acyclicity its header claimed still
# holds) and registry.ts gained an arm, taking the count to 236 unique `key:` slugs. The arm
# itself is inert with respect to both passes: tagstack.ts:15 states of the shipped encoder
# that "This is not a registry-wide tournament", so a registry arm cannot change either tier.
# That is a claim about wiring and wiring claims are what a re-confirmation exists to test. Either could in principle perturb
# module initialisation. "Should be unchanged" is a claim about wiring, and wiring claims are
# what a re-confirmation exists to test rather than assert.
#
# ONE LANE IS EXPECTED TO BE UNTOUCHED BY CONSTRUCTION AND THAT IS CHECKED, NOT ASSUMED.
# ls-l-real is 10 692 chars, above X89_HALF_BUDGET_MAX_CHARS = 8 000, so euthynteriaApplies
# returns false for it and it continues to run at factor 1. It is the only lane in 29 whose
# wire moves when the work meter is halved (X89: 1476 -> 1499), so the size gate is what keeps
# this arm off the one input known to be sensitive. bench/x91/gate-check.ts asserts the
# exclusion directly; this run asserts it end to end.
#
# OMEGA_DET=1 throughout: without it the frontier is not a function of its input (X89 §2
# measured 4 of 29 lanes drifting, total +39) and no identity claim is meaningful.
#
# THE ms IN THESE RECEIPTS IS *NOT* A SPEED CLAIM. Run G ran in a different process and
# cross-process drift on this box is ~1.6x, so comparing run H's ms to run G's ms would be
# exactly the error the repo's own rule forbids. The speedups come from interleaved
# single-process runs: 1.14x on the 7 large gated lanes (bench/x91/receipts/
# decouple-sweep.json) and 1.33x on 21 small and mid lanes (chiron-sweep21.json). The two
# are NOT added into one number because they are from different processes. Run H's
# ms is recorded because a receipt that hides the number it cannot use is worse than one that
# prints it with the caveat attached.
cd /home/user/kompkernel
LANES=$(cat /tmp/lanes.txt)
echo "=== RUN H PASS 1: the gate (tagstackFrontier), expected exactly 12639, 0 lanes differing ==="
OMEGA_DET=1 X86_FRONT_OUT=bench/x86/receipts/frontier-runH.json X86_FRONT_BASE=bench/x86/receipts/frontier-runG.json node bench/x86/front.mjs $LANES 2>&1 | tee bench/x86/receipts/frontier-runH.log
echo "=== RUN H PASS 2: the shipped encoder (tagstackEncode), expected exactly 12491 ==="
# front3.ts writes a FIXED path (bench/x89/receipts/front3.json), so move its output to a
# run-H name and restore the committed pre-X90 receipt afterwards. Both are wanted: the X89
# receipt is what §X89 cites, run G's is what §X90 cites, run H's is what §X93 cites.
OMEGA_DET=1 node bench/x89/front3.mjs $LANES 2>&1 | tee bench/x89/receipts/front3-runH.log
mv bench/x89/receipts/front3.json bench/x89/receipts/front3-runH.json
cp bench/x89/receipts/front3-preX90.json bench/x89/receipts/front3.json
echo "RUN H COMPLETE"
