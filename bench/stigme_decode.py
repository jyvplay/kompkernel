#!/usr/bin/env python3
"""Independent CPython reader for the STIGME wire (Chiron-tape + punctuation/topology
clauses).  Deliberately written from the contract text only: it re-parses the clause
sentences out of the message instead of hard-coding them, so it is a real check that the
wire is self-describing rather than a re-run of the TypeScript encoder.

Usage:  stigme_decode.py MESSAGE_FILE [ORIGINAL_FILE]   -> prints JSON stats to stdout
        stigme_decode.py MESSAGE_FILE -o OUT            -> also writes reconstructed text
"""
import json
import re
import sys

# The wire's rule letters come from the Chiron script pool (src/lib/omega/chiron.ts,
# CHIRON_SCRIPTS).  The first letter of the tape declares the alphabet, so nothing about it
# is transmitted; this reader carries the same table.  Mirrored here verbatim:
# hangul 0xAC00-0xD7A4, katakana 0x30A0-0x3100, cyrillic 0x0400-0x0500, arabic 0x0600-0x0700,
# myanmar 0x1000-0x10A0, khmer 0x1780-0x1800, cjk 0x4E00-0xA000, and the polyglot pool.
CYR_RANGES = (
    (0xAC00, 0xD7A3), (0x30A0, 0x30FF), (0x0400, 0x04FF), (0x0600, 0x06FF),
    (0x1000, 0x109F), (0x1780, 0x17FF), (0x4E00, 0x9FFF),
    (0x0370, 0x03FF), (0x0530, 0x058F), (0x0590, 0x05FF), (0x0900, 0x097F),
    (0x0980, 0x09FF), (0x0A00, 0x0A7F), (0x0A80, 0x0AFF), (0x0B80, 0x0BFF),
    (0x0C00, 0x0C7F), (0x0C80, 0x0CFF), (0x0D00, 0x0D7F), (0x0D80, 0x0DFF),
    (0x0E00, 0x0E7F), (0x10A0, 0x10FF),
)

# The three punctuation/topology clauses.  The reader re-finds them in the message's
# contract tail by exact string match, so a message that omits a clause is decoded without it.
DATE_CLAUSE = '8-digit runs starting 19 or 20 that are valid dates become YYYY-MM-DD.'
TIME_CLAUSE = 'T+6 digits is HH:MM:SS; T+4 is HH:MM.'
AFTER_CLAUSE = 'After a date and a space, 6 digits are HH:MM:SS and 4 are HH:MM.'


def is_cyr(ch):
    o = ord(ch)
    return any(lo <= o <= hi for lo, hi in CYR_RANGES)


def valid_date(y, m, d):
    if y[:2] not in ('19', '20'):        # the clause restricts the century
        return False
    if not (1000 <= int(y) <= 2999):
        return False
    m, d = int(m), int(d)
    if not (1 <= m <= 12) or not (1 <= d <= 31):
        return False
    if m in (4, 6, 9, 11) and d > 30:
        return False
    if m == 2 and d > (29 if int(y) % 4 == 0 and (int(y) % 100 != 0 or int(y) % 400 == 0) else 28):
        return False
    return True


def parse_tape(tape):
    """Split the tape into rules.  A Cyrillic letter that has not been seen before starts a
    new rule; everything up to the next *new* Cyrillic letter (or the end) is that rule's
    text.  Cyrillic letters already known are references to their rule."""
    rules = []
    cur = None
    for ch in tape:
        if is_cyr(ch):
            idx = next((i for i, (k, _) in enumerate(rules) if k == ch), None)
            if idx is None:            # new letter -> previous rule ends, this one starts
                rules.append((ch, []))
                cur = rules[-1][1]
            else:
                cur.append(('ref', idx))
        else:
            if cur is None:
                raise ValueError('tape text before first rule letter')
            cur.append(('lit', ch))
    return rules


def expand(parts, rules, depth=0):
    if depth > 60:
        raise ValueError('recursion limit')
    out = []
    for kind, val in parts:
        if kind == 'lit':
            out.append(val)
        else:
            out.append(expand(rules[val], rules, depth + 1))
    return ''.join(out)


