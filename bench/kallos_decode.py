#!/usr/bin/env python3
"""
THIRD, EXTERNAL IMPLEMENTATION OF THE KALLOS READER.

Written independently from the generated contract prose (kallosTailInstruction
in src/lib/omega/kallos.ts) plus reuse of the existing, separately-verified
CHIRON reader (bench/chiron_decode.py) for the inner DAEDALUS/CHIRON payload.
This file shares no restoration code with kallos.ts; it reapplies the tail
instruction's literal rule from scratch using plain Python:

  Between BOLD_OPEN and BOLD_CLOSE: ascii -> Math Bold.
  Between ITALIC_OPEN and ITALIC_CLOSE: ascii -> Math Italic (h -> U+210E).
  Between MONO_OPEN and MONO_CLOSE: ascii -> Math Monospace.
  Between SANS_OPEN and SANS_CLOSE: ascii -> Math Sans-Serif.
  Drop brackets.

Usage:
    python3 bench/kallos_decode.py cases.json out.json
"""
import json
import sys

sys.path.insert(0, __file__.rsplit('/', 1)[0])
import chiron_decode

MARK = "\u2714"
ESCAPE = "\u2713"

BOLD_OPEN = "\u25C6"
BOLD_CLOSE = "\u25C7"
ITALIC_OPEN = "\u2661"
ITALIC_CLOSE = "\u2665"
MONO_OPEN = "\u2500"
MONO_CLOSE = "\u2501"
SANS_OPEN = "\u251C"
SANS_CLOSE = "\u2523"


def to_bold(ch):
    c = ord(ch)
    if 65 <= c <= 90:
        return chr(0x1D400 + (c - 65))
    if 97 <= c <= 122:
        return chr(0x1D41A + (c - 97))
    if 48 <= c <= 57:
        return chr(0x1D7CE + (c - 48))
    return ch


def to_italic(ch):
    c = ord(ch)
    if 65 <= c <= 90:
        return chr(0x1D434 + (c - 65))
    if c == 104:
        return "\u210E"
    if 97 <= c <= 122:
        return chr(0x1D44E + (c - 97))
    return ch


def to_mono(ch):
    c = ord(ch)
    if 65 <= c <= 90:
        return chr(0x1D670 + (c - 65))
    if 97 <= c <= 122:
        return chr(0x1D68A + (c - 97))
    if 48 <= c <= 57:
        return chr(0x1D7F6 + (c - 48))
    return ch


def to_sans(ch):
    c = ord(ch)
    if 65 <= c <= 90:
        return chr(0x1D5A0 + (c - 65))
    if 97 <= c <= 122:
        return chr(0x1D5BA + (c - 97))
    if 48 <= c <= 57:
        return chr(0x1D7E2 + (c - 48))
    return ch


def restore_spans(wire):
    out = []
    i = 0
    n = len(wire)
    while i < n:
        ch = wire[i]
        if ch == BOLD_OPEN:
            close = wire.find(BOLD_CLOSE, i + 1)
            if close == -1:
                out.append(ch)
                i += 1
                continue
            inner = wire[i + 1:close]
            out.append(''.join(to_bold(c) for c in inner))
            i = close + 1
        elif ch == ITALIC_OPEN:
            close = wire.find(ITALIC_CLOSE, i + 1)
            if close == -1:
                out.append(ch)
                i += 1
                continue
            inner = wire[i + 1:close]
            out.append(''.join(to_italic(c) for c in inner))
            i = close + 1
        elif ch == MONO_OPEN:
            close = wire.find(MONO_CLOSE, i + 1)
            if close == -1:
                out.append(ch)
                i += 1
                continue
            inner = wire[i + 1:close]
            out.append(''.join(to_mono(c) for c in inner))
            i = close + 1
        elif ch == SANS_OPEN:
            close = wire.find(SANS_CLOSE, i + 1)
            if close == -1:
                out.append(ch)
                i += 1
                continue
            inner = wire[i + 1:close]
            out.append(''.join(to_sans(c) for c in inner))
            i = close + 1
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
