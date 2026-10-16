#!/usr/bin/env python3
"""
SECOND, INDEPENDENT IMPLEMENTATION OF THE TYPOS READER (CPython, no Node).

Written from the contract prose alone. The message a reader receives is

    <LAKONIKOS-D decoder prompt: CHIRON wire + its rule sentences>
    <one TYPOS sentence>

and the TYPOS sentence is one of

    "Digits are packed; split each digit run to its shape (9=digit): S1, S2, ... ."
    "... . Leave a digit run inside a word alone."
    "A mark before a digit run gives its shape; drop the mark and split (9=digit):
     M1=S1, M2=S2, ... ."

Procedure, exactly as the prose says:
  1. Split the message at the first line that starts with "Digits are packed" or
     "A mark before a digit run". Everything above it is the CHIRON message; the
     line itself is the TYPOS rule. If there is no such line the message is a
     plain LAKONIKOS-D message and only step 2 runs.
  2. Decode the CHIRON message with bench/chiron_decode.py (independent reader,
     verified on DAEDALUS-D wires in X16).
  3. Parse the shapes out of the TYPOS sentence and expand the digit runs.

The shape parsing is deliberately done from the printed sentence, not from a
side channel, so agreement with the TypeScript encoder is evidence about the
SPECIFICATION.

usage:  python3 bench/typos_decode.py messages.json out.json
        (messages.json is a list of full one-chat message strings)
"""
import json
import re
import sys

sys.path.insert(0, __file__.rsplit('/', 1)[0])
from chiron_decode import decode as chiron_decode  # noqa: E402

PACKED = "Digits are packed; split each digit run to its shape (9=digit): "
MARKED = "A mark before a digit run gives its shape; drop the mark and split (9=digit): "
ISOLATED_CLAUSE = "Leave a digit run inside a word alone."

WORD = re.compile(r'[\W\d]', re.UNICODE)  # not used directly; see is_word_char


def is_word_char(ch):
    if ch is None or ch == '':
        return False
    return ch.isalnum()  # Unicode-aware: letters and numbers of any script


def parse_sentence(line):
    """-> (mode, shapes, marks, isolated)"""
    if line.startswith(MARKED):
        body = line[len(MARKED):].rstrip('.')
        shapes, marks = [], []
        for part in body.split(','):
            part = part.strip()
            if not part:
                continue
            m, _, sh = part.partition('=')
            marks.append(m.strip())
            shapes.append(sh.strip())
        return 'marked', shapes, marks, False
    if line.startswith(PACKED):
        rest = line[len(PACKED):]
        isolated = ISOLATED_CLAUSE in rest
        body = rest.split(ISOLATED_CLAUSE)[0].rstrip('. ').rstrip('.')
        shapes = [p.strip() for p in body.split(',') if p.strip()]
        return 'strict', shapes, [], isolated
    return None, [], [], False


def fill(shape, digits):
    out = []
    i = 0
    for ch in shape:
        if ch == '9':
            if i >= len(digits):
                return None
            out.append(digits[i])
            i += 1
        else:
            out.append(ch)
    return ''.join(out) if i == len(digits) else None


def expand(text, shapes, marks, isolated):
    if not shapes:
        return text
    if marks:
        by_mark = dict(zip(marks, shapes))
        pat = re.compile('[' + re.escape(''.join(marks)) + ']([0-9]+)')

        def rep(m):
            sh = by_mark.get(m.group(0)[0])
            if sh is None:
                return m.group(0)
            return fill(sh, m.group(1)) or m.group(0)
        return pat.sub(rep, text)

    by_len = {}
    for sh in shapes:
        by_len[sh.count('9')] = sh
    out = []
    last = 0
    for m in re.finditer(r'[0-9]+', text):
        i = m.start()
        sh = by_len.get(len(m.group(0)))
        if sh is None:
            continue
        if isolated:
            prev = text[i - 1] if i > 0 else ''
            nxt = text[m.end()] if m.end() < len(text) else ''
            if is_word_char(prev) or is_word_char(nxt):
                continue
        rep = fill(sh, m.group(0))
        if rep is None:
            continue
        out.append(text[last:i])
        out.append(rep)
        last = m.end()
    out.append(text[last:])
    return ''.join(out)


CHIRON_CLAUSE = re.compile(r'^(New .{1,60} before \u00b6|Print the text after \u00b6|\u00d7|\u2026)')


def decode_message(message):
    """message = <CHIRON wire>\n<CHIRON clause line>\n<TYPOS sentence>  (or fewer parts).

    chironDecoderPrompt renders `wire + '\n' + clauses` where the clauses are a
    SINGLE line, and TYPOS appends its own single line. So the reader peels the
    last line (its own rule) and then the CHIRON clause line, and what is left is
    the wire. The clause line is recognised by its opener, which the generated
    contract always uses.
    """
    lines = message.split('\n')
    idx = None
    for k in range(len(lines) - 1, -1, -1):
        if lines[k].startswith(PACKED) or lines[k].startswith(MARKED):
            idx = k
            break
    if idx is None:
        return chiron_decode(message), 'none', []
    mode, shapes, marks, isolated = parse_sentence(lines[idx])
    rest = lines[:idx]
    if rest and CHIRON_CLAUSE.match(rest[-1]):
        rest = rest[:-1]
    body = chiron_decode('\n'.join(rest))
    return expand(body, shapes, marks, isolated), mode, shapes


def main():
    src, dst = sys.argv[1], sys.argv[2]
    with open(src, encoding='utf-8') as fh:
        messages = json.load(fh)
    out = []
    for m in messages:
        try:
            text, mode, shapes = decode_message(m)
        except Exception as exc:  # noqa: BLE001
            text, mode, shapes = None, 'error:%s' % exc, []
        out.append({'decoded': text, 'rule': mode, 'shapes': shapes})
    with open(dst, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False)
    print('wrote %d decodes to %s' % (len(out), dst))


if __name__ == '__main__':
    main()
