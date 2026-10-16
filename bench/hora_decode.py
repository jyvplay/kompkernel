#!/usr/bin/env python3
"""
SECOND, INDEPENDENT IMPLEMENTATION OF THE HORA READER (CPython, no Node). X13.

Input: a JSON list of WHOLE one-chat messages. A message is either
  (a) HORA contract line + DAEDALUS message   (delta arm), or
  (b) a plain DAEDALUS message                 (identity arm).

Procedure (the same as the contract sentence says):
  1. If the first line is the HORA contract, drop it and remember the delta arm.
  2. Decode the DAEDALUS message with bench/gnomon_decode.py (decode_message).
  3. Delta arm only: walk the decoded text in order. "※N" means: previous timestamp + N ms,
     with the previous date and separator, time formatted HH:MM:SS.mmm (3 ms digits).
     A literal timestamp "YYYY-MM-DD<sep>HH:MM:SS.mmm" is copied and becomes the previous one.

Usage:  python3 bench/hora_decode.py messages.json out.json
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gnomon_decode import decode_message as daedalus_message  # noqa: E402

# Must equal HORA_CONTRACT in src/lib/omega/hora.ts byte for byte.
CONTRACT = '※N = previous timestamp + N ms (N may be negative; same date; keep 3 ms digits).'

TOKEN = re.compile(r'※(-?\d+)|(?<!\d)(\d{4})-(\d{2})-(\d{2})([ T])(\d{2}):(\d{2}):(\d{2})\.(\d{3})(?!\d)')
DAY_MS = 86_400_000


def fmt_tod(t):
    ms = t % 1000
    s = t // 1000
    hh, s = divmod(s, 3600)
    mm, ss = divmod(s, 60)
    return f'{hh:02d}:{mm:02d}:{ss:02d}.{ms:03d}'


def hora_expand(wire):
    st = {'date': None, 'sep': None, 'tod': None}

    def sub(m):
        if m.group(1) is not None:
            if st['tod'] is None:
                raise ValueError('delta with no previous timestamp')
            t = st['tod'] + int(m.group(1))
            if t < 0 or t >= DAY_MS:
                raise ValueError('delta leaves the day')
            st['tod'] = t
            return f"{st['date']}{st['sep']}{fmt_tod(t)}"
        y, mo, d, sep, hh, mi, ss, ms = m.groups()[1:]
        st['date'] = f'{y}-{mo}-{d}'
        st['sep'] = sep
        st['tod'] = ((int(hh) * 60 + int(mi)) * 60 + int(ss)) * 1000 + int(ms)
        return m.group(0)

    return TOKEN.sub(sub, wire)


def decode_whole(message):
    lines = message.split('\n', 1)
    if lines[0] == CONTRACT:
        body = lines[1] if len(lines) > 1 else ''
        return hora_expand(daedalus_message(body))
    return daedalus_message(message)


if __name__ == '__main__':
    msgs = json.load(open(sys.argv[1], encoding='utf8'))
    out = [decode_whole(m) for m in msgs]
    json.dump(out, open(sys.argv[2], 'w', encoding='utf8'), ensure_ascii=False)
    print(f'decoded {len(out)} messages')
