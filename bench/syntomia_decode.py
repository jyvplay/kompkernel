#!/usr/bin/env python3
"""
bench/syntomia_decode.py
=============================================================================
INDEPENDENT SYNTOMIA READER — written from the SHIPPED CONTRACT PROSE only,
not from the TypeScript source.  Its purpose is to be a second, differently
implemented witness that the 24-token contract SYNTOMIA ships is actually
sufficient to decode the wire.

The contract SYNTOMIA emits for a rules-only wire is, verbatim:

    "Before ¶ a new foreign letter labels text up to the next new letter.
     After ¶ expand all; print result only."

(and, when a rule's text contains another rule's letter, "expand all
repeatedly".)

Everything below is a literal transcription of that sentence and nothing else:

  * split the wire at the first ¶;
  * walk the part before it; each character that is a foreign letter not seen
    before opens a rule, whose text runs to the next not-seen-before foreign
    letter (or to ¶);
  * walk the part after it; replace every rule letter by its text, repeating
    until no rule letter remains.

A "foreign letter" is taken to be any character outside Basic Latin /
Latin-1 that Unicode classifies as a letter — which is exactly what a reader
of the sentence would take it to mean.

SCOPE.  This reader implements the rules clause only.  Wires that additionally
carry the × (repeat) or … (list) operators ship extra contract clauses; those
are out of scope here and the harness does not feed them to this reader.  That
limitation is stated rather than hidden.

Usage:
    python3 bench/syntomia_decode.py WIRE_FILE               > out.txt
    python3 bench/syntomia_decode.py WIRE_FILE --check SRC
    python3 bench/syntomia_decode.py --selftest
=============================================================================
"""
import sys
import unicodedata

SEP = "\u00b6"   # ¶
START = "\u00a7"  # §


def is_foreign_letter(ch):
    """A letter that is not an ASCII / Latin-1 letter."""
    if ord(ch) < 0x0180:
        return False
    return unicodedata.category(ch) in ("Lo", "Ll", "Lu", "Lt", "Lm")


def parse(wire):
    """Return (rules, body).  rules maps letter -> text."""
    if not wire.startswith(START):
        return {}, wire
    k = wire.find(SEP)
    if k < 0:
        return {}, wire
    tape, body = wire[1:k], wire[k + 1:]

    rules = {}
    order = []
    seen = set()
    i = 0
    n = len(tape)
    while i < n:
        g = tape[i]
        if not is_foreign_letter(g) or g in seen:
            # the sentence says a NEW foreign letter opens a rule; anything
            # else here means the wire is not the shape the contract describes
            return None, None
        seen.add(g)
        j = i + 1
        while j < n and not (is_foreign_letter(tape[j]) and tape[j] not in seen):
            j += 1
        rules[g] = tape[i + 1:j]
        order.append(g)
        i = j
    return rules, body


def decode(wire):
    rules, body = parse(wire)
    if rules is None:
        return wire
    if not rules:
        return body
    out = body
    # "expand all, repeatedly"
    for _ in range(64):
        new = []
        changed = False
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


def _selftest():
    wire = START + "\u0430 the\u0431 document\u0432 policy" + SEP + \
        "A\u0432\u0430ttaches to\u0430\u0431."
    got = decode(wire)
    want = "A policy thettaches to the document."
    assert got == want, (got, want)
    # nested rule: \u0433 expands to a text containing \u0430
    wire2 = START + "\u0430 cat\u0433 big\u0430" + SEP + "X\u0433 Y\u0430"
    assert decode(wire2) == "X big cat Y cat", decode(wire2)
    print("selftest ok")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        _selftest()
        raise SystemExit(0)
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(2)
    with open(sys.argv[1], "r", encoding="utf-8", newline="") as fh:
        wire = fh.read()
    out = decode(wire)
    if "--check" in sys.argv:
        with open(sys.argv[sys.argv.index("--check") + 1], "r",
                  encoding="utf-8", newline="") as fh:
            src = fh.read()
        if out == src:
            print("EXACT")
            raise SystemExit(0)
        print("MISMATCH len(out)=%d len(src)=%d" % (len(out), len(src)))
        for k in range(min(len(out), len(src))):
            if out[k] != src[k]:
                print("first diff at %d: %r vs %r"
                      % (k, src[k - 40:k + 40], out[k - 40:k + 40]))
                break
        raise SystemExit(1)
    sys.stdout.write(out)
