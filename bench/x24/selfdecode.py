#!/usr/bin/env python3
"""
PSEPHOS independent self-decode receipt.

This file is deliberately written from the SPEC, not from the TypeScript. It
imports nothing from the repository. It re-implements, from scratch:

  1. chiron decode  -- the parent (POLYTROPOS / LAKONIKOS / DAEDALUS) wire format
  2. psephos uncollapse -- the X24 layer

and then checks the reconstruction byte-for-byte against the original file.

Wire format, as specified:
    '§' + tape + '¶' + body
  tape is a delimiter-free sequence of (glyph, raw) pairs. The first character
  of the tape declares the script; a glyph is any code point inside that
  script's range, and its raw text is the run of characters that follows until
  the next glyph. Expansion replaces each glyph in the body with the value of
  its rule; a rule's own raw may reference earlier glyphs only (backward refs).
    raw starting with '×'  -> repetition spec
    raw starting with '…'  -> list spec
  The self-decode below raises rather than guesses if a rep/list is encountered,
  so a "success" here cannot be hiding an unimplemented operator.

Uncollapse, as specified:
  For the shipped formats, walk the maximal digit runs of the text.
    date8 : a run of exactly 8 digits is a date  YYYY-MM-DD
    time6 : a run of exactly 6 digits is a time  HH:MM:SS
  Modes disambiguate collapsed numbers from numbers that were always bare:
    plain  -- the rule above applies to every run of that width
    escape -- a run followed by the sentinel is bare (leave the digits, drop the sentinel)
    mark   -- a run preceded by the sentinel is collapsed (drop the sentinel, re-insert)
"""
import io
import json
import os
import sys

START = "§"   # U+00A7
SEP = "¶"     # U+00B6
REP = "×"     # U+00D7
LIST = "…"    # U+2026

# Ranges copied verbatim from src/lib/omega/chiron.ts CHIRON_SCRIPTS, in the same
# order, because scriptOf() latches onto the FIRST script whose range contains the
# tape's first character.
SCRIPTS = [
    ("hangul",   [(0xAC00, 0xD7A4)]),
    ("katakana", [(0x30A0, 0x3100)]),
    ("cyrillic", [(0x0400, 0x0500)]),
    ("arabic",   [(0x0600, 0x0700)]),
    ("myanmar",  [(0x1000, 0x10A0)]),
    ("khmer",    [(0x1780, 0x1800)]),
    ("cjk",      [(0x4E00, 0xA000)]),
    ("polyglot", [(0x0370, 0x0400), (0x0530, 0x0590), (0x0590, 0x0600),
                  (0x0900, 0x0980), (0x0980, 0x0A00), (0x0A00, 0x0A80),
                  (0x0A80, 0x0B00), (0x0B80, 0x0C00), (0x0C00, 0x0C80),
                  (0x0C80, 0x0D00), (0x0D00, 0x0D80), (0x0D80, 0x0E00),
                  (0x0E00, 0x0E80), (0x10A0, 0x1100)]),
]


def script_of(cp):
    for name, ranges in SCRIPTS:
        for lo, hi in ranges:
            if lo <= cp < hi:
                return name, ranges
    return None, None


def in_script(cp, ranges):
    return any(lo <= cp < hi for lo, hi in ranges)


def parse_tape(tape):
    """Split a delimiter-free tape into (glyph, raw) pairs."""
    if not tape:
        return []
    name, ranges = script_of(ord(tape[0]))
    if name is None:
        raise ValueError("tape does not start in a known script")
    out = []
    used = set()
    i = 0
    while i < len(tape):
        glyph = tape[i]
        if not in_script(ord(glyph), ranges) or glyph in used:
            raise ValueError("bad glyph %r at tape position %d" % (glyph, i))
        used.add(glyph)
        # A raw runs until the next UNUSED glyph. A glyph character that has
        # already been defined stays inside the raw it appears in -- this is the
        # one detail of the format that is easy to get backwards, and getting it
        # backwards makes almost every tape look malformed.
        j = i + 1
        while j < len(tape) and not (
            in_script(ord(tape[j]), ranges) and tape[j] not in used
        ):
            j += 1
        out.append((glyph, tape[i + 1:j]))
        i = j
    return out


