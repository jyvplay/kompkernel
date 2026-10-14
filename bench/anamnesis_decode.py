#!/usr/bin/env python3
"""ANAMNESIS — independent CPython reader.

This is a SECOND implementation, in another language, in another process, written
from the wire format rather than from the TypeScript encoder. It exists so the
round-trip claim does not rest on the encoder checking its own homework: the
cross-check script feeds it the wires and diffs its output against the sources.

Usage
    python3 bench/anamnesis_decode.py session.jsonl [--outdir DIR]
    python3 bench/anamnesis_decode.py --selftest

Input: JSONL, one object per chat message, in order, with at least {"wire": "..."}.
Output: one file per message, `msg_<i>.txt`, containing the decoded text.

Wire format (what the reader is told in the first message's contract)
    §<tape>¶<body>
      tape   = (letter text)*   — a letter from the script alphabet starts a rule;
                                  its text runs to the next letter not seen before
      body   = text in which every rule letter expands, repeatedly, to its text
    «head·tail»                   — copy from the earlier DECODED chat text: start at
                                    the first occurrence of `head` at or after the
                                    reader's cursor, run to the end of the first
                                    `tail` after it, and move the cursor there.
    Rules defined in an earlier message stay in force. A letter that was already
    defined earlier is a reference, never a new rule, which is how the reader tells
    this message's tape apart from the dictionary it already knows.
"""

import json
import os
import sys

CHIRON_START = "\u00a7"   # §
CHIRON_SEP = "\u00b6"     # ¶
COPY_OPEN = "\u00ab"      # «
COPY_CLOSE = "\u00bb"     # »
COPY_ELL = "\u00b7"       # ·

# The script alphabets, exactly as src/lib/omega/chiron.ts declares them. The
# first tape character identifies the alphabet.
SCRIPTS = [
    ("hangul", [(0xAC00, 0xD7A4)]),
    ("katakana", [(0x30A0, 0x3100)]),
    ("cyrillic", [(0x0400, 0x0500)]),
    ("arabic", [(0x0600, 0x0700)]),
    ("myanmar", [(0x1000, 0x10A0)]),
    ("khmer", [(0x1780, 0x1800)]),
    ("cjk", [(0x4E00, 0xA000)]),
]


def in_script(ranges, cp):
    return any(a <= cp < b for a, b in ranges)


def script_of(ch):
    if not ch:
        return None
    cp = ord(ch)
    for name, ranges in SCRIPTS:
        if in_script(ranges, cp):
            return ranges
    return None


def parse_tape(tape, prior_glyphs):
    """-> list[(glyph, text)] for the rules THIS tape defines, or None if malformed."""
    if not tape:
        return []
    ranges = script_of(tape[0])
    if ranges is None:
        return None
    out = []
    seen = set()
    i = 0
    n = len(tape)
    while i < n:
        gl = tape[i]
        if not in_script(ranges, ord(gl)) or gl in prior_glyphs or gl in seen:
            return None
        seen.add(gl)
        j = i + 1
        while j < n:
            ch = tape[j]
            if in_script(ranges, ord(ch)) and ch not in prior_glyphs and ch not in seen:
                break
            j += 1
        out.append((gl, tape[i + 1:j]))
        i = j
    return out


def expand(body, table, limit=64):
    """Expand every rule letter, repeatedly, to a fixed point."""
    cur = body
    for _ in range(limit):
        nxt = []
        changed = False
        for ch in cur:
            t = table.get(ch)
            if t is None:
                nxt.append(ch)
            else:
                nxt.append(t)
                changed = True
        cur = "".join(nxt)
        if not changed:
            return cur
    return None


def expand_copies(wire, context):
    """Exact inverse of the encoder's anchored copies."""
    out = []
    p = 0
    cursor = 0
    n = len(wire)
    while p < n:
        o = wire.find(COPY_OPEN, p)
        if o < 0:
            out.append(wire[p:])
            break
        out.append(wire[p:o])
        c = wire.find(COPY_CLOSE, o + 1)
        if c < 0:
            return None
        body = wire[o + 1:c]
        e = body.find(COPY_ELL)
        if e < 0:
            return None
        head, tail = body[:e], body[e + 1:]
        a = context.find(head, cursor)
        if a < 0:
            return None
        b = context.find(tail, a + len(head))
        if b < 0:
            return None
        end = b + len(tail)
        out.append(context[a:end])
        cursor = end
        p = c + 1
    return "".join(out)


