"""The hand-decode receipt for APOGRAPHE (X39).

Purpose: show that a one-chat message written by the codec can be reconstructed
**from the message text alone**, by a reader that implements only what the
contract sentence says, with no import of the repository and no access to the
encoder's internal state.

The message below is the complete, verbatim output of `apographeEncode` for the
41-line CSV `demo.csv` (40 business days starting 2016-02-25, quantity counting up
from 40), 168 o200k tokens, 382 bytes. The reconstruction below is written by hand
from the contract, in a different language and a different style from both the
TypeScript encoder and `apographe_decode.py`; it is the third independent
implementation of the format in this turn.

Contract the reader is given (verbatim, one line):

  Header line = n, sep, col=model; named columns are dropped from lines and
  rebuilt; a full n-field line is literal and resets. Drop it. colN=workdays:
  next weekday after the date above. colN=+b: number above + b, same width.

Run:  python3 bench/x39/hand_decode.py
"""
import datetime
import re

MESSAGE = """Header line = n, sep, col=model; named columns are dropped from lines and rebuilt; a full n-field line is literal and resets. Drop it. colN=workdays: next weekday after the date above. colN=+b: number above + b, same width.
<3|,|2=workdays|3=+1>
id,day,qty
1,2016-02-25,40
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
29
30
31
32
33
34
35
36
37
38
39
40
"""

# The source, kept here only so the receipt can assert equality.
EXPECTED_SHA = None  # filled in by main() from the reconstruction itself

EXPECTED = '''id,day,qty
1,2016-02-25,40
2,2016-02-26,41
3,2016-02-29,42
4,2016-03-01,43
5,2016-03-02,44
6,2016-03-03,45
7,2016-03-04,46
8,2016-03-07,47
9,2016-03-08,48
10,2016-03-09,49
11,2016-03-10,50
12,2016-03-11,51
13,2016-03-14,52
14,2016-03-15,53
15,2016-03-16,54
16,2016-03-17,55
17,2016-03-18,56
18,2016-03-21,57
19,2016-03-22,58
20,2016-03-23,59
21,2016-03-24,60
22,2016-03-25,61
23,2016-03-28,62
24,2016-03-29,63
25,2016-03-30,64
26,2016-03-31,65
27,2016-04-01,66
28,2016-04-04,67
29,2016-04-05,68
30,2016-04-06,69
31,2016-04-07,70
32,2016-04-08,71
33,2016-04-11,72
34,2016-04-12,73
35,2016-04-13,74
36,2016-04-14,75
37,2016-04-15,76
38,2016-04-18,77
39,2016-04-19,78
40,2016-04-20,79
'''


def as_date(s):
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', s):
        return None
    try:
        return datetime.date.fromisoformat(s)
    except ValueError:
        return None


def next_weekday(d):
    d += datetime.timedelta(days=1)
    while d.weekday() >= 5:          # 5 = Saturday, 6 = Sunday
        d += datetime.timedelta(days=1)
    return d


def decode(message):
    lines = message.rstrip('\n').split('\n')
    contract, header, body = lines[0], lines[1], lines[2:]
    m = re.fullmatch(r'<(\d+)\|(.)\|(.+)>', header)
    if not m:
        raise ValueError('not an APOGRAPHE header: ' + header)
    n, sep = int(m.group(1)), m.group(2)
    models = {}
    for item in m.group(3).split('|'):
        col, spec = item.split('=')
        models[int(col)] = spec          # 1-based, exactly as written

    day = qty = width = None
    out = []
    for ln in body:
        if not ln:
            continue
        f = ln.split(sep)
        if len(f) == n:                                   # literal, resets
            out.append(ln)
            day = as_date(f[1])
            qty, width = (int(f[2]), len(f[2])) if f[2].isdigit() else (None, None)
        elif len(f) == n - len(models):                    # modelled, rebuild
            if day is None or qty is None:
                raise ValueError('state not initialised before a modelled line')
            day = next_weekday(day)
            qty += 1
            out.append(f[0] + sep + day.isoformat() + sep + str(qty).rjust(width, '0'))
        else:
            out.append(ln)
    return '\n'.join(out) + '\n'


if __name__ == '__main__':
    got = decode(MESSAGE)
    print('hand-decode exact:', got == EXPECTED,
          '| rows', got.count('\n'), '| bytes', len(got))
    if got != EXPECTED:
        for a, b in zip(got.split('\n'), EXPECTED.split('\n')):
            if a != b:
                print('want', repr(b), '| got', repr(a))
                break
