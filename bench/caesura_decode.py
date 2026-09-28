#!/usr/bin/env python3
"""
THIRD, EXTERNAL IMPLEMENTATION OF THE CAESURA READER.

Written independently from the generated contract prose (caesuraTailInstruction
in src/lib/omega/caesura.ts) plus reuse of the existing, separately-verified
CHIRON reader (bench/chiron_decode.py) for the inner DAEDALUS/CHIRON payload.
This file shares no restoration code with caesura.ts; it re-derives the two
rules the tail instruction states in prose:

  1. Between NBSP_OPEN and SPAN_CLOSE: replace every ASCII space with
     U+00A0 (non-breaking space); drop the brackets.
  2. Between NARROW_OPEN and SPAN_CLOSE: replace every ASCII space with
     U+202F (narrow no-break space); drop the brackets.
  3. If the flag digit (immediately after CAESURA_MARK) is '1': after every
     sentence-ending [.!?] followed by exactly one space, insert one more
     space.

Usage:
    python3 bench/caesura_decode.py cases.json out.json
"""
import json
import re
import sys

sys.path.insert(0, __file__.rsplit('/', 1)[0])
import chiron_decode

MARK = "\u2550"
ESCAPE = "\u2551"
NBSP_OPEN = "\u2580"
NARROW_OPEN = "\u2584"
SPAN_CLOSE = "\u2588"
NBSP = "\u00A0"
NARROW_NBSP = "\u202F"

SENTENCE_RE = re.compile(r'([.!?]) (?=\S|$)')


def restore_spans(s):
    out = []
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c == NBSP_OPEN or c == NARROW_OPEN:
            target = NBSP if c == NBSP_OPEN else NARROW_NBSP
            close = s.find(SPAN_CLOSE, i + 1)
            if close == -1:
                out.append(c)
                i += 1
                continue
            inner = s[i + 1:close]
            out.append(inner.replace(' ', target))
            i = close + 1
        else:
            out.append(c)
            i += 1
    return ''.join(out)


def expand_double_space(s):
    return SENTENCE_RE.sub(lambda m: m.group(1) + '  ', s)


def decode(wire):
    if wire == "":
        return wire
    first = wire[0]
    if first == MARK:
        flag = wire[1]
        rest = wire[2:]
        candidate = chiron_decode.decode(rest)
        restored = restore_spans(candidate)
        return expand_double_space(restored) if flag == '1' else restored
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
