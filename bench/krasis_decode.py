#!/usr/bin/env python3
"""Independent reference decoder for KRASIS-⊕ wires (stdlib unicodedata only).

Proves byte-exactness is a property of the WIRE FORMAT, not the TS runtime:
Python's unicodedata.normalize('NFD', ...) must reproduce JS String.normalize('NFD')
for every region body. Cross-checked against src/lib/omega/krasis.ts.

  echo -n '<wire>' | python3 bench/krasis_decode.py     # decode wire from stdin
  python3 bench/krasis_decode.py --selftest             # build + verify samples
"""
import sys
import unicodedata

MARK, ESCAPE, OPEN, CLOSE = "\u00A8", "\u00B8", "\u2039", "\u203A"  # ¨ ¸ ‹ ›


def restore(wire: str) -> str:
    out = []
    i, n = 0, len(wire)
    while i < n:
        ch = wire[i]
        if ch == OPEN:
            close = wire.find(CLOSE, i + 1)
            if close != -1:
                body = wire[i + 1:close]
                out.append(unicodedata.normalize("NFD", body))
                i = close + 1
                continue
        out.append(ch)
        i += 1
    return "".join(out)


def decode(wire: str) -> str:
    if not wire:
        return wire
    if wire[0] == MARK:
        return restore(wire[1:])
    if wire[0] == ESCAPE:
        return wire[1:]
    return wire


def selftest():
    nfd = lambda s: unicodedata.normalize("NFD", s)
    cases = [
        (MARK + OPEN + "안녕하세요" + CLOSE, nfd("안녕하세요")),
        (MARK + OPEN + "café résumé" + CLOSE, nfd("café résumé")),
        (MARK + "path " + OPEN + "Niño" + CLOSE + " end", "path " + nfd("Niño") + " end"),
        (MARK + OPEN + "Tiếng Việt" + CLOSE, nfd("Tiếng Việt")),
        (ESCAPE + MARK + "x", MARK + "x"),
        ("no mark here", "no mark here"),
    ]
    bad = 0
    for wire, want in cases:
        got = decode(wire)
        ok = got == want
        bad += not ok
        print(("ok  " if ok else "FAIL") + "  " + repr(want[:40]))
    print("PASS" if bad == 0 else f"{bad} FAILURES")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest()
    else:
        sys.stdout.write(decode(sys.stdin.read()))
