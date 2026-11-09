#!/bin/sh
# Run F: the same 29-lane frontier confirmation AFTER the X89 size-gated recalibration of
# both workmeter allowances (WORK_BUDGET_BASE/CHIRON_BUDGET_BASE halved for inputs up to
# X89_HALF_BUDGET_MAX_CHARS). The claim under test is that the gate total is still 12 639
# with 0 lanes differing from run E -- i.e. that the speed change is output-preserving on
# the whole held-out gate, not merely on the interleaved sweep that motivated it.
# Diffs lane for lane against run E; the per-lane ms give the speed delta, though the
# controlled speed claim comes from bench/x89/receipts/budget29.json (interleaved, one
# process) and NOT from comparing two processes, whose drift on this box is ~1.6x.
cd /home/user/kompkernel
OMEGA_DET=1 X86_FRONT_OUT=bench/x86/receipts/frontier-runF.json X86_FRONT_BASE=bench/x86/receipts/frontier-runE.json node bench/x86/front.mjs $(cat /tmp/lanes.txt) 2>&1 | tee bench/x86/receipts/frontier-runF.log
