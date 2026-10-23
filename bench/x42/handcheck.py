#!/usr/bin/env python3
"""
X42 independent reference decoder for the APOCOPE clause.

This does NOT import apocope.ts. It parses the clause TEXT with a regex, exactly
as a bare LLM reading one chat message would, and rebuilds the source. It is the
same standard X41 held SYSTOLE to (bench/x41/handcheck.py): the new layer must be
decodable from its own instruction string by a reader with no other help.

APOCOPE never ships on any lane (gain 0), so this is not a receipt for a win --
it is a receipt that the mechanism is SOUND and its clause is LITERALLY READABLE,
which is the contract every codec in this repository must satisfy whether or not
it pays.

Clause as rendered by apocopeClauseFor for vix:
    Restore 3:1990-0#-##, 4:##.##0000.
"""
import re
import sys
import hashlib

CLAUSE = "Restore 3:1990-0#-##, 4:##.##0000."


def parse_clause(clause: str):
    """Pull (keep, rendered_template) pairs out of the clause text alone."""
    body = clause.strip()
    assert body.startswith("Restore "), body
    body = body[len("Restore "):]
    assert body.endswith("."), body
    body = body[:-1]
    out = []
    for item in body.split(", "):
        keep, rendered = item.split(":", 1)
        out.append((int(keep), rendered))
    return out


def split_rendered(rendered: str):
    """
    A rendered template is a mix of literal characters and '#' placeholders.
    '#' means a KEPT digit (supplied by the wire); every other character is
    literal and is emitted verbatim -- digits and separators alike.
    Returns the list of (is_placeholder, literal_char) positions plus the
    separator layout, so the digit groups can be reassembled.
    """
    cells = [(c == "#", c) for c in rendered]
    n_keep = sum(1 for ph, _ in cells if ph)
    return cells, n_keep


def restore_run(digits: str, templates):
    """Given a maximal digit run from the wire, restore it or return None."""
    for keep, rendered in templates:
        if len(digits) != keep:
            continue
        cells, n_keep = split_rendered(rendered)
        assert n_keep == keep, (rendered, n_keep, keep)
        out = []
        i = 0
        for is_ph, ch in cells:
            if is_ph:
                out.append(digits[i])
                i += 1
            else:
                out.append(ch)
        assert i == len(digits), (digits, rendered)
        return "".join(out)
    return None


def decode(text: str, templates):
    """Replace every maximal digit run that a template claims."""
    def sub(m):
        r = restore_run(m.group(0), templates)
        return r if r is not None else m.group(0)
    return re.sub(r"\d+", sub, text)


def main():
    cut = sys.stdin.read()
    templates = parse_clause(CLAUSE)
    print("parsed clause ->", templates, file=sys.stderr)
    out = decode(cut, templates)
    sys.stdout.write(out)
    print("md5(restored) =", hashlib.md5(out.encode()).hexdigest(), file=sys.stderr)


if __name__ == "__main__":
    main()
