#!/usr/bin/env python3
"""
AETOS independent self-decode receipt (X25).

Deliberately written from the SPEC, not from the TypeScript. It imports nothing
from the repository and re-implements, from scratch:

  1. chiron decode  -- the parent (POLYTROPOS) wire format
  2. aetos uncollapse -- the X25 learned separator lattice

then checks the reconstruction byte-for-byte against the original file.

Two things make this a real receipt rather than a restatement of the encoder:

  * The shape set is NOT passed in by the test harness. The decoder is handed
    only (wire, contract) -- i.e. exactly what a bare LLM sees in one chat
    message -- and must PARSE the "Numbers: expand N digits to <pattern>."
    clause to discover which shapes to apply. If the clause is unparseable or
    ambiguous the decoder raises.
  * Patterns are expanded by a general rule, not by a lookup table of the two
    PSEPHOS formats. A pattern is a token string: a run of identical letters is
    a digit group of that length, and everything between two groups is the
    literal separator. So "YYYY-MM-DD" -> groups (4,2,2) separators ('-','-'),
    "HH:MM:SS" -> (2,2,2) (':',':'), "YYYY-MM-DDTHH:MM:SS" -> (4,2,2,2,2,2)
    ('-','-','T',':',':'), and the LEARNED form "d.dd.d" -> (1,2,1) ('.','.'),
    because there 'd' is the letter and '.' is the separator. One rule covers
    the fixed tier and the learned tier.
"""
import json
import os
import re
import sys

START = "§"   # U+00A7
SEP = "¶"     # U+00B6
REP = "×"     # U+00D7
LIST = "…"    # U+2026

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
                % (raw[0],))
        v = expand(raw, idx)
        cache[idx] = v
        return v

    def expand(s, upto):
        out = []
        for ch in s:
            at = index.get(ch)
            if at is None or at >= upto:
                if at is not None and at >= upto:
                    raise ValueError("forward reference to glyph %r" % ch)
                out.append(ch)
                continue
            out.append(value_of(at))
        return "".join(out)

    return expand(body, len(rules))


# --------------------------------------------------------------- the contract

def parse_contract(contract):
    """Read the 'Numbers: expand ...' sentence out of the contract.

    Returns a list of dicts: {len, groups, seps, mode, sentinel}.
    Raises if the sentence is present but unparseable.
    """
    m = re.search(r"Numbers:\s*expand\s+([^.]+)\.\s*(.*)$", contract)
    if not m:
        return []
    body, rest = m.group(1), m.group(2)
    out = []
    for piece in body.split(", "):
        pm = re.match(r"^(\d+)\s+digits?\s+to\s+(\S+)$", piece.strip())
        if not pm:
            raise ValueError("unparseable contract fragment: %r" % piece)
        n, pattern = int(pm.group(1)), pm.group(2)
        groups, seps = parse_pattern(pattern)
        if sum(groups) != n:
            raise ValueError(
                "contract says %d digits but pattern %r has %d"
                % (n, pattern, sum(groups)))
        out.append({"len": n, "groups": groups, "seps": seps,
                    "mode": "plain", "sentinel": ""})
    # sentinel clauses, if any
    for sm in re.finditer(
            r"A\s+(\S)\s+(before|after)\s+digits\s+means\s+(expand|leave)\s+them;\s*"
            r"drop\s+the\s+\S+\.", rest):
        for f in out:
            f["mode"] = "mark" if sm.group(2) == "before" else "escape"
            f["sentinel"] = sm.group(1)
    seen = [f["len"] for f in out]
    if len(seen) != len(set(seen)):
        raise ValueError("contract declares two patterns of the same width")
    return out


def parse_pattern(pattern):
    """Turn a contract pattern into (group widths, separators).

    Two forms are recognised, and the choice is made by the pattern itself:

      * If the pattern contains a lowercase 'd', that is the placeholder and
        EVERY other character is copied literally, character by character.
        'dddd-dd-ddTdd:dd:dd' -> ([4,2,2,2,2,2], ['-','-','T',':',':'])
        'd.dd.d'              -> ([1,2,1], ['.','.'])
        This form is the only one that survives a separator which is itself a
        letter -- the ISO 'T' -- because a letter-run parser would read
        'ddTdd' as a single 3-letter run.

      * Otherwise a maximal run of identical letters is one digit group and
        everything between two groups is the literal separator.
        'YYYY-MM-DD' -> ([4,2,2], ['-','-'])
        'HH:MM:SS'   -> ([2,2,2], [':',':'])
    """
    if not pattern:
        raise ValueError("empty pattern")
    if "d" in pattern:
        groups, seps, run = [], [], 0
        for ch in pattern:
            if ch == "d":
                run += 1
            else:
                if run:
                    groups.append(run)
                    run = 0
                if groups:
                    seps.append(ch)
        if run:
            groups.append(run)
        seps = seps[: len(groups) - 1] if groups else []
        if not groups:
            raise ValueError("pattern %r has no digit placeholder" % pattern)
        return groups, seps
    toks = re.findall(r"([A-Za-z]+)([^A-Za-z]*)", pattern)
    groups = [len(t[0]) for t in toks if t[0]]
    if not groups:
        raise ValueError("pattern %r has no digit groups" % pattern)
    seps = [t[1] for t in toks if t[0]][:-1]
    if any(len(s) != 1 for s in seps):
        raise ValueError("ambiguous multi-character separator in %r" % pattern)
    return groups, seps


