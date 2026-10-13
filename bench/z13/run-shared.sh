#!/bin/bash
# z13: one shared 80-file list (bench/z11/eval-81.txt) for the 16 admissible one-chat keys. 2 workers.
cd /home/user/kompkernel
W=/home/user/z13-work
mkdir -p $W/rows
printf "%s\n" abacus amphora arithmos caesura chimera daedalus epistle icarus kanon lakonikos orthos procrustes prosopon stentor syntagma tabmin > $W/admissible16.txt
xargs -P 2 -I{} bash -c "KEY={} OUT=$W/rows/{}.jsonl WIRES=$W/wires LIST=bench/z11/eval-81.txt node $W/build/onechat.cjs > $W/rows/{}.log 2>&1; echo exit=\$? >> $W/rows/{}.log" < $W/admissible16.txt
echo ALL_DONE > $W/shared.done
