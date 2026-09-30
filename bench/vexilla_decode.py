#!/usr/bin/env python3
"""Independent, dependency-free reference decoder for VEXILLA-⚑ wires.

Proves byte-exactness is a property of the WIRE FORMAT, not of the TypeScript
runtime: a second implementation in a different language must reconstruct the
exact original. Cross-checked against src/lib/omega/vexilla.ts.

  echo -n '<wire>' | python3 bench/vexilla_decode.py   # reads wire from stdin
  python3 bench/vexilla_decode.py --selftest           # builds + checks samples
"""
import sys

REGION_OPEN, REGION_CLOSE = "\u00B6", "\u00A7"   # ¶ §
TAG_OPEN, TAG_CLOSE = "\u00AC", "\u00A6"          # ¬ ¦
MARK, ESCAPE = "\u00B0", "\u00B1"                 # ° ±
RI_BASE = 0x1F1E6
TAG_BLACK_FLAG = 0x1F3F4
TAG_BASE = 0xE0000
TAG_CANCEL = 0xE007F


def restore_spans(wire: str) -> str:
    out = []
    i, n = 0, len(wire)
    while i < n:
        ch = wire[i]
        if ch == REGION_OPEN:
            close = wire.find(REGION_CLOSE, i + 1)
            if close != -1:
                inner = wire[i + 1:close]
                if len(inner) >= 2 and len(inner) % 2 == 0 and inner.isascii() and inner.isupper() and inner.isalpha():
                    out.append("".join(chr(RI_BASE + (ord(c) - 65)) for c in inner))
                    i = close + 1
                    continue
            out.append(ch); i += 1; continue
        if ch == TAG_OPEN:
            close = wire.find(TAG_CLOSE, i + 1)
            if close != -1:
                inner = wire[i + 1:close]
                if len(inner) > 0 and all(0x20 <= ord(c) <= 0x7E for c in inner):
                    s = chr(TAG_BLACK_FLAG) + "".join(chr(TAG_BASE + ord(c)) for c in inner) + chr(TAG_CANCEL)
                    out.append(s); i = close + 1; continue
            out.append(ch); i += 1; continue
        out.append(ch); i += 1
    return "".join(out)


def decode(wire: str) -> str:
    if not wire:
        return wire
    if wire[0] == MARK:
        return restore_spans(wire[1:])
    if wire[0] == ESCAPE:
        return wire[1:]
    return wire


def _flag(cc):  # helper for selftest
    return "".join(chr(RI_BASE + ord(c) - 65) for c in cc.upper())


def _tag(sub):
    return chr(TAG_BLACK_FLAG) + "".join(chr(TAG_BASE + ord(c)) for c in sub) + chr(TAG_CANCEL)


def selftest():
    cases = [
        (MARK + REGION_OPEN + "USJP" + REGION_CLOSE, _flag("US") + _flag("JP")),
        (MARK + "X " + TAG_OPEN + "gbsct" + TAG_CLOSE + " Y", "X " + _tag("gbsct") + " Y"),
        (MARK + REGION_OPEN + "GB" + REGION_CLOSE + " and " + TAG_OPEN + "gbwls" + TAG_CLOSE,
         _flag("GB") + " and " + _tag("gbwls")),
        (ESCAPE + MARK + "literal", MARK + "literal"),
        ("plain text no mark", "plain text no mark"),
        (MARK + "note " + REGION_OPEN + "us" + REGION_CLOSE + " lowercase stays",
         "note " + REGION_OPEN + "us" + REGION_CLOSE + " lowercase stays"),
    ]
    bad = 0
    for wire, want in cases:
        got = decode(wire)
        ok = got == want
        bad += not ok
        print(("ok  " if ok else "FAIL") + "  " + repr(wire[:40]))
    print("PASS" if bad == 0 else f"{bad} FAILURES")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest()
    else:
        sys.stdout.write(decode(sys.stdin.read()))
