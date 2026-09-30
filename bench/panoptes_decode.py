#!/usr/bin/env python3
"""
THIRD, EXTERNAL IMPLEMENTATION OF THE PANOPTES READER.

Usage:
    python3 bench/panoptes_decode.py cases.json out.json
"""
import json
import sys

sys.path.insert(0, __file__.rsplit('/', 1)[0])
import chiron_decode
import arithmos_decode
import kallos_decode
import epistle_decode
import syntagma_decode
import prosopon_decode
import procrustes_decode
import abacus_decode
import stentor_decode
import orthos_decode
import circe_decode

PANOPTES_MARK = "\u25AC"
PANOPTES_ESCAPE = "\u25CB"

NBSP_OPEN = "\u2580"
NARROW_OPEN = "\u2584"
SPAN_CLOSE = "\u2588"


def restore_nbsp(s):
    out = []
    i = 0
    n = len(s)
    while i < n:
        if s[i] == NBSP_OPEN:
            close = s.find(SPAN_CLOSE, i + 1)
            if close == -1:
                out.append(s[i])
                i += 1
                continue
            inner = s[i + 1:close]
            out.append(inner.replace(' ', '\u00A0'))
            i = close + 1
        elif s[i] == NARROW_OPEN:
            close = s.find(SPAN_CLOSE, i + 1)
            if close == -1:
                out.append(s[i])
                i += 1
                continue
            inner = s[i + 1:close]
            out.append(inner.replace(' ', '\u202F'))
            i = close + 1
        else:
            out.append(s[i])
            i += 1
    return ''.join(out)


def restore_composed(body):
    orthos_flag = body[1]
    rest = body[2:]
    decoded = chiron_decode.decode(rest)
    decoded = stentor_decode.restore_spans(decoded)
    if orthos_flag == '1':
        decoded = orthos_decode.resmart(decoded)
    decoded = restore_nbsp(decoded)
    decoded = kallos_decode.restore_spans(decoded)
    decoded = arithmos_decode.restore_spans(decoded)
    decoded = abacus_decode.restore_spans(decoded)
    decoded = procrustes_decode.restore_spans(decoded)
    decoded = syntagma_decode.restore_spans(decoded)
    decoded = prosopon_decode.restore_spans(decoded)
    decoded = epistle_decode.restore_spans(decoded)
    decoded = circe_decode.restore_spans(decoded)
    return decoded


def decode(wire):
    if wire == "":
        return wire
    inv = circe_decode.parse_invisible_prefix(wire)
    body = inv['rest'] if inv else wire

    if body.startswith(PANOPTES_ESCAPE):
        decoded = chiron_decode.decode(body[1:])
    elif body.startswith(PANOPTES_MARK):
        decoded = restore_composed(body)
    else:
        decoded = chiron_decode.decode(body)

    if inv:
        decoded = circe_decode.restore_invisible_guard(decoded, inv['cp'], inv['direction'])
    return decoded


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
