#!/usr/bin/env python3
"""
bench/plinthos_decode.py
=============================================================================
INDEPENDENT CPYTHON READER for the PLINTHOS wire — written from the two
contract sentences, not from the TypeScript source.  This closes the gap the
KIONES report named as "the weakest link in this lane's evidence": the
transpose clause had never been checked by an independent implementation.

The two sentences shipped in the contract are:

  (1) "Before ¶ a new foreign letter labels text up to the next new letter.
       After ¶ expand all; print result only."
  (2) "◆c ... ◇ holds columns; print them as rows, fields joined by c."

Everything below is a literal transcription of those two sentences, applied in
that order.

Usage:
    python3 bench/plinthos_decode.py WIRE --check SRC
    python3 bench/plinthos_decode.py --selftest
=============================================================================
"""
import sys
import unicodedata

SEP = "\u00b6"    # ¶
START = "\u00a7"  # §
OPEN = "\u25c6"   # ◆
CLOSE = "\u25c7"  # ◇


def is_foreign_letter(ch):
    if ord(ch) < 0x0180:
        return False
    return unicodedata.category(ch) in ("Lo", "Ll", "Lu", "Lt", "Lm")


# ---- sentence (1): the CHIRON rule tape -----------------------------------
def expand_rules(wire):
    if not wire.startswith(START):
        return wire
    k = wire.find(SEP)
    if k < 0:
        return wire
    tape, body = wire[1:k], wire[k + 1:]
    rules, seen = {}, set()
    i, n = 0, len(tape)
    while i < n:
        g = tape[i]
        if not is_foreign_letter(g) or g in seen:
            return None
        seen.add(g)
        j = i + 1
        while j < n and not (is_foreign_letter(tape[j]) and tape[j] not in seen):
            j += 1
        rules[g] = tape[i + 1:j]
        i = j
    out = body
    for _ in range(64):
        new, changed = [], False
        for ch in out:
            t = rules.get(ch)
            if t is None:
                new.append(ch)
            else:
                new.append(t)
                changed = True
        out = "".join(new)
        if not changed:
            break
    return out


# ---- sentence (2): the column brackets ------------------------------------
def unzip_columns(s):
    if OPEN not in s:
        return s
    trail = s.endswith("\n")
    lines = (s[:-1] if trail else s).split("\n")
    out, i, n = [], 0, len(lines)
    while i < n:
        if not lines[i].startswith(OPEN):
            out.append(lines[i]); i += 1; continue
        sep = lines[i][len(OPEN):]
        if sep == "":
            out.append(lines[i]); i += 1; continue
        close = -1
        for k in range(i + 1, n):
            if lines[k] == CLOSE:
                close = k; break
        if close < 0:
            out.append(lines[i]); i += 1; continue
        cols = [l.split(sep) for l in lines[i + 1:close]]
        if len(cols) < 2 or any(len(c) != len(cols[0]) for c in cols):
            out.append(lines[i]); i += 1; continue
        for r in range(len(cols[0])):
            out.append(sep.join(c[r] for c in cols))
        i = close + 1
    return "\n".join(out) + ("\n" if trail else "")


def decode(wire):
    inner = expand_rules(wire)
    if inner is None:
        return wire
    return unzip_columns(inner)


def _selftest():
    w = OPEN + ",\n" + "a,c,e\n" + "b,d,f\n" + CLOSE + "\ntail\n"
    assert decode(w) == "a,b\nc,d\ne,f\ntail\n", repr(decode(w))
    # two blocks in one document
    w2 = (OPEN + ",\n1,3\n2,4\n" + CLOSE + "\nmid\n"
          + OPEN + "|\nx|z\ny|w\n" + CLOSE + "\n")
    assert decode(w2) == "1,2\n3,4\nmid\nx|y\nz|w\n", repr(decode(w2))
    # rules then columns
    w3 = START + "\u0430a," + SEP + OPEN + ",\n\u0430c\n\u0430d\n" + CLOSE
    assert decode(w3) == "a,a\nc,d", repr(decode(w3))
    print("selftest ok")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        _selftest(); raise SystemExit(0)
    with open(sys.argv[1], encoding="utf-8", newline="") as fh:
        wire = fh.read()
    out = decode(wire)
    if "--check" in sys.argv:
        with open(sys.argv[sys.argv.index("--check") + 1], encoding="utf-8", newline="") as fh:
            src = fh.read()
        if out == src:
            print("EXACT"); raise SystemExit(0)
        print("MISMATCH len(out)=%d len(src)=%d" % (len(out), len(src)))
        for k in range(min(len(out), len(src))):
            if out[k] != src[k]:
                print("first diff at %d: %r vs %r" % (k, src[k-40:k+40], out[k-40:k+40])); break
        raise SystemExit(1)
    sys.stdout.write(out)