def chiron_decode(wire):
    """Expand the parent's grammar. Returns the parent-level text."""
    if not wire.startswith(START):
        return wire
    cut = wire.index(SEP, len(START))
    tape = wire[len(START):cut]
    body = wire[cut + len(SEP):]
    rules = parse_tape(tape)
    index = {g: k for k, (g, _) in enumerate(rules)}
    cache = {}

    def value_of(idx):
        if idx in cache:
            if cache[idx] is None:
                raise ValueError("recursive or failed rule")
            return cache[idx]
        cache[idx] = None  # poison against recursion
        raw = rules[idx][1]
        if raw.startswith(REP) or raw.startswith(LIST):
            raise NotImplementedError(
                "wire uses the %r operator; this receipt does not implement it"
                % (raw[0],)
            )
        v = expand(raw, idx)
        cache[idx] = v
        return v

    def expand(s, upto):
        out = []
        for ch in s:
            at = index.get(ch)
            if at is None:
                out.append(ch)
                continue
            if at >= upto:
                raise ValueError("forward reference to glyph %r" % ch)
            out.append(value_of(at))
        return "".join(out)

    return expand(body, len(rules))


def digit_runs(s):
    out = []
    i = 0
    n = len(s)
    while i < n:
        if s[i].isdigit() and s[i] in "0123456789":
            j = i
            while j < n and s[j] in "0123456789":
                j += 1
            out.append((i, j))
            i = j
        else:
            i += 1
    return out


def uncollapse(text, fmt_stats):
    """Inverse of the PSEPHOS collapse. fmt_stats: [{name, mode, sentinel, enabled}]."""
    out = text
    # apply in reverse order of collapse, exactly as the encoder does
    for f in reversed(fmt_stats):
        if not f.get("enabled"):
            continue
        name = f["name"]
        mode = f.get("mode", "plain")
        sent = f.get("sentinel", "")
        width = 8 if name == "date8" else 6
        sep = (lambda d: "%s-%s-%s" % (d[0:4], d[4:6], d[6:8])) if name == "date8" \
            else (lambda d: "%s:%s:%s" % (d[0:2], d[2:4], d[4:6]))
        runs = [(a, b) for (a, b) in digit_runs(out) if b - a == width]
        edits = []  # (at, delete_len, insert)
        for (a, b) in runs:
            digits = out[a:b]
            prev_ch = out[a - 1] if a > 0 else None
            next_ch = out[b] if b < len(out) else None
            if mode == "plain":
                edits.append((a, width, sep(digits)))
            elif mode == "escape":
                if next_ch == sent:
                    continue          # bare run: leave the digits
                edits.append((a, width, sep(digits)))
            else:  # mark
                if prev_ch != sent:
                    continue          # bare run
                edits.append((a - 1, width + 1, sep(digits)))
        buf = []
        cur = 0
        for (at, dl, ins) in edits:
            if at < cur:
                continue
            buf.append(out[cur:at])
            buf.append(ins)
            cur = at + dl
        buf.append(out[cur:])
        out = "".join(buf)
        if mode == "escape" and sent:
            out = out.replace(sent, "")
    return out


def main():
    case = json.load(open(sys.argv[1], "r", encoding="utf-8"))
    wire = io.open(case["wire_path"], "r", encoding="utf-8", newline="").read()
    original = io.open(case["original_path"], "r", encoding="utf-8", newline="").read()

    order = case.get("order", "out")
    if order == "out":
        # decode = parent(uncollapse(wire))
        mid = uncollapse(wire, case["formats"])
        text = chiron_decode(mid)
    else:
        # decode = uncollapse(parent(wire))
        mid = chiron_decode(wire)
        text = uncollapse(mid, case["formats"])

    ok = text == original
    print("case                :", case["name"])
    print("order               :", order)
    print("formats             :", json.dumps(case["formats"]))
    print("wire chars          :", len(wire))
    print("decoded chars       :", len(text))
    print("original chars      :", len(original))
    print("rules in tape       :", len(parse_tape(wire[len(START):wire.index(SEP, len(START))]))
                                     if wire.startswith(START) else 0)
    print("BYTE-EXACT          :", ok)
    if not ok:
        for i, (a, b) in enumerate(zip(text, original)):
            if a != b:
                print("first divergence at char", i)
                print("  decoded :", repr(text[max(0, i - 60):i + 60]))
                print("  original:", repr(original[max(0, i - 60):i + 60]))
                break
        else:
            print("lengths differ")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
