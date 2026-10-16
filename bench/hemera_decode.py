#!/usr/bin/env python3
"""
SECOND, INDEPENDENT IMPLEMENTATION OF THE HEMERA READER (CPython, no Node). X14.

Input: a JSON list of WHOLE one-chat messages. A message is either
  (a) a HEMERA contract line + DAEDALUS message  (arm 'days' or 'both'), or
  (b) a plain DAEDALUS message                   (identity arm).

Procedure (the same rules the contract sentences state):
  1. If the first line equals one of the two contract strings, drop it and remember the arm.
  2. Decode the DAEDALUS message with bench/gnomon_decode.py (decode_message).
  3. Walk the decoded text in order, with state (prev date, prev separator, prev ms-of-day):
     - "※dN"  : prev date + N calendar days (Python datetime.date, proleptic Gregorian);
                 an optional " HH:MM:SS[.mmm]" that follows is kept literal and becomes the state.
     - "※N"   : (arm 'both' only in the writer, but read by both arms) prev timestamp + N ms,
                 same date and separator as prev.
     - literal "YYYY-MM-DD[<sep>HH:MM:SS[.mmm]]" that is a valid date is copied and becomes the state.
     Invalid or year-0000 dates are copied and do not change the state.

Usage:  python3 bench/hemera_decode.py messages.json out.json
"""
import datetime
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gnomon_decode import decode_message as daedalus_message  # noqa: E402

# Must equal HEMERA_CONTRACT_DAYS / _MS / _BOTH in src/lib/omega/hemera.ts byte for byte.
CONTRACT_DAYS = '※dN = the previous date plus N days (N may be negative); write dates as YYYY-MM-DD.'
CONTRACT_MS = '※N = previous timestamp + N ms (N may be negative; same date; keep 3 ms digits).'
CONTRACT_BOTH = ('※dN = previous date + N days (YYYY-MM-DD). '
                 '※N = previous timestamp + N ms (same date; 3 ms digits). N may be negative.')
CONTRACTS = (CONTRACT_DAYS, CONTRACT_MS, CONTRACT_BOTH)

TIME = r'(?:([ T])(\d{2}):(\d{2}):(\d{2})(\.\d{3}(?!\d))?)?'
LITERAL = r'(?<!\d)(\d{4})-(\d{2})-(\d{2})' + TIME + r'(?!\d)'
READ = re.compile(r'※d(-?\d+)' + TIME + r'|※(-?\d+)|' + LITERAL)
DAY_MS = 86_400_000


def valid_date(y, m, d):
    if y < 1:
        return False
    try:
        datetime.date(y, m, d)
        return True
    except ValueError:
        return False


def fmt_tod(t):
    ms = t % 1000
    s = t // 1000
    hh, s = divmod(s, 3600)
    mm, ss = divmod(s, 60)
    return f'{hh:02d}:{mm:02d}:{ss:02d}.{ms:03d}'


def tod_of(h, mi, s, frac):
    """ms-of-day for a time with a fraction, or -1 (no fraction, or an out-of-range clock)."""
    if frac is None or int(h) >= 24 or int(mi) >= 60 or int(s) >= 60:
        return -1
    return ((int(h) * 60 + int(mi)) * 60 + int(s)) * 1000 + int(frac[1:])


def hemera_expand(wire):
    # State (same as src/lib/omega/hemera.ts): last_ord = last valid date of any kind;
    # full_* = last valid date that carries a time (full_tod = ms-of-day if the fraction is present, else -1).
    st = {'last': None, 'fday': None, 'fsep': '', 'ftod': -1}

    def sub(m):
        if m.group(1) is not None:                                  # ※dN [time]
            if st['last'] is None:
                raise ValueError('date delta with no previous date')
            z = st['last'] + int(m.group(1))
            st['last'] = z
            if m.group(2) is not None:
                frac = m.group(6) or ''
                st['fday'] = z
                st['fsep'] = m.group(2)
                st['ftod'] = tod_of(m.group(3), m.group(4), m.group(5), m.group(6))
                return f'{datetime.date.fromordinal(z).isoformat()}{m.group(2)}{m.group(3)}:{m.group(4)}:{m.group(5)}{frac}'
            return datetime.date.fromordinal(z).isoformat()
        if m.group(7) is not None:                                  # ※N
            if st['fday'] is None or st['ftod'] < 0:
                raise ValueError('ms delta with no previous timestamp')
            t = st['ftod'] + int(m.group(7))
            if t < 0 or t >= DAY_MS:
                raise ValueError('ms delta leaves the day')
            st['ftod'] = t
            st['last'] = st['fday']
            return datetime.date.fromordinal(st['fday']).isoformat() + st['fsep'] + fmt_tod(t)
        y, mo, d = int(m.group(8)), int(m.group(9)), int(m.group(10))  # literal
        if not valid_date(y, mo, d):
            return m.group(0)
        z = datetime.date(y, mo, d).toordinal()
        st['last'] = z
        if m.group(11) is not None:
            st['fday'] = z
            st['fsep'] = m.group(11)
            st['ftod'] = tod_of(m.group(12), m.group(13), m.group(14), m.group(15))
        return m.group(0)

    return READ.sub(sub, wire)


def decode_whole(message):
    lines = message.split('\n', 1)
    if lines[0] in CONTRACTS:
        body = lines[1] if len(lines) > 1 else ''
        return hemera_expand(daedalus_message(body))
    return daedalus_message(message)


if __name__ == '__main__':
    msgs = json.load(open(sys.argv[1], encoding='utf8'))
    out = [decode_whole(m) for m in msgs]
    json.dump(out, open(sys.argv[2], 'w', encoding='utf8'), ensure_ascii=False)
    print(f'decoded {len(out)} messages')