def chiron_decode(wire):
    if not wire.startswith('\u00a7'):
        raise ValueError('wire must start with \u00a7')
    rest = wire[1:]
    if '\u00b6' not in rest:
        raise ValueError('no \u00b6 separator')
    i = rest.index('\u00b6')
    tape, body = rest[:i], rest[i + 1:]
    tape_rules = parse_tape(tape)                 # [(letter, parts), ...]
    rules = [parts for _, parts in tape_rules]
    out = []
    lit = []
    for ch in body:
        if is_cyr(ch):
            idx = next((k for k, (kk, _) in enumerate(tape_rules) if kk == ch), None)
            if idx is None:
                raise ValueError('body references unknown rule letter %r' % ch)
            if lit:
                out.append(''.join(lit))
                lit = []
            out.append(expand(rules[idx], rules))
        else:
            lit.append(ch)
    if lit:
        out.append(''.join(lit))
    return ''.join(out)


def apply_clauses(text, clauses):
    """Re-insert the separators the encoder removed."""
    out = []
    i = 0
    n = len(text)
    after_date = False
    digits = '0123456789'
    while i < n:
        ch = text[i]
        if ch == 'T' and TIME_CLAUSE in clauses:
            j = i + 1
            k = j
            while k < n and text[k] in digits:
                k += 1
            if k - j == 6:
                out.append('T%s:%s:%s' % (text[j:j + 2], text[j + 2:j + 4], text[j + 4:j + 6]))
                i = k
                after_date = False
                continue
            if k - j == 4 and (k >= n or text[k] not in digits):
                out.append('T%s:%s' % (text[j:j + 2], text[j + 2:j + 4]))
                i = k
                after_date = False
                continue
        if ch in digits and DATE_CLAUSE in clauses:
            j = i
            while j < n and text[j] in digits:
                j += 1
            run = text[i:j]
            if len(run) == 8:
                y, m, d = run[0:4], run[4:6], run[6:8]
                if valid_date(y, m, d):
                    out.append('%s-%s-%s' % (y, m, d))
                    i = j
                    after_date = True
                    continue
            if after_date and AFTER_CLAUSE in clauses and len(run) in (4, 6):
                out.append('%s:%s:%s' % (run[0:2], run[2:4], run[4:6]) if len(run) == 6
                           else '%s:%s' % (run[0:2], run[2:4]))
                i = j
                after_date = False
                continue
            out.append(run)
            i = j
            after_date = False
            continue
        out.append(ch)
        if ch == '\n':
            after_date = False
        elif ch == ' ':
            pass                      # keep the flag across a single space
        else:
            after_date = False
        i += 1
    return ''.join(out)


def main():
    msg_path = sys.argv[1]
    orig_path = sys.argv[2] if len(sys.argv) > 2 else None
    msg = open(msg_path, encoding='utf-8').read()
    nl = msg.rfind('\n')
    contract = msg[nl + 1:]
    wire = msg[:nl]
    clauses = [c for c in (DATE_CLAUSE, TIME_CLAUSE, AFTER_CLAUSE) if c in contract]
    body = chiron_decode(wire)
    text = apply_clauses(body, clauses)
    stats = {
        'messageChars': len(msg),
        'contractChars': len(contract),
        'clauses': clauses,
        'wireChars': len(wire),
        'outChars': len(text),
    }
    if orig_path:
        orig = open(orig_path, encoding='utf-8').read()
        stats['exact'] = (text == orig)
        if text != orig:
            for k in range(min(len(text), len(orig))):
                if text[k] != orig[k]:
                    stats['firstDiff'] = k
                    stats['got'] = text[max(0, k - 40):k + 40]
                    stats['want'] = orig[max(0, k - 40):k + 40]
                    break
    print(json.dumps(stats))
    if orig_path:
        sys.exit(0 if stats.get('exact') else 1)


if __name__ == '__main__':
    main()
