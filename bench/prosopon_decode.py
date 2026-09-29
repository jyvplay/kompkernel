#!/usr/bin/env python3
"""
THIRD, EXTERNAL IMPLEMENTATION OF THE PROSOPON READER.

Written independently from the generated contract prose (prosoponTailInstruction
in src/lib/omega/prosopon.ts) plus reuse of the existing, separately-verified
CHIRON reader (bench/chiron_decode.py) for the inner DAEDALUS/CHIRON payload.
This file shares no restoration code with prosopon.ts; it re-derives the
Windows-1252 remapping table from scratch (the same publicly documented,
WHATWG-Encoding-Standard table used by every browser) and reapplies the tail
instruction's literal rule:

  Between MOJIBAKE_OPEN and MOJIBAKE_CLOSE: for each character, compute its
  UTF-8 byte encoding; for each byte in the range 0x80-0x9F, map it through
  the Windows-1252 table (listed explicitly in the tail instruction, only
  for the specific byte values actually used); every other byte value maps
  to the identical-numbered codepoint (Latin-1 identity); emit the
  resulting characters; drop the brackets.

Usage:
    python3 bench/prosopon_decode.py cases.json out.json
"""
import json
import sys

sys.path.insert(0, __file__.rsplit('/', 1)[0])
import chiron_decode

MARK = "\u20AA"
ESCAPE = "\u20B9"
OPEN = "\u2800"
CLOSE = "\u33A1"

# Full Windows-1252 upper-range (0x80-0x9F) table, independently re-derived
# from the WHATWG Encoding Standard (the same table every modern browser
# ships), not copied from prosopon.ts's own TypeScript source.
CP1252_HIGH = {
    0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
    0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160,
    0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D,
    0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022,
    0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161,
    0x9B: 0x203A, 0x9C: 0x0153, 0x9E: 0x017E, 0x9F: 0x0178,
}


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
            ok = True
            for ch in inner:
                for b in ch.encode('utf-8'):
                    if b < 0x80 or (0xA0 <= b <= 0xFF):
                        rebuilt.append(chr(b))
                    elif b in CP1252_HIGH:
                        rebuilt.append(chr(CP1252_HIGH[b]))
                    else:
                        ok = False
                        break
                if not ok:
                    break
            out.append(''.join(rebuilt) if ok else (OPEN + inner + CLOSE))
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
