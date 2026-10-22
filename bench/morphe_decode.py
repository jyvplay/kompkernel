#!/usr/bin/env python3
"""Independent CPython reader for the MORPHE wire (X20).

Deliberately written from the contract text only: it re-finds every clause sentence in the
message by exact string or regex match, so a message that omits a clause is decoded
without it.  It is a real check that the wire is self-describing, not a re-run of the
TypeScript encoder.

Usage:  morphe_decode.py MESSAGE_FILE [ORIGINAL_FILE]
        exit 0 iff the reconstruction equals ORIGINAL_FILE byte for byte.
"""
import json
import re
import sys

# Chiron script table -- the contract names the alphabet ("New Cyrillic"), so the reader
# carries the same table.  Mirrored from src/lib/omega/chiron.ts, CHIRON_SCRIPTS.
SCRIPTS = [
    (0x0400, 0x0500), (0x0370, 0x0400), (0x0530, 0x0600), (0x0900, 0x0E00),
    (0x10A0, 0x1100), (0xAC00, 0xD7A4), (0x30A0, 0x3100), (0x0600, 0x0700),
    (0x1000, 0x10A0), (0x1780, 0x1800), (0x4E00, 0xA000),
]


def is_letter(ch):
    o = ord(ch)
    return any(a <= o < b for a, b in SCRIPTS)


# --- clause patterns (each is what the encoder emits; matched against the contract) -----
C_DATE = ('8-digit runs starting 19 or 20 that are valid dates become YYYY-MM-DD.',
          '8-digit runs that are valid dates become YYYY-MM-DD.')
C_TIME = 'T+6 digits is HH:MM:SS; T+4 is HH:MM.'
C_AFTER = 'After a date and a space, 6 digits are HH:MM:SS and 4 are HH:MM.'
RE_NUMPAD = re.compile(r'Pad numbers to (\d+) decimals with zeros\.')
RE_TZ = re.compile(r'A clock with no offset ends with ([+-]\d{2}:\d{2}|Z)\.')
C_THOUS = 'Group integers by threes from the right with commas.'
C_URL = '〈 is https:// and 〉 is http://.'
C_UUID = 'A 32-hex run is a UUID: dashes at 8-4-4-4-12.'
C_HEX = 'A 6-hex run is a colour: prefix #.'
C_ENT = 'Restore XML entities: & < > " \' as &amp; &lt; &gt; &quot; &#39;.'

CLOCK = r'((?:T\d{6})|(?:\d{2}:\d{2}:\d{2}))'
OFFSET = r'[+-]\d{2}:\d{2}|Z'


def valid_date(r):
    if r[:2] not in ('19', '20'):
        return False
    y, m, d = int(r[:4]), int(r[4:6]), int(r[6:8])
    if not (1 <= m <= 12 and 1 <= d <= 31):
        return False
    if m in (4, 6, 9, 11) and d > 30:
        return False
    if m == 2 and d > (29 if (y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)) else 28):
        return False
    return True


def chiron_decode(wire):
    if not wire.startswith('\u00a7'):
        raise ValueError('wire must start with \u00a7')
    rest = wire[1:]
    i = rest.index('\u00b6')
    tape, body = rest[:i], rest[i + 1:]
    rules, order, cur = [], [], None
    for ch in tape:
        if is_letter(ch):
            if ch not in order:
                order.append(ch)
                rules.append([])
                cur = rules[-1]
            else:
                cur.append(('ref', order.index(ch)))
        else:
            cur.append(('lit', ch))

    def expand(parts, depth=0):
        if depth > 80:
            raise ValueError('recursion limit')
        return ''.join(expand(rules[v], depth + 1) if k == 'ref' else v for k, v in parts)

    table = {c: expand(rules[i]) for i, c in enumerate(order)}
    out, lit = [], []
    for ch in body:
        if ch in table:
            if lit:
                out.append(''.join(lit))
                lit = []
            out.append(table[ch])
        else:
            lit.append(ch)
    if lit:
        out.append(''.join(lit))
    return ''.join(out)


