#!/usr/bin/env python3
# Independent CPython reference decoder for STOICHEIA-Σ.
# Implemented from the wire contract, NOT shared with the TypeScript source.
# Reads a STOICHEIA wire from stdin (UTF-8), writes the exact original to stdout.
import sys

OPEN = "\u2020"   # †
CLOSE = "\u2021"  # ‡
MARK = "\u203B"   # ※ applied
ESCAPE = "\u00A4"  # ¤ escaped

# family code -> (U base for 'A', L base for 'a', D base for '0' or None)
FAM = {
    "b": (0x1D400, 0x1D41A, 0x1D7CE),
    "t": (0x1D434, 0x1D44E, None),
    "x": (0x1D468, 0x1D482, None),
    "c": (0x1D49C, 0x1D4B6, None),
    "C": (0x1D4D0, 0x1D4EA, None),
    "f": (0x1D504, 0x1D51E, None),
    "d": (0x1D538, 0x1D552, 0x1D7D8),
    "F": (0x1D56C, 0x1D586, None),
    "s": (0x1D5A0, 0x1D5BA, 0x1D7E2),
    "S": (0x1D5D4, 0x1D5EE, 0x1D7EC),
    "z": (0x1D608, 0x1D622, None),
    "Z": (0x1D63C, 0x1D656, None),
    "m": (0x1D670, 0x1D68A, 0x1D7F6),
}
HOLES = {
    "t": {"h": 0x210E},
    "c": {"B": 0x212C, "E": 0x2130, "F": 0x2131, "H": 0x210B, "I": 0x2110,
          "L": 0x2112, "M": 0x2133, "R": 0x211B, "e": 0x212F, "g": 0x210A, "o": 0x2134},
    "f": {"C": 0x212D, "H": 0x210C, "I": 0x2111, "R": 0x211C, "Z": 0x2128},
    "d": {"C": 0x2102, "H": 0x210D, "N": 0x2115, "P": 0x2119, "Q": 0x211A, "R": 0x211D, "Z": 0x2124},
}


def styled_cp(code, ch):
    if code not in FAM:
        return -1
    hole = HOLES.get(code, {}).get(ch)
    if hole is not None:
        return hole
    U, L, D = FAM[code]
    o = ord(ch)
    if 65 <= o <= 90:
        return U + (o - 65)
    if 97 <= o <= 122:
        return L + (o - 97)
    if 48 <= o <= 57 and D is not None:
        return D + (o - 48)
    return -1


def decode(wire):
    out = []
    i = 0
    n = len(wire)
    while i < n:
        ch = wire[i]
        if ch == OPEN:
            code = wire[i + 1] if i + 1 < n else None
            close = wire.find(CLOSE, i + 2)
            if code is None or code not in FAM or close == -1:
                out.append(ch)
                i += 1
                continue
            inner = wire[i + 2:close]
            ok = len(inner) > 0
            rebuilt = []
            for c in inner:
                cp = styled_cp(code, c)
                if cp < 0:
                    ok = False
                    break
                rebuilt.append(chr(cp))
            if not ok:
                out.append(ch)
                i += 1
                continue
            out.append("".join(rebuilt))
            i = close + 1
        else:
            out.append(ch)
            i += 1
    return "".join(out)


def decode_wire(wire):
    if len(wire) == 0:
        return wire
    if wire[0] == MARK:
        return decode(wire[1:])
    if wire[0] == ESCAPE:
        return wire[1:]
    return wire


if __name__ == "__main__":
    data = sys.stdin.buffer.read().decode("utf-8")
    sys.stdout.buffer.write(decode_wire(data).encode("utf-8"))
