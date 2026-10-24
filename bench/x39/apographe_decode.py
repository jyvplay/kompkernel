#!/usr/bin/env python3
"""
INDEPENDENT (CPython) IMPLEMENTATION OF THE APOGRAPHE READER.  X39.

This file is written from the CONTRACT PROSE, not from the TypeScript. It shares
no code with src/lib/omega/apographe.ts (except bench/chiron_decode.py, which is
itself an independent implementation of the layer below, written in an earlier
turn and untouched here).

What a reader has, and nothing else:

    [contract line]      the one sentence CHIRON/TIMEMA/EUTELEIA/APOGRAPHE emit
    [wire]               § TAPE ¶ BODY          (or the raw text, unchanged)

Procedure:

  1. The first line is the contract. Read the run-length framing out of it
     (the contract spells it, e.g. "(N~X) means X written N times"), and note
     whether it mentions a header line.
  2. Decode the wire with the CHIRON reader (bench/chiron_decode.py).
  3. Undo the run-length spans:  (N~X)  ->  X written N times.
  4. If the text now begins with a header line "<n|sep|col=model|...>", rebuild
     the lifted columns:
        - split every line on sep;
        - a line with exactly n fields is literal, and it RESETS the state of
          every lifted column;
        - a line with n-L fields (L = number of lifted columns) is missing
          those columns; rebuild them at their positions, in column order;
        - any other field count is copied unchanged;
        - predictors, each a one-step function of the value above:
            above     : the value above in that column
            colM      : column M of the SAME line (M is always to the left)
            days      : the date above + 1 calendar day
            workdays  : the next weekday after the date above (Fri -> Mon)
            +b        : the number in the value above, plus b, re-rendered with
                        the SAME count of digits (zero padded)
        - the header line itself is dropped.

Usage:  python3 bench/x39/apographe_decode.py messages.json out.json
        messages.json = [{"lane": <path>, "message": <whole message>}, ...]
        out.json      = [{"lane":..., "exact":bool, "decoded":...}, ...]
"""
import datetime
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, '..')))
from chiron_decode import decode as chiron_decode  # noqa: E402

# The nine framings ANADIPLOSIS may use, cheapest first (the contract spells one).
FRAMINGS = [('(', ')', '~'), ('[', ']', '~'), ('<', '>', '~'), ('{', '}', '~'),
            ('\u00ab', '\u00bb', '~'), ('[', ']', '#'), ('[', ']', '@'),
            ('[', ']', '*'), ('\u27e6', '\u27e7', '\u21e4')]

OPENERS = [('<', '>'), ('\u00ab', '\u00bb'), ('\u2039', '\u203a'), ('{', '}'), ('[', ']')]
DATE = re.compile(r'^(\d{4})-(\d{2})-(\d{2})$')
NUMBER = re.compile(r'^(\D*)(\d+)(\D*)$', re.DOTALL)


def rle_undo(text, framing):
    o, c, m = framing
    if o not in text:
        return text
    mark = re.compile('^([0-9]{1,7})' + re.escape(m))
    out, i = [], 0
    while i < len(text):
        a = text.find(o, i)
        if a < 0:
            out.append(text[i:])
            break
        out.append(text[i:a])
        hit = mark.match(text[a + 1:])
        if not hit:
            out.append(o)
            i = a + 1
            continue
        k = int(hit.group(1))
        u0 = a + 1 + len(hit.group(0))
        b = text.find(c, u0)
        if b < 0:
            out.append(text[a:])
            break
        unit = text[u0:b]
        if not (2 <= k <= 100000):
            out.append(text[a:b + 1])
            i = b + 1
            continue
        out.append(unit * k)
        i = b + 1
    return ''.join(out)


def framing_from_contract(contract):
    for f in FRAMINGS:
        if f[0] + 'N' + f[2] + 'X' + f[1] in contract:
            return f
    return None


def shapes_from_contract(contract):
    """`N digits become PATTERN` clauses -> [(width, tokens)].

    PATTERN is read as runs of one letter. The letter of the FIRST run is the
    digit letter: a run of k of it is a digit group of width k. Every other
    character is a literal separator, and a run of separators is one separator.
    So `YYYY-MM-DD` is [4,'-',2,'-',2], `HH:MM:SS` is [2,':',2,':',2], and the
    learned `d.dd.d` is [1,'.',2,'.',1]. One rule covers every tier.
    """
    out = []
    for m in re.finditer(r'([0-9]{1,2}) digits become ([^ ,;]+)', contract):
        width, pat = int(m.group(1)), m.group(2)
        if not pat:
            continue
        runs, i = [], 0
        while i < len(pat):
            j = i
            while j < len(pat) and pat[j] == pat[i]:
                j += 1
            runs.append(pat[i:j])
            i = j
        letters = [r for r in runs if r[0].isalpha()]
        one_letter = len({r[0] for r in letters}) == 1
        toks = []
        for r in runs:
            is_group = r[0].isalpha() and (len(r) >= 2 or one_letter)
            toks.append(('g', len(r), '') if is_group else ('s', 0, r))
        if sum(t[1] for t in toks if t[0] == 'g') != width:
            continue
        out.append((width, toks))
    return out


def expand_shapes(text, shapes):
    for width, toks in shapes:
        pat = re.compile(r'(?<![0-9])[0-9]{%d}(?![0-9])' % width)
        out, i = [], 0
        while True:
            m = pat.search(text, i)
            if not m:
                out.append(text[i:])
                break
            out.append(text[i:m.start()])
            digits = m.group(0)
            seg, p = [], 0
            for kind, w, lit in toks:
                if kind == 'g':
                    seg.append(digits[p:p + w])
                    p += w
                else:
                    seg.append(lit)
            out.append(''.join(seg))
            i = m.end()
        text = ''.join(out)
    return text


