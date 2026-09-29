#!/usr/bin/env python3
"""
THIRD, EXTERNAL IMPLEMENTATION OF THE ORTHOS READER.

Written independently from the generated contract prose (ORTHOS_TAIL_INSTRUCTION
in src/lib/omega/orthos.ts) plus reuse of the existing, separately-verified
CHIRON reader (bench/chiron_decode.py) for the inner DAEDALUS/CHIRON payload.
This file shares no apostrophe-reconstruction code with orthos.ts; it is a
from-scratch re-derivation of the same "smart punctuation" rule from prose,
run on CPython instead of Node, so agreement is evidence about the
SPECIFICATION, not about one implementation.

Usage:
    python3 bench/orthos_decode.py cases.json out.json

where cases.json is a list of ORTHOS wire strings and out.json is the list of
decoded strings.
"""
import json
import sys

sys.path.insert(0, __file__.rsplit('/', 1)[0])
import chiron_decode

MARK = "\u2666"    # same code point as ORTHOS_MARK in orthos.ts
ESCAPE = "\u00d8"  # same code point as ORTHOS_ESCAPE in orthos.ts

OPEN_CONTEXT = set(" \t\n\r([{-\u2014\u2013\"\u201c'\u2018")


def re_smart(s):
    """Independent re-derivation of the apostrophe pass described in
    ORTHOS_TAIL_INSTRUCTION: left to right, using already-written OUTPUT
    (not input) as the "previous character" test."""
    out = []
    for c in s:
        if c == "'":
            prev = out[-1] if out else None
            if prev is None or prev in OPEN_CONTEXT:
                out.append("\u2018")
            else:
                out.append("\u2019")
        else:
            out.append(c)
    return "".join(out)


def decode(wire):
    if wire == "":
        return wire
    first = wire[0]
    if first == MARK:
        rest = wire[1:]
        candidate = chiron_decode.decode(rest)
        return re_smart(candidate)
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
