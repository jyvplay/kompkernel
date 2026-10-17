#!/usr/bin/env python3
"""
Independent LEXIS decoder, written from the contract text alone.

Contract (from the message, verbatim):
  "Before ¶ a new foreign letter labels text up to the next new letter. After ¶
   expand all repeatedly; print result only. Finally, after . , ; : insert one
   space unless a space or line break already follows."

Nothing from src/lib/omega is imported or consulted.
"""
import sys

msg = open('bench/x22/receipts/selfdecode/sample-message.txt', newline='').read()
nl  = msg.rindex('\n')
wire, contract = msg[:nl], msg[nl+1:]
print('contract:', contract)

# ---- split wire at the paragraph mark
p = wire.index('\U000000b6')          # ¶
tape, body = wire[:p], wire[p+1:]

# ---- The tape: strip the section-sign opener, then read delimiter-free.
#      Each NEW non-ASCII letter opens a rule whose text runs until the next
#      letter that has not yet been used as a glyph.
if tape.startswith('\U000000a7'):     # §
    tape = tape[1:]

def scripted(ch):
    return ord(ch) > 127

rules, used, i = {}, set(), 0
while i < len(tape):
    g = tape[i]
    assert scripted(g) and g not in used, f'bad glyph {g!r} at {i}'
    used.add(g)
    j = i + 1
    while j < len(tape) and not (scripted(tape[j]) and tape[j] not in used):
        j += 1
    rules[g] = tape[i+1:j]
    i = j
print(f'parsed {len(rules)} tape rules')

# ---- expand repeatedly until no glyph remains
out = body
for _ in range(200):
    if not any(ch in rules for ch in out):
        break
    out = ''.join(rules.get(ch, ch) for ch in out)
assert not any(ch in rules for ch in out), 'expansion did not converge'
print('expanded chars:', len(out))

# ---- sentinel clause from the contract: "Also read ~ as . with no space
#      after it."  Sentinels are parsed BEFORE the junction rule, so that the
#      space-insertion rule never fires on a sentinel's own expansion.
SENTINEL = {'~': '.'}

# ---- junction unfold: after . , ; : insert one space unless a space or a
#      line break already follows
res = []
k = 0
while k < len(out):
    ch = out[k]
    nxt = out[k+1] if k+1 < len(out) else None
    if ch in SENTINEL and nxt is not None and not nxt.isspace():
        res.append(SENTINEL[ch])     # literal mark, explicitly no space
        res.append(nxt)
        k += 2
        continue
    res.append(ch)
    if ch in '.,;:' and nxt is not None and nxt not in (' ', '\n', '\r', '\t'):
        res.append(' ')
    k += 1
final = ''.join(res)

src = open('bench/x22/receipts/selfdecode/sample-src.txt', newline='').read()
print('decoded chars:', len(final), ' source chars:', len(src))
print('BYTE-EXACT:', final == src)
if final != src:
    for k in range(min(len(final), len(src))):
        if final[k] != src[k]:
            print('first diff at', k)
            print('  got :', repr(final[max(0,k-60):k+60]))
            print('  want:', repr(src[max(0,k-60):k+60]))
            break
    sys.exit(1)