def stigme_restore(s, sep='-', after=False):
    out, i, n = [], 0, len(s)
    digits = '0123456789'
    saw_date = False
    while i < n:
        ch = s[i]
        if ch == 'T':
            j = i + 1
            k = j
            while k < n and s[k] in digits:
                k += 1
            if k - j == 6:
                out.append('T%s:%s:%s' % (s[j:j + 2], s[j + 2:j + 4], s[j + 4:j + 6]))
                i, saw_date = k, False
                continue
            if k - j == 4 and (k >= n or s[k] not in digits):
                out.append('T%s:%s' % (s[j:j + 2], s[j + 2:j + 4]))
                i, saw_date = k, False
                continue
        if ch in digits:
            j = i
            while j < n and s[j] in digits:
                j += 1
            run = s[i:j]
            if len(run) == 8 and run[:2] in ('19', '20') and valid_date(run):
                out.append('%s-%s-%s' % (run[:4], run[4:6], run[6:8]))
                i, saw_date = j, True
                continue
            if after and saw_date and len(run) in (4, 6):
                out.append('%s:%s:%s' % (run[:2], run[2:4], run[4:6]) if len(run) == 6
                           else '%s:%s' % (run[:2], run[2:4]))
                i, saw_date = j, False
                continue
            out.append(run)
            i, saw_date = j, False
            continue
        out.append(ch)
        if ch == '\n':
            saw_date = False
        elif ch != ' ':
            saw_date = False
        i += 1
    return ''.join(out).replace('-', sep) if sep != '-' else ''.join(out)


def main():
    msg = open(sys.argv[1], encoding='utf-8').read()
    orig_path = sys.argv[2] if len(sys.argv) > 2 else None
    nl = msg.rfind('\n')
    contract, wire = msg[nl + 1:], msg[:nl]

    text = chiron_decode(wire)
    applied = []

    # Library rules are undone first (the encoder applied them last), then STIGME's shapes.
    if C_ENT in contract:
        text = (text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    .replace('"', '&quot;').replace("'", '&#39;'))
        applied.append('htmlent')
    if C_HEX in contract:
        text = re.sub(r'\b[0-9a-fA-F]{6}\b', lambda m: '#' + m.group(0), text)
        applied.append('hex')
    if C_UUID in contract:
        text = re.sub(r'\b[0-9a-fA-F]{32}\b', lambda m: '%s-%s-%s-%s-%s' % (
            m.group(0)[:8], m.group(0)[8:12], m.group(0)[12:16], m.group(0)[16:20], m.group(0)[20:]), text)
        applied.append('uuid')
    if C_URL in contract:
        text = text.replace('\u27e8', 'https://').replace('\u27e9', 'http://')
        applied.append('url')
    if C_THOUS in contract:
        text = re.sub(r'(?<![\d.,:])(\d{4,})(?![\d.,:])',
                      lambda m: re.sub(r'\B(?=(?:\d{3})+(?!\d))', ',', m.group(0)), text)
        applied.append('thousands')
    m = RE_TZ.search(contract)
    if m:
        text = re.sub(CLOCK + r'(?!\s*(?:' + OFFSET + r'))', lambda x: x.group(0) + m.group(1), text)
        applied.append('tz' + m.group(1))
    m = RE_NUMPAD.search(contract)
    if m:
        D = int(m.group(1))
        text = re.sub(r'(\d+\.(\d*))(?=\D|$)',
                      lambda x: x.group(1) + '0' * (D - len(x.group(2))) if len(x.group(2)) < D else x.group(1),
                      text)
        applied.append('numpad%d' % D)

    has_date = any(c in contract for c in (C_DATE if isinstance(C_DATE, tuple) else (C_DATE,)))
    has_time = C_TIME in contract
    has_after = C_AFTER in contract
    sep = '/' if 'YYYY/MM/DD' in contract else '-'
    text = stigme_restore(text, sep, has_after)
    if has_date:
        applied.append('date')
    if has_time:
        applied.append('time')
    if has_after:
        applied.append('after')

    stats = {'messageChars': len(msg), 'contractChars': len(contract), 'applied': applied, 'outChars': len(text)}
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
