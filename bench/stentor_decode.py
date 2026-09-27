#!/usr/bin/env python3
"""
THIRD, EXTERNAL IMPLEMENTATION OF THE STENTOR READER.

Written independently from the generated contract prose (STENTOR_TAIL_INSTRUCTION
in src/lib/omega/stentor.ts) plus reuse of the existing, separately-verified
CHIRON reader (bench/chiron_decode.py) for the inner DAEDALUS/CHIRON payload.
This file shares no case-restoration code with stentor.ts; it is a
from-scratch re-derivation of the same "find bracketed span, upper-case it,
delete the brackets" rule from prose, run on CPython instead of Node, so
agreement is evidence about the SPECIFICATION, not about one implementation.

Usage:
    python3 bench/stentor_decode.py cases.json out.json

where cases.json is a list of STENTOR wire strings and out.json is the list of
decoded strings.
"""
import json
import sys

sys.path.insert(0, __file__.rsplit('/', 1)[0])
import chiron_decode

MARK = "\u300A"    # 《  same code point as STENTOR_MARK in stentor.ts
ESCAPE = "\u300B"  # 》  same code point as STENTOR_ESCAPE in stentor.ts
SHOUT_OPEN = "\u3010"   # 【
SHOUT_CLOSE = "\u3011"  # 】


def restore_spans(s):
    """Independent re-derivation of the span-restoration pass described in
    STENTOR_TAIL_INSTRUCTION: left to right, find SHOUT_OPEN..SHOUT_CLOSE,
    upper-case the interior, delete both markers. Unmatched open markers are
    left untouched (total, never raises)."""
    out = []
    i = 0
    n = len(s)
    while i < n:
        if s[i] == SHOUT_OPEN:
            close = s.find(SHOUT_CLOSE, i + 1)
            if close == -1:
                out.append(s[i])
                i += 1
                continue
            out.append(s[i + 1:close].upper())
            i = close + 1
        else:
            out.append(s[i])
            i += 1
    return "".join(out)


def decode(wire):
    if wire == "":
        return wire
    first = wire[0]
    if first == MARK:
        rest = wire[1:]
        candidate = chiron_decode.decode(rest)
        return restore_spans(candidate)
    if first == ESCAPE:
        rest = wire[1:]
        return chiron_decode.decode(rest)
    return chiron_decode.decode(wire)


def main():
    with open(sys.argv[1], encoding="utf-8") as f:
        cases = json.load(f)
    out = []
    for wire in cases:
        try:
            out.append(decode(wire))
        except Exception:
            out.append(None)
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)


if __name__ == "__main__":
    main()
