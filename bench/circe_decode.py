#!/usr/bin/env python3
"""
THIRD, EXTERNAL IMPLEMENTATION OF THE CIRCE READER.

Written independently from the generated contract prose (circeTailInstruction
/ invisibleGuardClause in src/lib/omega/circe.ts) plus reuse of the existing,
separately-verified CHIRON reader (bench/chiron_decode.py) for the inner
DAEDALUS/CHIRON payload. This file shares no restoration code with circe.ts;
it is a from-scratch re-derivation, run on CPython instead of Node, of the
rules the tail instructions state in prose:

  1. NAMED entity spans: NAMED_MARK + one character -> "&NAME;" where NAME is
     looked up from a small standard-HTML5-entity table (curated here
     independently, not imported from circe.ts).
  2. DECIMAL numeric spans: DEC_MARK + one character -> "&#N;" where N is the
     decimal Unicode code point of that character.
  3. HEX numeric spans: HEX_MARK + one character -> "&#xH;" where H is the
     LOWERCASE hex Unicode code point of that character.
  4. PERCENT-encoded UTF-8 spans: PCT_MARK + one character -> that
     character's UTF-8 bytes, each written "%XX" in UPPERCASE hex -- done
     here via Python's own str.encode('utf-8'), independent of the manual
     byte-arithmetic implementation in circe.ts.
  5. UNIFORM INVISIBLE-CHARACTER GUARD: a leading "INV_MARK + direction
     ('b'/'a') + 4 lowercase hex digits" prefix means: after everything else
     is decoded, insert one copy of that codepoint before ('b') or after
     ('a') every space character in the result.

Usage:
    python3 bench/circe_decode.py cases.json out.json

where cases.json is a list of CIRCE wire strings and out.json is the list of
decoded strings.
"""
import json
import sys

sys.path.insert(0, __file__.rsplit('/', 1)[0])
import chiron_decode

CIRCE_MARK = "\u25B6"     # BLACK RIGHT-POINTING TRIANGLE
CIRCE_ESCAPE = "\u25B7"   # WHITE RIGHT-POINTING TRIANGLE
NAMED_MARK = "\u221A"     # SQUARE ROOT
DEC_MARK = "\u2219"       # BULLET OPERATOR
HEX_MARK = "\u2228"       # LOGICAL OR
PCT_MARK = "\u25BD"       # WHITE DOWN-POINTING TRIANGLE
INV_MARK = "\u25CE"       # BULLSEYE

# Independently curated (not copied from NAMED_ENTITY_LIST in circe.ts) --
# same ~45 standard HTML5 named references.
NAMED_TABLE = {
    'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"', 'apos': "'",
    'nbsp': '\u00A0', 'copy': '\u00A9', 'reg': '\u00AE', 'trade': '\u2122',
    'deg': '\u00B0', 'plusmn': '\u00B1', 'times': '\u00D7', 'divide': '\u00F7',
    'micro': '\u00B5', 'sect': '\u00A7', 'para': '\u00B6', 'middot': '\u00B7',
    'laquo': '\u00AB', 'iexcl': '\u00A1', 'iquest': '\u00BF', 'euro': '\u20AC',
    'pound': '\u00A3', 'yen': '\u00A5', 'cent': '\u00A2', 'mdash': '\u2014',
    'ndash': '\u2013', 'hellip': '\u2026', 'rsquo': '\u2019', 'lsquo': '\u2018',
    'rdquo': '\u201D', 'ldquo': '\u201C', 'bull': '\u2022', 'permil': '\u2030',
    'frac12': '\u00BD', 'frac14': '\u00BC', 'frac34': '\u00BE', 'sup1': '\u00B9',
    'sup2': '\u00B2', 'sup3': '\u00B3', 'dagger': '\u2020', 'Dagger': '\u2021',
    'raquo': '\u00BB', 'larr': '\u2190', 'rarr': '\u2192', 'uarr': '\u2191', 'darr': '\u2193',
}
CHAR_TO_NAMED = {v: k for k, v in NAMED_TABLE.items()}


def restore_spans(s):
    out = []
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c == NAMED_MARK and i + 1 < n:
            ch = s[i + 1]
            name = CHAR_TO_NAMED.get(ch)
            out.append(f'&{name};' if name is not None else ch)
            i += 2
        elif c == DEC_MARK and i + 1 < n:
            cp = ord(s[i + 1])
            out.append(f'&#{cp};')
            i += 2
        elif c == HEX_MARK and i + 1 < n:
            cp = ord(s[i + 1])
            out.append(f'&#x{cp:x};')
            i += 2
        elif c == PCT_MARK and i + 1 < n:
            cp = ord(s[i + 1])
            byts = chr(cp).encode('utf-8')
            out.append(''.join(f'%{b:02X}' for b in byts))
            i += 2
        else:
            out.append(c)
            i += 1
    return ''.join(out)


def restore_invisible_guard(s, cp, direction):
    ch = chr(cp)
    if direction == 'b':
        return s.replace(' ', ch + ' ')
    return s.replace(' ', ' ' + ch)


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


def decode(wire):
    if wire == "":
        return wire
    inv = parse_invisible_prefix(wire)
    body = inv[2] if inv else wire
    if body == "":
        decoded_body = body
    else:
        first = body[0]
        if first == CIRCE_MARK:
            rest = body[1:]
            candidate = chiron_decode.decode(rest)
            decoded_body = restore_spans(candidate)
        elif first == CIRCE_ESCAPE:
            rest = body[1:]
            decoded_body = chiron_decode.decode(rest)
        else:
            decoded_body = chiron_decode.decode(body)
    if inv:
        return restore_invisible_guard(decoded_body, inv[0], inv[1])
    return decoded_body


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
