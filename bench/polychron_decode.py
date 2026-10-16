#!/usr/bin/env python3
"""
Independent POLYCHRON reader, CPython-only.

This does not import the TypeScript transform or reader. It reimplements only
what the POLYCHRON contract says after the DAEDALUS/CHIRON wire: optional
@raw escaping, @dp decimal restoration, and ※dN calendar-day restoration.
Input is the JSON exported by bench/polychron-independent.ts. The process exits
nonzero on any byte-for-byte mismatch.
"""
import datetime
import json
import re
import sys

from chiron_decode import decode as chiron_decode

RAW = '@raw\n'
HEADER = re.compile(r'^@dp ([0-9]+(?:,[0-9]+)*)( crlf)?$')
NUMBER = re.compile(r'^(-?\d+)(?:\.(\d*))?$')
TIME = r'(?:([ T])(\d{2}):(\d{2}):(\d{2})(\.\d{3}(?!\d))?)?'
LITERAL = r'(?<!\d)(\d{4})-(\d{2})-(\d{2})' + TIME + r'(?!\d)'
READ = re.compile(r'※d(-?\d+)' + TIME + r'|※(-?\d+)|' + LITERAL)
DAY_MS = 86_400_000


def stathmos_restore(text):
    lines = text.split('\n')
    trailing = bool(lines and lines[-1] == '')
    body = lines[:-1] if trailing else lines
    if len(body) < 3:
        return None
    m = HEADER.fullmatch(body[0])
    if not m:
        return None
    dp = [int(x) for x in m.group(1).split(',')]
    crlf = bool(m.group(2))
    eol = '\r' if crlf else ''
    rows = []
    for i, line in enumerate(body[1:]):
        if crlf and line.endswith('\r'):
            line = line[:-1]
        cells = line.split(',')
        if i == 0:
            out = cells
        else:
            out = []
            for c, value in enumerate(cells):
                d = dp[c] if c < len(dp) else 0
                if d == 0 or value == '':
                    out.append(value)
                    continue
                n = NUMBER.fullmatch(value)
                if not n:
                    out.append(value)
                    continue
                out.append(n.group(1) + '.' + (n.group(2) or '').ljust(d, '0'))
        rows.append(','.join(out) + eol)
    return '\n'.join(rows) + ('\n' if trailing else '')


def tod_of(h, minute, second, frac):
    if frac is None or int(h) >= 24 or int(minute) >= 60 or int(second) >= 60:
        return -1
    return ((int(h) * 60 + int(minute)) * 60 + int(second)) * 1000 + int(frac[1:])


def fmt_tod(value):
    ms = value % 1000
    seconds = value // 1000
    hour, seconds = divmod(seconds, 3600)
    minute, second = divmod(seconds, 60)
    return f'{hour:02d}:{minute:02d}:{second:02d}.{ms:03d}'


def hemera_restore(text):
    state = {'last': None, 'day': None, 'sep': '', 'tod': -1}

    def replace(match):
        if match.group(1) is not None:  # ※dN followed by optional literal time
            if state['last'] is None:
                raise ValueError('day delta without a date')
            z = state['last'] + int(match.group(1))
            state['last'] = z
            if match.group(2) is not None:
                frac = match.group(6) or ''
                state['day'] = z
                state['sep'] = match.group(2)
                state['tod'] = tod_of(match.group(3), match.group(4), match.group(5), match.group(6))
                return datetime.date.fromordinal(z).isoformat() + match.group(2) + match.group(3) + ':' + match.group(4) + ':' + match.group(5) + frac
            return datetime.date.fromordinal(z).isoformat()
        if match.group(7) is not None:  # reserved for completeness; HEMERA-DAYS does not emit it
            if state['day'] is None or state['tod'] < 0:
                raise ValueError('millisecond delta without a timestamp')
            value = state['tod'] + int(match.group(7))
            if value < 0 or value >= DAY_MS:
                raise ValueError('millisecond delta leaves the day')
            state['tod'] = value
            state['last'] = state['day']
            return datetime.date.fromordinal(state['day']).isoformat() + state['sep'] + fmt_tod(value)
        year, month, day = int(match.group(8)), int(match.group(9)), int(match.group(10))
        try:
            date = datetime.date(year, month, day)
        except ValueError:
            return match.group(0)
        z = date.toordinal()
        state['last'] = z
        if match.group(11) is not None:
            state['day'] = z
            state['sep'] = match.group(11)
            state['tod'] = tod_of(match.group(12), match.group(13), match.group(14), match.group(15))
        return match.group(0)

    return READ.sub(replace, text)


def decode_wire(wire):
    decoded = chiron_decode(wire)
    if decoded.startswith(RAW):
        return decoded[len(RAW):]
    restored = stathmos_restore(decoded)
    return hemera_restore(restored if restored is not None else decoded)


def main():
    cases = json.load(open(sys.argv[1], encoding='utf8'))
    failures = []
    transformed = 0
    for case in cases:
        got = decode_wire(case['wire'])
        if case.get('transformed'):
            transformed += 1
        if got != case['text']:
            failures.append({'file': case['file'], 'expected': len(case['text']), 'got': len(got)})
    result = {'cases': len(cases), 'transformed': transformed, 'failures': failures}
    out_path = sys.argv[2] if len(sys.argv) > 2 else 'bench/polychron/receipts/independent-reader.json'
    with open(out_path, 'w', encoding='utf8') as fh:
        json.dump(result, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    print(json.dumps(result, ensure_ascii=False))
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