def expand_digits(digits, groups, seps):
    parts = []
    at = 0
    for g in groups:
        parts.append(digits[at:at + g])
        at += g
    out = parts[0]
    for k, s in enumerate(seps):
        out += s + parts[k + 1]
    return out


# --------------------------------------------------------------- uncollapse

def digit_runs(s):
    out = []
    i, n = 0, len(s)
    while i < n:
        if s[i] in "0123456789":
            j = i
            while j < n and s[j] in "0123456789":
                j += 1
            out.append((i, j))
            i = j
        else:
            i += 1
    return out


def uncollapse(text, fmts):
    """Inverse of the AETOS collapse. Shapes applied shortest width first."""
    out = text
    for f in sorted(fmts, key=lambda x: x["len"]):
        width, mode, sent = f["len"], f["mode"], f["sentinel"]
        runs = [(a, b) for (a, b) in digit_runs(out) if b - a == width]
        edits = []
        for (a, b) in runs:
            prev_ch = out[a - 1] if a > 0 else None
            next_ch = out[b] if b < len(out) else None
            if mode == "plain":
                edits.append((a, width, expand_digits(out[a:b], f["groups"], f["seps"])))
            elif mode == "escape":
                if next_ch == sent:
                    continue
                edits.append((a, width, expand_digits(out[a:b], f["groups"], f["seps"])))
            else:  # mark
                if prev_ch != sent:
                    continue
                edits.append((a - 1, width + 1,
                              expand_digits(out[a:b], f["groups"], f["seps"])))
        buf, cur = [], 0
        for (at, dl, ins) in edits:
            if at < cur:
                continue
            buf.append(out[cur:at])
            buf.append(ins)
            cur = at + dl
        buf.append(out[cur:])
        out = "".join(buf)
    return out


def decode(message):
    """Decode a full one-chat message, exactly as a bare reader would.

    `message` is wire + "\\n" + contract. Nothing else is supplied.
    """
    if "\n" not in message:
        raise ValueError("message has no contract line")
    wire, contract = message.rsplit("\n", 1)
    fmts = parse_contract(contract)
    inner = chiron_decode(wire)          # parent grammar
    if not fmts:
        return inner
    return uncollapse(inner, fmts)


def main():
    cases = json.load(open(os.path.join(os.path.dirname(__file__), "cases.json")))
    ok = 0
    index = []
    for c in cases:
        src = open(c["file"], "r", encoding="utf-8", newline="").read()
        msg = open(c["message"], "r", encoding="utf-8", newline="").read()
        try:
            got = decode(msg)
        except Exception as e:                       # noqa: BLE001
            print("FAIL %-28s raised %s: %s" % (c["name"], type(e).__name__, e))
            index.append({"name": c["name"], "exact": False, "error": str(e)})
            continue
        exact = got == src
        print("%s %-28s shapes=%-2d bytes %d/%d" % (
            "PASS" if exact else "FAIL", c["name"],
            len(parse_contract(msg.rsplit("\n", 1)[1])), len(got), len(src)))
        index.append({"name": c["name"], "exact": exact,
                      "shapes": len(parse_contract(msg.rsplit("\n", 1)[1]))})
        ok += exact
    print("\n%d/%d byte-exact" % (ok, len(cases)))
    outdir = os.path.join(os.path.dirname(__file__), "receipts", "selfdecode")
    os.makedirs(outdir, exist_ok=True)
    with open(os.path.join(outdir, "INDEX.json"), "w") as f:
        json.dump({"cases": index, "exact": ok, "total": len(cases)}, f, indent=2)
    return 0 if ok == len(cases) else 1


if __name__ == "__main__":
    sys.exit(main())
