#!/usr/bin/env python3
"""
THIRD, EXTERNAL IMPLEMENTATION OF THE EPISTLE READER.

Written independently from the generated contract prose (epistleTailInstruction
in src/lib/omega/epistle.ts) plus reuse of the existing, separately-verified
CHIRON reader (bench/chiron_decode.py) for the inner DAEDALUS/CHIRON payload.
This file shares no restoration code with epistle.ts; it reapplies the tail
instruction's literal rule from scratch using plain Python:

  Between QP_OPEN and QP_CLOSE: for each character, compute its UTF-8 byte
  encoding; a byte <= 0x7F emits the identical ASCII character; a byte
  >= 0x80 emits "=" followed by two uppercase hex digits; drop the
  brackets.

Usage:
    python3 bench/epistle_decode.py cases.json out.json
"""
import json
import sys

sys.path.insert(0, __file__.rsplit('/', 1)[0])
import chiron_decode

MARK = "\u2103"
ESCAPE = "\u2116"
OPEN = "\u217C"
CLOSE = "\u2164"


def restore_spans(s):
    out = []
    i = 0
    n = len(s)
    while i < n:
        if s[i] == OPEN:
            close = s.find(CLOSE, i + 1)
            if close == -1:
                out.append(s[i])
                i += 1
                continue
            inner = s[i + 1:close]
            rebuilt = []
            for ch in inner:
                for b in ch.encode('utf-8'):
                    if b <= 0x7F:
                        rebuilt.append(chr(b))
                    else:
                        rebuilt.append('=%02X' % b)
            out.append(''.join(rebuilt))
            i = close + 1
        else:
            out.append(s[i])
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
