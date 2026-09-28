#!/usr/bin/env python3
"""
THIRD, EXTERNAL IMPLEMENTATION OF THE PROCRUSTES READER.

Written independently from the generated contract prose
(procrustesTailInstruction's clauses in src/lib/omega/procrustes.ts) plus
reuse of the existing, separately-verified CHIRON reader
(bench/chiron_decode.py) for the inner DAEDALUS/CHIRON payload. This file
shares no restoration code with procrustes.ts; it is a from-scratch
re-derivation, run on CPython instead of Node, of the two rules the tail
instruction states in prose:

  1. after each DESTRETCH_MARK, insert one space between every character of
     the following run of ASCII letters/digits (until a non-alphanumeric
     character), delete the mark.
  2. inside each DEWIDE_OPEN...DEWIDE_CLOSE, add 0xFEE0 to every ASCII
     printable codepoint (0x21-0x7E), map a plain space (0x20) to
     U+3000 IDEOGRAPHIC SPACE, and leave every other character unchanged;
     delete the brackets.

Rule (2) is implemented here via plain Python integer arithmetic on
codepoints (ord/chr), independent of JavaScript's String.fromCodePoint
implementation in procrustes.ts — agreement between the two is evidence
that the SPECIFICATION ("add 0xFEE0") is unambiguous and portable, not an
artifact of one runtime's implementation.

Usage:
    python3 bench/procrustes_decode.py cases.json out.json

where cases.json is a list of PROCRUSTES wire strings and out.json is the
list of decoded strings.
"""
import json
import sys

sys.path.insert(0, __file__.rsplit('/', 1)[0])
import chiron_decode

MARK = "\u2605"            # BLACK STAR
ESCAPE = "\u2606"          # WHITE STAR
DESTRETCH_MARK = "\u300E"  # LEFT WHITE CORNER BRACKET
DEWIDE_OPEN = "\u3014"     # LEFT TORTOISE SHELL BRACKET
DEWIDE_CLOSE = "\u3015"    # RIGHT TORTOISE SHELL BRACKET

FULLWIDTH_LO = 0xFF01
FULLWIDTH_HI = 0xFF5E
IDEOGRAPHIC_SPACE = 0x3000
ASCII_PRINTABLE_LO = 0x21
ASCII_PRINTABLE_HI = 0x7E
ASCII_SPACE = 0x20


def is_alnum_ascii(ch):
    return ('A' <= ch <= 'Z') or ('a' <= ch <= 'z') or ('0' <= ch <= '9')


def to_fullwidth(ch):
    cp = ord(ch)
    if cp == ASCII_SPACE:
        return chr(IDEOGRAPHIC_SPACE)
    if ASCII_PRINTABLE_LO <= cp <= ASCII_PRINTABLE_HI:
        return chr(cp + 0xFEE0)
    return ch


def is_genuine_ascii_printable_or_space(ch):
    cp = ord(ch)
    return cp == ASCII_SPACE or (ASCII_PRINTABLE_LO <= cp <= ASCII_PRINTABLE_HI)


def restore_spans(s):
    out = []
    i = 0
    n = len(s)
    while i < n:
        if s[i] == DESTRETCH_MARK:
            j = i + 1
            while j < n and is_alnum_ascii(s[j]):
                j += 1
            out.append(' '.join(s[i + 1:j]))
            i = j
        elif s[i] == DEWIDE_OPEN:
            close = s.find(DEWIDE_CLOSE, i + 1)
            if close == -1:
                out.append(s[i])
                i += 1
                continue
            out.append(''.join(to_fullwidth(c) for c in s[i + 1:close]))
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
