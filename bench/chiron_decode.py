#!/usr/bin/env python3
"""
THIRD, EXTERNAL IMPLEMENTATION OF THE CHIRON READER.

This file is deliberately written from the generated contract prose alone:

    Every new <Script> letter before <SEP> starts a rule whose text runs to the
    next new letter or to <SEP>. In the text after <SEP> expand every rule,
    repeatedly, and print only the result.
    <REP>btn: t written n times. Any letters after n are lists; in copy i the
    k-th b is item i of list k, cycling.
    <LIST>a..b = integers a to b. Otherwise the character after <LIST>
    separates the items.

It shares no code with src/lib/omega/chiron.ts and runs on CPython, not Node,
so agreement between the two is evidence about the SPECIFICATION rather than
about one implementation.  Usage:

    python3 bench/chiron_decode.py cases.json out.json

where cases.json is a list of wire strings and out.json is the list of decoded
strings (null for anything the reader considers malformed).
"""
import json
import re
import sys

START = "\u00a7"
SEP = "\u00b6"
REP = "\u00d7"
LIST = "\u2026"

RANGES = [
    (0xAC00, 0xD7A4),  # Hangul
    (0x30A0, 0x3100),  # Katakana
    (0x0400, 0x0500),  # Cyrillic
    (0x0600, 0x0700),  # Arabic
    (0x1000, 0x10A0),  # Myanmar
    (0x1780, 0x1800),  # Khmer
    (0x4E00, 0xA000),  # CJK
]

# SIBYL's pooled alphabet: fourteen scripts read as ONE alphabet. Disjoint from
# every range above, so the first tape character still identifies the alphabet.
POLYGLOT = [
    (0x0370, 0x0400), (0x0530, 0x0590), (0x0590, 0x0600), (0x0900, 0x0980),
    (0x0980, 0x0A00), (0x0A00, 0x0A80), (0x0A80, 0x0B00), (0x0B80, 0x0C00),
    (0x0C00, 0x0C80), (0x0C80, 0x0D00), (0x0D00, 0x0D80), (0x0D80, 0x0E00),
    (0x0E00, 0x0E80), (0x10A0, 0x1100),
]

RANGE_RE = re.compile(r"^(-?\d{1,15})\.\.(-?\d{1,15})$")
LIMIT = 1 << 23


class Bad(Exception):
    pass


def script_of(ch):
    cp = ord(ch)
    for lo, hi in POLYGLOT:
        if lo <= cp < hi:
            return POLYGLOT          # the whole pooled alphabet
    for lo, hi in RANGES:
        if lo <= cp < hi:
            return [(lo, hi)]
    return None


def decode(wire):
    if not wire.startswith(START):
        return wire
    cut = wire.find(SEP, len(START))
    if cut < 0:
        return wire
    tape = wire[len(START):cut]
    body = wire[cut + len(SEP):]

    rules = []          # list of (letter, raw text)
    if tape:
        spans = script_of(tape[0])
        if spans is None:
            return wire

        def is_letter(ch):
            c = ord(ch)
            for lo, hi in spans:
                if lo <= c < hi:
                    return True
            return False

        seen = set()
        i = 0
        while i < len(tape):
            g = tape[i]
            if not is_letter(g) or g in seen:
                return wire
            seen.add(g)
            j = i + 1
            while j < len(tape) and not (is_letter(tape[j]) and tape[j] not in seen):
                j += 1
            rules.append((g, tape[i + 1:j]))
            i = j

    index = {g: k for k, (g, _) in enumerate(rules)}
    str_cache = {}
    list_cache = {}

    def as_list(k):
        if k in list_cache:
            return list_cache[k]
        raw = rules[k][1]
        if not raw.startswith(LIST):
            raise Bad("not a list")
        payload = raw[len(LIST):]
        m = RANGE_RE.match(payload)
        if m:
            a, b = int(m.group(1)), int(m.group(2))
            step = 1 if b >= a else -1
            n = abs(b - a) + 1
            if n > 1000000:
                raise Bad("range too large")
            out = [str(a + step * t) for t in range(n)]
        else:
            if not payload:
                raise Bad("empty list")
            sep = payload[0]
            out = payload[1:].split(sep)
        if not out:
            raise Bad("empty list")
        list_cache[k] = out
        return out

    def expand(text, upto):
        out = []
        for ch in text:
            k = index.get(ch)
            if k is None:
                out.append(ch)
                continue
            if k >= upto:
                raise Bad("forward reference")
            out.append(value(k))
            if sum(len(p) for p in out) > LIMIT:
                raise Bad("too big")
        return "".join(out)

    def value(k):
        if k in str_cache:
            v = str_cache[k]
            if v is None:
                raise Bad("cycle")
            return v
        str_cache[k] = None
        raw = rules[k][1]
        if raw.startswith(REP):
            v = do_rep(raw[len(REP):], k)
        elif raw.startswith(LIST):
            raise Bad("list used as text")
        else:
            v = expand(raw, k)
        str_cache[k] = v
        return v

    def do_rep(spec, self_idx):
        if len(spec) < 3:
            raise Bad("short rep")
        blank = spec[0]
        t = spec[1]
        p = 2
        digits = ""
        while p < len(spec) and spec[p].isdigit() and spec[p] in "0123456789":
            digits += spec[p]
            p += 1
        if not digits:
            raise Bad("no count")
        n = int(digits)
        if n < 1 or n > 1000000:
            raise Bad("bad count")
        lists = []
        while p < len(spec):
            k = index.get(spec[p])
            if k is None or k >= self_idx:
                raise Bad("bad list ref")
            lists.append(k)
            p += 1
        tk = index.get(t)
        if tk is None:
            tpl = t
        elif tk >= self_idx:
            raise Bad("forward template")
        else:
            tpl = value(tk)
        pieces = tpl.split(blank)
        slots = len(pieces) - 1
        if slots == 0:
            if len(tpl) * n > LIMIT:
                raise Bad("too big")
            return tpl * n
        if slots != len(lists):
            raise Bad("slot/list mismatch")
        cols = [as_list(k) for k in lists]
        out = []
        total = 0
        for i in range(n):
            out.append(pieces[0])
            total += len(pieces[0])
            for sidx in range(slots):
                col = cols[sidx]
                item = col[i % len(col)]
                out.append(item)
                out.append(pieces[sidx + 1])
                total += len(item) + len(pieces[sidx + 1])
            if total > LIMIT:
                raise Bad("too big")
        return "".join(out)

    try:
        return expand(body, len(rules))
    except Bad:
        return wire
    except RecursionError:
        return wire


def main():
    with open(sys.argv[1], encoding="utf-8") as fh:
        cases = json.load(fh)
    out = []
    for w in cases:
        try:
            out.append(decode(w))
        except Exception:
            out.append(None)
    with open(sys.argv[2], "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False)


if __name__ == "__main__":
    main()