def split_lines(text):
    """[(body, eol)] with the eol kept verbatim."""
    out, i = [], 0
    while i <= len(text):
        j = text.find('\n', i)
        if j < 0:
            if i < len(text) or not out:
                out.append((text[i:], ''))
            break
        body, eol = text[i:j], '\n'
        if body.endswith('\r'):
            body, eol = body[:-1], '\r\n'
        out.append((body, eol))
        i = j + 1
    return out


def parse_header(line):
    for op, cl in OPENERS:
        if not (line.startswith(op) and line.endswith(cl)):
            continue
        inner = line[len(op):len(line) - len(cl)]
        for hsep in ('|', ';', '!'):
            parts = inner.split(hsep)
            if len(parts) < 3:
                continue
            try:
                n = int(parts[0])
            except ValueError:
                continue
            sep = parts[1]
            if n < 2 or not sep or hsep in sep:
                continue
            lifts, ok = [], True
            for item in parts[2:]:
                if '=' not in item:
                    ok = False
                    break
                coltxt, spec = item.split('=', 1)
                try:
                    col = int(coltxt) - 1
                except ValueError:
                    ok = False
                    break
                if not (0 <= col < n) or any(l[0] == col for l in lifts):
                    ok = False
                    break
                if spec == 'above':
                    lifts.append((col, ('above', None)))
                elif spec == 'days':
                    lifts.append((col, ('days', None)))
                elif spec == 'workdays':
                    lifts.append((col, ('workdays', None)))
                elif re.match(r'^col\d+$', spec):
                    src = int(spec[3:]) - 1
                    if not (0 <= src < col):
                        ok = False
                        break
                    lifts.append((col, ('col', src)))
                elif re.match(r'^[+-]\d{1,15}$', spec):
                    lifts.append((col, ('int', int(spec))))
                else:
                    ok = False
                    break
            if ok and lifts:
                return {'n': n, 'sep': sep, 'lifts': sorted(lifts), 'open': op, 'close': cl}
    return None


def predict(model, state, row):
    kind, arg = model
    if kind == 'above':
        return state
    if kind == 'col':
        return row.get(arg)
    if kind in ('days', 'workdays'):
        if state is None:
            return None
        m = DATE.match(state)
        if not m:
            return None
        try:
            d = datetime.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
        d = d + datetime.timedelta(days=1)
        if kind == 'workdays':
            while d.weekday() >= 5:                      # Sat = 5, Sun = 6
                d = d + datetime.timedelta(days=1)
        return '%04d-%02d-%02d' % (d.year, d.month, d.day)
    if kind == 'int':
        if state is None:
            return None
        m = NUMBER.match(state)
        if not m:
            return None
        pre, digits, suf = m.group(1), m.group(2), m.group(3)
        v = int(digits) + arg
        s = str(abs(v))
        if len(s) > len(digits):
            return None                                  # width would change
        return pre + ('-' if v < 0 else '') + s.rjust(len(digits), '0') + suf
    return None


def apographe_undo(text):
    lines = split_lines(text)
    if not lines:
        return None
    cfg = parse_header(lines[0][0])
    if not cfg:
        return text                                   # no header: nothing to do
    n, sep, lifts = cfg['n'], cfg['sep'], cfg['lifts']
    L = len(lifts)
    pred_cols = {c for c, _ in lifts}
    state = {}
    out = []
    for body, eol in lines[1:]:
        fields = body.split(sep)
        if len(fields) == n:
            out.append((body, eol))
            for c, _ in lifts:
                state[c] = fields[c]
            continue
        if len(fields) != n - L:
            out.append((body, eol))
            continue
        row = {}
        rebuilt = []
        k = 0
        for c in range(n):
            if c not in pred_cols:
                row[c] = fields[k]
                rebuilt.append(fields[k])
                k += 1
                continue
            v = predict(dict(lifts)[c], state.get(c), row)
            if v is None:
                return None
            row[c] = v
            rebuilt.append(v)
        out.append((sep.join(rebuilt), eol))
        for c, _ in lifts:
            state[c] = row[c]
    return ''.join(b + e for b, e in out)


def decode_message(message):
    lines = message.split('\n')
    # the contract is the first line; a wire that is already raw has none
    if lines and not lines[0].startswith('\u00a7'):
        contract = lines[0]
        rest = message[len(contract) + 1:]
    else:
        contract, rest = '', message
    text = chiron_decode(rest) if rest.startswith('\u00a7') else rest
    text = expand_shapes(text, shapes_from_contract(contract))
    f = framing_from_contract(contract)
    if f:
        text = rle_undo(text, f)
    back = apographe_undo(text)
    return back if back is not None else text


def main():
    cases = json.load(open(sys.argv[1], encoding='utf8'))
    out = []
    for c in cases:
        try:
            got = decode_message(c['message'])
            # newline='' keeps CRLF exactly as it is on disk; the default would
            # translate it and make a correct decode look wrong
            want = open(c['lane'], encoding='utf8', newline='').read()
            out.append({'lane': c['lane'], 'exact': got == want, 'decoded': got})
        except Exception as e:                            # noqa: BLE001
            out.append({'lane': c['lane'], 'exact': False, 'error': repr(e)})
    json.dump(out, open(sys.argv[2], 'w', encoding='utf8'), ensure_ascii=False)
    for r in out:
        print(('EXACT    ' if r['exact'] else 'MISMATCH ') + os.path.basename(r['lane']),
              r.get('error', ''))


if __name__ == '__main__':
    main()
