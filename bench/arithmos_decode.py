#!/usr/bin/env python3
"""
THIRD, EXTERNAL IMPLEMENTATION OF THE ARITHMOS READER.

Written independently from the generated contract prose (arithmosTailInstruction
in src/lib/omega/arithmos.ts) plus reuse of the existing, separately-verified
CHIRON reader (bench/chiron_decode.py) for the inner DAEDALUS/CHIRON payload.
This file shares no restoration code with arithmos.ts; it reapplies the tail
instruction's literal rule from scratch using plain Python:

  ARABIC_PREFIX followed by ascii digits d -> chr(0x0660 + int(d)).
  PERSIAN_PREFIX followed by ascii digits d -> chr(0x06F0 + int(d)).
  DEV_PREFIX followed by ascii digits d -> chr(0x0966 + int(d)).
  Drop prefixes.

Usage:
    python3 bench/arithmos_decode.py cases.json out.json
"""
import json
import sys

sys.path.insert(0, __file__.rsplit('/', 1)[0])
import chiron_decode

MARK = "\u221E"
ESCAPE = "\u2248"

ARABIC_PREFIX = "\u25BA"
PERSIAN_PREFIX = "\u25BC"
DEV_PREFIX = "\u25A0"


def restore_spans(wire):
    out = []
    i = 0
    n = len(wire)
    while i < n:
        ch = wire[i]
        if ch == ARABIC_PREFIX:
            i += 1
            digits = []
            while i < n and '0' <= wire[i] <= '9':
                digits.append(chr(0x0660 + (ord(wire[i]) - 48)))
                i += 1
            out.append(''.join(digits))
        elif ch == PERSIAN_PREFIX:
            i += 1
            digits = []
            while i < n and '0' <= wire[i] <= '9':
                digits.append(chr(0x06F0 + (ord(wire[i]) - 48)))
                i += 1
            out.append(''.join(digits))
        elif ch == DEV_PREFIX:
            i += 1
            digits = []
            while i < n and '0' <= wire[i] <= '9':
                digits.append(chr(0x0966 + (ord(wire[i]) - 48)))
                i += 1
            out.append(''.join(digits))
        else:
            out.append(ch)
            i += 1
    return ''.join(out)


def decode(wire):
    if wire == "":
        return wire
    first = wire[0]
    if first == MARK:
        rest = wire[1:]
        candidate = chiron_decode.decode(rest)
        return restore_spans(candidate)
    if first == ESCAPE:
        return chiron_decode.decode(wire[1:])
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
