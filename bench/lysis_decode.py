#!/usr/bin/env python3
"""Independent, dependency-free reference decoder for LYSIS-λ wires.

Proves byte-exactness is a property of the WIRE FORMAT, not the TS runtime.
Cross-checked against src/lib/omega/lysis.ts.

  echo -n '<wire>' | python3 bench/lysis_decode.py     # decode wire from stdin
  python3 bench/lysis_decode.py --selftest             # build + verify samples
"""
import sys

MARK, ESCAPE, OPEN, CLOSE = "\u00AA", "\u00BA", "\u00AB", "\u00BB"  # ª º « »


def _re_json(body: str) -> str:
    out = []
    for ch in body:
        cp = ord(ch)
        if cp < 0x80:
            out.append(ch)
        elif cp <= 0xFFFF:
            out.append("\\u%04x" % cp)
        else:
            v = cp - 0x10000
            out.append("\\u%04x\\u%04x" % (0xD800 + (v >> 10), 0xDC00 + (v & 0x3FF)))
    return "".join(out)


def _re_html(body: str) -> str:
    return "".join(ch if ord(ch) < 0x80 else "&#%d;" % ord(ch) for ch in body)


def restore(wire: str) -> str:
    out = []
    i, n = 0, len(wire)
    while i < n:
        ch = wire[i]
        if ch == OPEN and i + 1 < n and wire[i + 1] in ("J", "H"):
            scheme = wire[i + 1]
            close = wire.find(CLOSE, i + 2)
            if close != -1:
                body = wire[i + 2:close]
                out.append(_re_json(body) if scheme == "J" else _re_html(body))
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


def _jesc(s):
    o = []
    for ch in s:
        cp = ord(ch)
        if cp < 0x80: o.append(ch)
        elif cp <= 0xFFFF: o.append("\\u%04x" % cp)
        else:
            v = cp - 0x10000
            o.append("\\u%04x\\u%04x" % (0xD800 + (v >> 10), 0xDC00 + (v & 0x3FF)))
    return "".join(o)


def selftest():
    cases = [
        (MARK + OPEN + "J" + "café 你好" + CLOSE, _jesc("café 你好")),
        (MARK + OPEN + "J" + "😀🎉" + CLOSE, _jesc("😀🎉")),
        (MARK + OPEN + "H" + "café’s" + CLOSE, "caf&#233;&#8217;s"),
        (MARK + 'plain ' + OPEN + "J" + "ñ" + CLOSE + ' end', 'plain \\u00f1 end'),
        (ESCAPE + MARK + "x", MARK + "x"),
        ("no mark here", "no mark here"),
    ]
    bad = 0
    for wire, want in cases:
        got = decode(wire)
        ok = got == want
        bad += not ok
        print(("ok  " if ok else "FAIL") + "  " + repr(want[:44]))
    print("PASS" if bad == 0 else f"{bad} FAILURES")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest()
    else:
        sys.stdout.write(decode(sys.stdin.read()))
