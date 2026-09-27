#!/usr/bin/env python3
"""
THIRD, EXTERNAL IMPLEMENTATION OF THE ABACUS READER.

Written independently from the generated contract prose
(abacusTailInstruction's clauses in src/lib/omega/abacus.ts) plus reuse of
the existing, separately-verified CHIRON reader (bench/chiron_decode.py) for
the inner DAEDALUS/CHIRON payload. This file shares no restoration code with
abacus.ts; it is a from-scratch re-derivation, run on CPython instead of
Node, of the two rules the tail instruction states in prose:

  1. after each NUM_MARK, comma-group the digits before any decimal point by
     3s from the right, delete NUM_MARK.
  2. inside each UNI_OPEN...UNI_CLOSE, convert accented letters to Unicode
     NFD (base letter + combining accent mark), delete the brackets.

Rule (2) is implemented here via Python's standard `unicodedata.normalize`,
the same well-defined Unicode algorithm JavaScript's `String.prototype
.normalize` implements in abacus.ts — agreement between the two is evidence
that the SPECIFICATION ("convert to NFD") is unambiguous and portable, not
an artifact of one runtime's implementation.

Usage:
    python3 bench/abacus_decode.py cases.json out.json

where cases.json is a list of ABACUS wire strings and out.json is the list
of decoded strings.
"""
import json
import sys
import unicodedata

sys.path.insert(0, __file__.rsplit('/', 1)[0])
import chiron_decode

MARK = "\u3012"      # 〒  same code point as ABACUS_MARK in abacus.ts
ESCAPE = "\u25CF"    # ●  same code point as ABACUS_ESCAPE in abacus.ts
NUM_MARK = "\u25B2"  # ▲
UNI_OPEN = "\u3008"  # 〈
UNI_CLOSE = "\u3009"  # 〉


def regroup(int_part):
    """Independent re-derivation: insert a comma every 3 digits from the
    right of the integer part."""
    out = []
    count = 0
    for ch in reversed(int_part):
        out.append(ch)
        count += 1
        if count % 3 == 0:
            out.append(',')
    result = ''.join(reversed(out))
    if result.startswith(','):
        result = result[1:]
    return result


def restore_spans(s):
    out = []
    i = 0
    n = len(s)
    while i < n:
        if s[i] == NUM_MARK:
            j = i + 1
            while j < n and (s[j].isdigit() or (s[j] == '.' and j + 1 < n and s[j + 1].isdigit())):
                j += 1
            digits = s[i + 1:j]
            dot = digits.find('.')
            if dot == -1:
                int_part, frac_part = digits, ''
            else:
                int_part, frac_part = digits[:dot], digits[dot:]
            out.append(regroup(int_part) + frac_part)
            i = j
        elif s[i] == UNI_OPEN:
            close = s.find(UNI_CLOSE, i + 1)
            if close == -1:
                out.append(s[i])
                i += 1
                continue
            out.append(unicodedata.normalize('NFD', s[i + 1:close]))
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
