#!/bin/sh
# Run G: the 29-lane frontier re-confirmation AFTER X90 wired ΣΥΜΦΥΊΑ into the X74 chain
# in src/lib/omega/tagstack.ts (admitted after PROSPHYSIS, before STOICHEION).
#
# TWO PASSES, because X90 changed two different things and they must be told apart:
#
#  PASS 1 -- the GATE, bench/x86/front.ts, which prices `tagstackFrontier`. This is the
#    control. ΣΥΜΦΥΊΑ is admitted in `tagstackEncodeUncached`'s candidate chain and NOT in
#    the frontier, so the gate must be UNCHANGED at 12 639 with 0 lanes differing from
#    run F. The point of running it is that "must be unchanged" is a claim about module
#    wiring, and wiring claims are exactly what a re-confirmation exists to test rather
#    than assert: tagstack.ts gained an import of symphyia.ts, which pulls in aither.ts and
#    bpe.ts at module scope, and any initialisation side effect would show up here.
#
#  PASS 2 -- the SHIPPED tier, bench/x89/front3.ts, which prices `tagstackEncode`, the
#    encoder a user actually gets. Run E/F gate 12 639; shipped before X90 was 12 495
#    (bench/x89/receipts/front3.json). Among the 29 gate lanes ΣΥΜΦΥΊΑ fires on exactly one,
#    ls-l-real, where it is a RIVAL of PROSPHYSIS for the same symlink relation; its other
#    two measured wins (ls-la-usrbin -19, dpkg-l-full -1) are on the X88 extra lanes and are
#    measured separately in bench/x90/receipts/run.json. So the expected shipped total is
#    12 495 minus that one lane's margin, and no lane may regress: the chain keeps the
#    minimum over candidates, so a candidate that loses is refused by construction.
#
# OMEGA_DET=1 throughout: without it the frontier is not a function of its input (X89 §2
# measured 4 of 29 lanes drifting, ls-l-real 1476 -> 1496, total +39) and no claim about
# identity or difference is meaningful.
# Never compare ms ACROSS the two passes or against run F: cross-process drift on this box
# is ~1.6x. Speed claims come from interleaved single-process runs only.
cd /home/user/kompkernel
LANES=$(cat /tmp/lanes.txt)
echo "=== RUN G PASS 1: the gate (tagstackFrontier), must be unchanged at 12639 ==="
OMEGA_DET=1 X86_FRONT_OUT=bench/x86/receipts/frontier-runG.json X86_FRONT_BASE=bench/x86/receipts/frontier-runF.json node bench/x86/front.mjs $LANES 2>&1 | tee bench/x86/receipts/frontier-runG.log
echo "=== RUN G PASS 2: the shipped encoder (tagstackEncode) ==="
# front3.ts writes a FIXED path, bench/x89/receipts/front3.json. The pre-X90 copy was saved
# to front3-preX90.json before this run; restore it afterwards so the committed X89 receipt
# (gate 12639 -> shipped 12495) is not clobbered by the X90 numbers, and keep run G's own
# output under its own name. Both are wanted: the X89 receipt is what §X89 cites, and run G
# is what §X90 cites.
OMEGA_DET=1 node bench/x89/front3.mjs $LANES 2>&1 | tee bench/x89/receipts/front3-runG.log
mv bench/x89/receipts/front3.json bench/x89/receipts/front3-runG.json
cp bench/x89/receipts/front3-preX90.json bench/x89/receipts/front3.json
echo "RUN G COMPLETE"
