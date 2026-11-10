#!/bin/sh
# RUN J — the X95 ANAKLESIS gate: the first turn since X90 that changes a file under src/lib/omega/ariadne.ts.
#
# EXPECTED, EXACTLY, AND ANY DEVIATION IS A DEFECT:
#   PASS 1 (gate,    tagstackFrontier) = 12 639, 0 lanes differing from run H
#   PASS 2 (shipped, tagstackEncode)   = 12 491, 0 lanes differing from run H
#
# WHY THIS RUN IS A TEST RATHER THAN A FORMALLY. X94 changed zero files under src/, so at the
# time run H passed, the encoder was byte-identical to what it is now. X95 ADDS A NEW ARM, so
# this run is the gate that decides whether that arm is sound: a new arm can only leave the
# gate total unchanged or raise it, and the shipped total unchanged or lower it. Anything else
# is a defect in the arm or in the wiring.
#
# RECEIPT HYGIENE. run-front-h.sh wrote bench/x86/receipts/frontier-runH.{json,log}; this
# script writes run-J names and takes run H as its comparison base, so no committed receipt is
# clobbered. front3.ts still writes a FIXED path (bench/x89/receipts/front3.json), so its
# output is moved to a run-J name and the committed pre-X90 receipt restored, then verified
# with cmp — the trap X93 recorded.
#
# OMEGA_DET=1 throughout: without it the frontier is not a function of its input (X89 §2
# measured 4 of 29 lanes drifting, total +39) and no identity claim is meaningful.
#
# THE ms IN THIS RECEIPT IS *NOT* A SPEED CLAIM. Cross-process drift on this box is ~1.6x, so
# comparing run I's ms to run H's ms is exactly the error the repo's rule forbids. Speedups are
# taken from interleaved single-process runs only.
cd /home/user/kompkernel
LANES=$(cat /tmp/lanes.txt)
echo "=== RUN J PASS 1: the gate (tagstackFrontier), expected exactly 12639, 0 lanes differing vs run H ==="
OMEGA_DET=1 X86_FRONT_OUT=bench/x86/receipts/frontier-runJ.json X86_FRONT_BASE=bench/x86/receipts/frontier-runH.json node bench/x86/front.mjs $LANES 2>&1 | tee bench/x86/receipts/frontier-runJ.log
echo "=== RUN J PASS 2: the shipped encoder (tagstackEncode), expected exactly 12491 ==="
OMEGA_DET=1 node bench/x89/front3.mjs $LANES 2>&1 | tee bench/x89/receipts/front3-runJ.log
mv bench/x89/receipts/front3.json bench/x89/receipts/front3-runJ.json
cp bench/x89/receipts/front3-preX90.json bench/x89/receipts/front3.json
cmp -s bench/x89/receipts/front3.json bench/x89/receipts/front3-preX90.json && echo "front3.json RESTORED identical to preX90" || echo "RESTORE FAILED"
echo "RUN J COMPLETE"