def decode_message(wire, prior_rules, prior_text):
    """prior_rules: list[(glyph, text)] learned from earlier messages.
    prior_text: the earlier decoded messages joined with '\\n'."""
    context = prior_text
    if not wire.startswith(CHIRON_START):
        return expand_copies(wire, context) if context else wire
    cut = wire.find(CHIRON_SEP, 1)
    if cut < 0:
        return None
    own_tape = wire[1:cut]
    body = wire[cut + 1:]
    prior_glyphs = {g for g, _ in prior_rules}
    own = parse_tape(own_tape, prior_glyphs)
    if own is None:
        return None
    own_glyphs = {g for g, _ in own}

    # transitive closure of the earlier rules this message needs
    by_glyph = dict(prior_rules)
    want = set()
    queue = []

    def scan(t):
        for g, _ in prior_rules:
            if g not in want and g in t:
                want.add(g)
                queue.append(g)

    scan(body)
    scan(own_tape)
    while queue:
        g = queue.pop()
        t = by_glyph.get(g)
        if t is not None:
            scan(t)

    table = {}
    for g, t in prior_rules:
        if g in want:
            table[g] = t
    for g, t in own:
        table[g] = t

    text = expand(body, table)
    if text is None:
        return None
    return expand_copies(text, context) if context else text


def new_rules_of(wire, prior_rules):
    """The rules a reader adds to its table after reading this wire."""
    if not wire.startswith(CHIRON_START):
        return []
    cut = wire.find(CHIRON_SEP, 1)
    if cut < 0:
        return []
    own = parse_tape(wire[1:cut], {g for g, _ in prior_rules})
    return own or []


def selftest():
    # a two-message session with a nested rule, a recollected rule and a copy
    m0 = "\u00a7\u4e01abc\u5927\u4e01def\u00b6\u4e01\u5927\u4e01"
    prior = []
    d0 = decode_message(m0, prior, "")
    assert d0 == "abc" + "abcdef" + "abc", d0
    rules = new_rules_of(m0, prior)
    assert [g for g, _ in rules] == ["\u4e01", "\u5927"], rules
    src = "abcabcdefabc"
    # message 2 recollects 大 and copies a span of message 1's decoded text
    m1 = "\u00a7\u7f51xyz\u00b6\u7f51\u5927\u00ababc\u00b7abc\u00bb"
    d1 = decode_message(m1, rules, src)
    # the copy runs from the first "abc" (offset 0) to the end of the next "abc"
    # (offset 3..6), so it reproduces "abcabc", not "abc"
    assert d1 == "xyz" + "abcdef" + "abcabc", d1
    # malformed input is refused, never guessed
    assert decode_message("\u00a7\u4e01abc", [], "") is None
    assert decode_message("\u00a7\u4e01abc\u00b6\u00abq\u00b7z\u00bb", [], "nothing here") is None
    print("anamnesis_decode.py selftest OK (nested rule, recollected rule, anchored copy, 2 refusals)")


def main(argv):
    if "--selftest" in argv:
        selftest()
        return 0
    if len(argv) < 2:
        print(__doc__)
        return 2
    path = argv[1]
    outdir = None
    if "--outdir" in argv:
        outdir = argv[argv.index("--outdir") + 1]
    rules = []
    texts = []
    failures = 0
    with open(path, encoding="utf-8") as fh:
        for i, line in enumerate(fh):
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            wire = obj["wire"]
            decoded = decode_message(wire, rules, "\n".join(texts))
            if decoded is None:
                print("DECODE FAILED at message %d" % i, file=sys.stderr)
                failures += 1
                continue
            rules.extend(new_rules_of(wire, rules))
            texts.append(decoded)
            if outdir:
                with open(os.path.join(outdir, "msg_%02d.txt" % i), "w", encoding="utf-8") as out:
                    out.write(decoded)
            else:
                sys.stdout.write(decoded)
    if failures:
        print("%d message(s) failed to decode" % failures, file=sys.stderr)
        return 1
    print("decoded %d message(s), %d rule(s) in the cumulative table" % (len(texts), len(rules)), file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
