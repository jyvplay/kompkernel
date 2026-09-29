#!/usr/bin/env python3
"""
THIRD, EXTERNAL IMPLEMENTATION OF THE CHIMERA READER.

Written independently from the generated contract prose (chimeraTailInstruction
in src/lib/omega/chimera.ts) plus reuse of the existing, separately-verified
CHIRON/ORTHOS/STENTOR/ABACUS/PROCRUSTES/CIRCE readers for the inner payload.
CHIMERA's wire is one of SEVEN shapes:
  1. A bare DAEDALUS/CHIRON wire (no lane applied at all).
  2. An ORTHOS-prefixed wire (\u2666/\u00D8) -- delegate to the ORTHOS reader.
  3. A STENTOR-prefixed wire (\u300A/\u300B) -- delegate to the STENTOR reader.
  4. An ABACUS-prefixed wire (\u3012/\u25CF) -- delegate to the ABACUS reader.
  5. A PROCRUSTES-prefixed wire (\u2605/\u2606) -- delegate to the PROCRUSTES reader.
  6. A CIRCE-prefixed wire (\u25B6/\u25B7, optionally preceded by an
     invisible-guard flag \u25CE) -- delegate to the CIRCE reader.
  7. CHIMERA's OWN composed-pipeline wire: optionally an invisible-guard
     flag \u25CEDhhhh, then \u25AA/\u25AB (CHIMERA_MARK/ESCAPE). If \u25AA,
     the next character is a single digit (0/1) meaning "was ORTHOS's
     global apostrophe rule used"; decode the rest with DAEDALUS, then
     apply ABACUS's reader, then PROCRUSTES's reader, then CIRCE's reader,
     then (if the digit was 1) ORTHOS's apostrophe rule, then STENTOR's
     reader, then (if an invisible-guard flag was present) reinsert that
     codepoint before/after every space as the very last step.

Usage:
    python3 bench/chimera_decode.py cases.json out.json
"""
import json
import sys

sys.path.insert(0, __file__.rsplit('/', 1)[0])
import chiron_decode
import orthos_decode
import stentor_decode
import abacus_decode
import procrustes_decode
import circe_decode

ORTHOS_MARK = "\u2666"
ORTHOS_ESCAPE = "\u00D8"
STENTOR_MARK = "\u300A"
STENTOR_ESCAPE = "\u300B"
ABACUS_MARK = "\u3012"
ABACUS_ESCAPE = "\u25CF"
PROCRUSTES_MARK = "\u2605"
PROCRUSTES_ESCAPE = "\u2606"
CIRCE_MARK = "\u25B6"
CIRCE_ESCAPE = "\u25B7"
INV_MARK = "\u25CE"
CHIMERA_MARK = "\u25AA"
CHIMERA_ESCAPE = "\u25AB"

OPEN_CONTEXT = set(' ([{-\u2014\u2013"\u201c\'\u2018')


def orthos_resmart(s):
    out = []
    for c in s:
        if c == "'":
            prev = out[-1] if out else None
            out.append('\u2018' if (prev is None or prev in OPEN_CONTEXT) else '\u2019')
        else:
            out.append(c)
    return ''.join(out)


def parse_invisible_prefix(wire):
    if len(wire) < 6 or wire[0] != INV_MARK:
        return None
    dch = wire[1]
    if dch not in ('b', 'a'):
        return None
    hexpart = wire[2:6]
    if len(hexpart) != 4 or not all(c in '0123456789abcdef' for c in hexpart):
        return None
    return (int(hexpart, 16), dch, wire[6:])


def restore_invisible_guard(s, cp, direction):
    ch = chr(cp)
    return s.replace(' ', ch + ' ') if direction == 'b' else s.replace(' ', ' ' + ch)


def decode_composed_body(wire):
    inv = parse_invisible_prefix(wire)
    body = inv[2] if inv else wire
    if body[0] == CHIMERA_ESCAPE:
        decoded = chiron_decode.decode(body[1:])
    else:
        orthos_flag = body[1]
        rest = body[2:]
        decoded = chiron_decode.decode(rest)
        decoded = abacus_decode.restore_spans(decoded)
        decoded = procrustes_decode.restore_spans(decoded)
        decoded = circe_decode.restore_spans(decoded)
        if orthos_flag == '1':
            decoded = orthos_resmart(decoded)
        decoded = stentor_decode.restore_spans(decoded)
    if inv:
        decoded = restore_invisible_guard(decoded, inv[0], inv[1])
    return decoded


def decode(wire):
    if wire == "":
        return wire
    inv = parse_invisible_prefix(wire)
    if inv:
        if inv[2][0:1] in (CHIMERA_MARK, CHIMERA_ESCAPE):
            return decode_composed_body(wire)
        return circe_decode.decode(wire)
    first = wire[0]
    if first in (CHIMERA_MARK, CHIMERA_ESCAPE):
        return decode_composed_body(wire)
    if first in (ORTHOS_MARK, ORTHOS_ESCAPE):
        return orthos_decode.decode(wire)
    if first in (STENTOR_MARK, STENTOR_ESCAPE):
        return stentor_decode.decode(wire)
    if first in (ABACUS_MARK, ABACUS_ESCAPE):
        return abacus_decode.decode(wire)
    if first in (PROCRUSTES_MARK, PROCRUSTES_ESCAPE):
        return procrustes_decode.decode(wire)
    if first in (CIRCE_MARK, CIRCE_ESCAPE):
        return circe_decode.decode(wire)
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
