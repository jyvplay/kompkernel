#!/usr/bin/env python3
"""
SYNTOMOS independent self-decode receipt (X28). Extended from the X26 decoder: it now accepts the shorter SYNTOMOS head as well as the X26 SYMPLOKE head, and it still re-derives every shape from the contract TEXT alone.

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
#
# SYMPLOKE braids every rule into ONE sentence, so the parser must pull the
# shape list out of a conjunct rather than out of a standalone "Numbers: ..."
# sentence. This is the parser that catches the class of bug where a shape's
# WIDTH is omitted: it refuses to guess a width, and it refuses to proceed if
# the number of widths parsed does not equal the number of patterns parsed.

# The SYMPLOKE head (X26) and the shorter SYNTOMOS head (X28). Both are
# accepted deliberately: the parser must keep working when the wording changes,
# because a wording change that silently stops parsing is invisible to the
# TypeScript round trip (which never reads the contract text at all).
SYMPLOKE_CONTRACT_RE = re.compile(
    r"Before\s*(?P<sep>.)\s*new foreign letters name text to the next\.\s*"
    r"After\s*(?P=sep)\s*expand(?:\s+repeatedly)?"
    r"(?:\s+and\s+(?P<digits>.*?))?"
    r"\s*;\s*print result only\.",
    re.S,
)

SYNTOMOS_CONTRACT_RE = re.compile(
    r"Letters\s+before\s*(?P<sep>.)\s*name the phrases after them\.\s*"
    r"Then\s+expand(?:\s+repeatedly)?"
    r"(?:\s+and\s+(?P<digits>.*?))?"
    r"\s*;\s*print result only\.",
    re.S,
)

CONTRACT_RES = [SYMPLOKE_CONTRACT_RE, SYNTOMOS_CONTRACT_RE]

SHAPE_RE = re.compile(r"(\d+)\s+digits?\s+become\s+([^,;]+)")


def parse_symploke_contract(contract):
    """Return (shapes, sentinels). shapes: [{len, groups, seps}]. Raises on ambiguity."""
    m = None
    for rx in CONTRACT_RES:
        m = rx.search(contract)
        if m:
            break
    if not m:
        raise ValueError(
            "contract does not match ANY known head: %r" % contract[:120])
    digits = (m.group("digits") or "").strip()
    shapes, sents = [], []
    if digits:
        # the sentinel conjunct hangs off the end after ", where "
        where = re.split(r",\s*where\s+", digits, maxsplit=1)
        shape_part = where[0]
        sent_part = where[1] if len(where) > 1 else ""
        found = SHAPE_RE.findall(shape_part)
        if not found:
            raise ValueError("digit conjunct present but no complete 'N digits become P' found: %r" % shape_part)
        # EVERY shape must carry its own width. If any token in the conjunct is
        # not a full "N digits become P", the contract is under-specified and
        # must be rejected rather than guessed.
        rest = SHAPE_RE.sub("", shape_part)
        rest = re.sub(r"[\s,]", "", rest)
        if rest:
            raise ValueError("digit conjunct has leftovers %r -- a shape is missing its width" % rest)
        for n, pat in found:
            groups, seps = parse_pattern(pat.strip())
            if sum(groups) != int(n):
                raise ValueError("contract says %s digits but pattern %r has %d" % (n, pat, sum(groups)))
            shapes.append({"len": int(n), "groups": groups, "seps": seps,
                           "mode": "plain", "sentinel": ""})
        widths = [s["len"] for s in shapes]
        if len(widths) != len(set(widths)):
            raise ValueError("contract declares two shapes of the same width")
        for clause in re.split(r"\s+and\s+|,\s*", sent_part):
            clause = clause.strip()
            if not clause:
                continue
            mm = re.match(r"^(?P<s>\S)\s+before\s+digits\s+marks\s+them;\s*drop\s+it$", clause)
            if mm:
                for s in shapes:
                    s["mode"] = "mark"; s["sentinel"] = mm.group("s")
                continue
            mm = re.match(r"^(?P<s>\S)\s+after\s+digits\s+means\s+leave\s+them;\s*drop\s+the\s+(?P=s)$", clause)
            if mm:
                for s in shapes:
                    s["mode"] = "escape"; s["sentinel"] = mm.group("s")
                continue
            raise ValueError("unparseable sentinel conjunct %r" % clause)
        for s in shapes:
            if s["mode"] != "plain" and not s["sentinel"]:
                raise ValueError("shape has a mode but no sentinel")
    return shapes, sents


def parse_pattern(pattern):
    """Same two forms as the X25 receipt: 'd' placeholder, else letter runs."""
    if not pattern:
        raise ValueError("empty pattern")
    if "d" in pattern:
        groups, seps, run = [], [], 0
        for ch in pattern:
            if ch == "d":
                run += 1
            else:
                if run:
                    groups.append(run); run = 0
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
    parts, at = [], 0
    for g in groups:
        parts.append(digits[at:at + g]); at += g
    out = parts[0]
    for k, s in enumerate(seps):
        out += s + parts[k + 1]
    return out


# --------------------------------------------------------------- uncollapse

def digit_runs(s):
    out, i, n = [], 0, len(s)
    while i < n:
        if s[i] in "0123456789":
            j = i
            while j < n and s[j] in "0123456789":
                j += 1
            out.append((i, j)); i = j
        else:
            i += 1
    return out


def uncollapse(text, fmts):
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
            else:
                if prev_ch != sent:
                    continue
                edits.append((a - 1, width + 1,
                              expand_digits(out[a:b], f["groups"], f["seps"])))
        buf, cur = [], 0
        for (at, dl, ins) in edits:
            if at < cur:
                continue
            buf.append(out[cur:at]); buf.append(ins); cur = at + dl
        buf.append(out[cur:])
        out = "".join(buf)
    return out


def decode(message):
    if "\n" not in message:
        raise ValueError("message has no contract line")
    wire, contract = message.rsplit("\n", 1)
    shapes, _ = parse_symploke_contract(contract)
    inner = chiron_decode(wire)
    return uncollapse(inner, shapes) if shapes else inner


def main():
    cases = json.load(open(os.path.join(os.path.dirname(__file__), "cases.json")))
    ok, index = 0, []
    for c in cases:
        src_text = open(c["file"], "r", encoding="utf-8", newline="").read()
        msg = open(c["message"], "r", encoding="utf-8", newline="").read()
        try:
            got = decode(msg)
        except Exception as e:                                   # noqa: BLE001
            print("FAIL %-28s raised %s: %s" % (c["name"], type(e).__name__, e))
            index.append({"name": c["name"], "exact": False, "error": str(e)})
            continue
        exact = got == src_text
        shapes, _ = parse_symploke_contract(msg.rsplit("\n", 1)[1])
        print("%s %-28s shapes=%-2d ctr=%-3d bytes %d/%d" % (
            "PASS" if exact else "FAIL", c["name"], len(shapes),
            len(msg.rsplit("\n", 1)[1].split()), len(got), len(src_text)))
        index.append({"name": c["name"], "exact": exact, "shapes": len(shapes)})
        ok += exact
    print("\n%d/%d byte-exact" % (ok, len(cases)))
    outdir = os.path.join(os.path.dirname(__file__), "receipts", "selfdecode")
    os.makedirs(outdir, exist_ok=True)
    with open(os.path.join(outdir, "INDEX.json"), "w") as f:
        json.dump({"cases": index, "exact": ok, "total": len(cases)}, f, indent=2)
    return 0 if ok == len(cases) else 1


if __name__ == "__main__":
    sys.exit(main())
