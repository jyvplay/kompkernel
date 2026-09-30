#!/usr/bin/env python3
"""Independent reference decoder for PINAX-▦ wires (stdlib only).

Proves byte-exactness is a property of the WIRE FORMAT, not the TS runtime:
this decoder reconstructs the exact original bytes from the wire with no shared
code. Cross-checked against src/lib/omega/pinax.ts.

  echo -n '<wire>' | python3 bench/pinax_decode.py     # decode wire from stdin
  python3 bench/pinax_decode.py --selftest             # build + verify samples
"""
import re
import sys

MARK = "\u25A6"   # ▦
SHOW = "\u25C7"   # ◇
DELIM = "\t"
HEADER = re.compile(r"^\u25A6(JSONL|JSONA) n=(\d+)( nl)?$")


def decode(wire: str) -> str:
    if not wire or wire[0] != MARK:
        return wire
    nl = wire.find("\n")
    if nl == -1:
        return wire
    m = HEADER.match(wire[:nl])
    if not m:
        return wire
    kind, count, trailing_nl = m.group(1), int(m.group(2)), bool(m.group(3))
    rest = wire[nl + 1:]
    nl2 = rest.find("\n")
    template = rest if nl2 == -1 else rest[:nl2]
    body = "" if nl2 == -1 else rest[nl2 + 1:]
    rows = body.split("\n") if body else []
    if len(rows) != count:
        return wire
    parts = template.split(SHOW)
    objs = []
    for row in rows:
        vv = row.split(DELIM)
        s = ""
        for k, frag in enumerate(parts):
            s += frag
            if k < len(vv):
                s += vv[k]
        objs.append(s)
    if kind == "JSONL":
        return "\n".join(objs) + ("\n" if trailing_nl else "")
    return "[" + ",".join(objs) + "]"


def selftest():
    cases = [
        (
            MARK + 'JSONL n=3\n{"ts":' + SHOW + ',"level":"info","user":"' + SHOW + '"}\n'
            + "1727704981\tu0\n1727704982\tu1\n1727704983\tu2",
            '{"ts":1727704981,"level":"info","user":"u0"}\n'
            '{"ts":1727704982,"level":"info","user":"u1"}\n'
            '{"ts":1727704983,"level":"info","user":"u2"}',
        ),
        (
            MARK + 'JSONL n=2 nl\n{"a":' + SHOW + ',"b":"x"}\n1\n2',
            '{"a":1,"b":"x"}\n{"a":2,"b":"x"}\n',
        ),
        (
            MARK + 'JSONA n=2\n{"id":' + SHOW + ',"ok":true}\n0\n1',
            '[{"id":0,"ok":true},{"id":1,"ok":true}]',
        ),
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
