#!/usr/bin/env python3
"""
THIRD, EXTERNAL IMPLEMENTATION OF THE SYNTAGMA READER.

Written independently from the generated contract prose (syntagmaTailInstruction
in src/lib/omega/syntagma.ts) plus reuse of the existing, separately-verified
CHIRON reader (bench/chiron_decode.py) for the inner DAEDALUS/CHIRON payload.
This file shares no restoration code with syntagma.ts; it re-derives the
Unicode Hangul Syllable Composition Algorithm (UAX #15) from scratch, using
plain Python integer arithmetic (independent of the TypeScript implementation's
own arithmetic), applying the tail instruction's literal rule:

  Between HANGUL_OPEN and HANGUL_CLOSE: for each precomposed Hangul
  syllable codepoint cp, let S = cp - 0xAC00; L = 0x1100 + S // 588;
  V = 0x1161 + (S % 588) // 28; T = S % 28; emit codepoints L, V, and (if
  T > 0) 0x11A7 + T; drop the brackets.

Usage:
    python3 bench/syntagma_decode.py cases.json out.json
"""
import json
import sys

sys.path.insert(0, __file__.rsplit('/', 1)[0])
import chiron_decode

MARK = "\u27A1"
ESCAPE = "\u2B55"
HANGUL_OPEN = "\u2B50"
HANGUL_CLOSE = "\u2764"

SBASE = 0xAC00
LBASE = 0x1100
VBASE = 0x1161
TBASE = 0x11A7


def decompose_syllable(cp):
    s = cp - SBASE
    l = LBASE + s // 588
    v = VBASE + (s % 588) // 28
    t = s % 28
    out = chr(l) + chr(v)
    if t > 0:
        out += chr(TBASE + t)
    return out


def restore_spans(s):
    out = []
    i = 0
    n = len(s)
    while i < n:
        if s[i] == HANGUL_OPEN:
            close = s.find(HANGUL_CLOSE, i + 1)
            if close == -1:
                out.append(s[i])
                i += 1
                continue
            inner = s[i + 1:close]
            decoded = []
            for ch in inner:
                cp = ord(ch)
                if SBASE <= cp <= 0xD7A3:
                    decoded.append(decompose_syllable(cp))
                else:
                    decoded.append(ch)
            out.append(''.join(decoded))
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
