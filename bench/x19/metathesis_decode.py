#!/usr/bin/env python3
"""X19 — METATHESIS reference reader.

This is an INDEPENDENT reader: it is given only the printed METATHESIS sentence
and the column-major text that the arm's own decoder produced, and it rebuilds
the row-major table. It never sees a plan object, a side channel, or any state
from the encoder. If this script reproduces the original bytes, then the
sentence really does carry everything a reader needs — which is the part of
"a language model can decode this from one chat message" that can be checked
mechanically.

usage:
    python3 bench/x19/metathesis_decode.py <message-file> <expected-file>

The message file is the full one-chat message (arm contract + wire + the
METATHESIS sentence). Only the final sentence is read here; expanding the
CHIRON wire is the arm's job, and that arm is unchanged.
"""
import re
import sys


def parse_sentence(s: str):
    """Pull (rows, widths, right_aligned, delim) out of the English sentence."""
    m = re.search(r"Column-major,\s*(\d+)\s*lines\s*(?:/|per\s+)column", s)
    if not m:
        raise SystemExit("no METATHESIS sentence found")
    rows = int(m.group(1))

    # delimited form: joined with ","  /  a tab  /  "|"  /  ";"
    d = re.search(r'''joined with\s+(?:a comma|a tab|","|"\|"|";")''', s)
    if d:
        tok = d.group(0)
        delim = {"a comma": ",", "a tab": "\t"}.get(
            tok.split("joined with ", 1)[1], tok.split("joined with ", 1)[1].strip('"')
        )
        return rows, None, set(), delim

    # fixed-width form: widths 35/5, col2 right, 1 space between, last bare
    w = re.search(r"widths\s+([0-9/]+)", s)
    if not w:
        raise SystemExit("cannot read column widths from the sentence")
    widths = [int(x) for x in w.group(1).split("/")]
    right = set()
    r = re.search(r"col([0-9,]+)\s+right", s)
    if r:
        right = {int(x) for x in r.group(1).split(",")}
    return rows, widths, right, None


def untranspose(text: str, rows: int, widths, right, delim) -> str:
    lines = text.split("\n")
    trailing = lines and lines[-1] == ""
    flat = lines[: len(lines) - 1] if trailing else lines
    cols = len(flat) // rows
    if len(flat) % rows:
        raise SystemExit(f"{len(flat)} lines is not a whole number of {rows}-line columns")

    out = []
    for i in range(rows):
        cells = [flat[c * rows + i] for c in range(cols)]
        if delim is not None:
            out.append(delim.join(cells))
        else:
            s = ""
            for c, cell in enumerate(cells):
                if c == len(cells) - 1:      # last column is bare
                    s += cell
                    break
                w = widths[c]
                pad = " " * max(0, w - len(cell))
                s += (pad + cell) if (c + 1) in right else (cell + pad)
                s += " "                     # one space between columns
            out.append(s)
    return "\n".join(out) + ("\n" if trailing else "")


def main() -> int:
    msg = open(sys.argv[1], "r", newline="").read()
    want = open(sys.argv[2], "r", newline="").read()

    # the METATHESIS sentence is the last line of the message; everything above
    # it is the arm's own contract and wire, which the arm decodes first.
    lines = msg.split("\n")
    while lines and not lines[-1].strip():
        lines.pop()
    sentence = lines[-1]
    body = "\n".join(lines[:-1])

    rows, widths, right, delim = parse_sentence(sentence)

    # Stand-in for the arm's CHIRON decode: the harness hands us the arm output
    # in <file>.arm when it ran; otherwise we accept the body verbatim.
    arm_path = sys.argv[1] + ".arm"
    try:
        body = open(arm_path, "r", newline="").read()
    except OSError:
        pass

    got = untranspose(body, rows, widths, right, delim)
    if got == want:
        print(f"OK   rows={rows} cols={len(want.splitlines()[0].split(delim)) if delim else len(widths)+1} "
              f"{'delim=' + repr(delim) if delim else 'widths=' + str(widths)}")
        return 0
    print("MISMATCH")
    import difflib
    d = list(difflib.unified_diff(want.splitlines(True), got.splitlines(True), "want", "got", n=1))
    print("".join(d[:40]))
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
