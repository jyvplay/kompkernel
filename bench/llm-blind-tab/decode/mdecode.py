import sys, unicodedata
txt = open(sys.argv[1], encoding='utf-8').read()
# the instruction block follows a blank line; the table tape is before the first '¶'? take text up to and including the instruction
if '\n\nNew Cyrillic' in txt:
    txt = txt.split('\n\nNew Cyrillic')[0]
txt = txt.split('\n',1)[1] if txt.startswith('Table in column-major') else txt
assert '¶' in txt
head, body = txt.split('¶',1)
head = head.replace('§','')
def isnew_letter(c, defined):
    return c.isalpha() and c not in defined
# parse rules: each undefined letter starts a rule; body runs until next undefined letter or end of head
rules = {}; order=[]
cur=None
for c in head:
    if isnew_letter(c, rules):
        cur=c; rules[c]=''; order.append(c)
    elif cur is not None:
        rules[cur]+=c
# expand
import functools
@functools.lru_cache(None)
def ex(c):
    return ''.join(ex(x) if (x.isalpha() and x in rules) else x for x in rules[c])
def expand_str(s):
    out=[]
    for x in s:
        if x.isalpha() and x in rules: out.append(ex(x))
        elif x.isalpha(): raise SystemExit(f'undefined letter {x!r} in body')
        else: out.append(x)
    return ''.join(out)
out = expand_str(body)
for k in order: print(f'{k!r}: {rules[k]!r} -> {ex(k)!r}', file=sys.stderr)
sys.stdout.write(out)
