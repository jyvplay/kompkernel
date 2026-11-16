#!/usr/bin/env python3
"""
bench/steli_decode.py
=============================================================================
INDEPENDENT ΣΤΉΛΗ (STELI) READER — CPython, no Node, written from the CONTRACT
PROSE and not from the TypeScript source.

What the reader is handed
-------------------------
One chat message. Its FIRST line is the ΣΤΉΛΗ contract:

    ‡0,56,74,86:26 rows single-spaced, field k at offset k, split from the right.
    <the parent codec's complete message, which decodes to the table with its
     columns stripped of padding and joined by single spaces>

or, when the table starts at column 0, the cheaper spelling

    ‡56,18,12:26 rows single-spaced, pad field k to width k.

Everything below is a literal transcription of those two sentences:

  * "26 rows"            -> the NEXT 26 lines after the parent's own preamble are
                            the single-spaced table rows.
  * "field k at offset k"/"pad field k to width k"
                        -> column k starts at the k-th number, and is padded out
                            with spaces until the next number (the last column is
                            written to the end of the line).
  * "single-spaced"      -> the fields are separated by exactly one space, so an
                            empty field shows up as two spaces in a row.
  * "split from the right" -> when splitting a row back into fields, count field
                            boundaries from the END of the row: the last k-1
                            spaces are the separators and field 0 keeps whatever
                            spaces remain. (Absent, they are counted from the
                            start: the first k-1 spaces separate, and the last
                            field keeps the rest.)
  * the marker line itself -> dropped.

Scope, stated plainly
---------------------
ΣΤΉΛΗ is a child layer: it re-pads what the parent decoded. This script verifies
the ΣΤΉΛΗ step against the parent's OUTPUT, which is supplied as a file. It does
not re-implement the parent codec (ΣΥΝΚΡΙΣΙΣ and its chain); that layer's
byte-exactness is witnessed in-process by the ΣΤΉΛΗ gates G4/G5 and by the
29-lane receipts in bench/x124/receipts-steli-wired.log. What this file proves is
the part a stock reader has to do from the contract sentence alone.

Usage
-----
    python3 bench/steli_decode.py MESSAGE_FILE [--parent PARENT_OUTPUT_FILE]
                                  [--check SRC] [--selftest]

    --parent FILE   the parent-decoded text (the table, single-spaced). When the
                    message file contains ONLY the contract plus that text, this
                    flag is unnecessary.
    --check SRC     decode and compare byte-for-byte against SRC.
    --selftest      run the built-in cases, including the two spellings and both
                    split directions.
"""
import re
import sys

MARKER = '\u2021'  # ‡

RE_WIDTHS = re.compile(
    r'^' + MARKER + r'(\d+(?:,\d+)*):(\d+) rows single-spaced, '
    r'pad field k to width k(, split from the right)?\.$')
RE_OFFSETS = re.compile(
    r'^' + MARKER + r'(\d+(?:,\d+)+):(\d+) rows single-spaced, '
    r'field k at offset k(, split from the right)?\.$')


def parse_contract(line):
    """Read the contract line exactly as written. None if it is not one."""
    m = RE_WIDTHS.match(line)
    if m:
        # the widths spelling implies a zero left margin: the numbers are the
        # widths of columns 0..k-2, the last column runs to the end of the line
        offsets = [0]
        for w in (int(x) for x in m.group(1).split(',')):
            offsets.append(offsets[-1] + w)
        return offsets, int(m.group(2)), bool(m.group(3))
    m = RE_OFFSETS.match(line)
    if m:
        offsets = [int(x) for x in m.group(1).split(',')]
        return offsets, int(m.group(2)), bool(m.group(3))
    return None


def split_row(row, k, split_right):
    """Undo `fields.join(' ')` under the stated direction."""
    parts = row.split(' ')
    if split_right:
        # the last k-1 spaces separate; field 0 keeps the rest
        if len(parts) < k:
            return None
        at = len(parts) - k
        fields = [' '.join(parts[:at + 1])]
        for j in range(1, k - 1):
            fields.append(parts[at + j])
        fields.append(parts[-1])
        return fields
    fields = parts[:k - 1]
    fields.append(' '.join(parts[k - 1:]))
    return fields


def re_pad(fields, offsets):
    """Place field k at offset k; the last field runs to the end of the line."""
    out = []
    for j, off in enumerate(offsets):
        while len(''.join(out)) < off:
            out.append(' ')
        if len(''.join(out)) > off:
            return None
        out.append(fields[j] if j < len(fields) else '')
    return ''.join(out)


def decode_message(message, parent_output=None):
    """The marker line lives inside the parent-decoded text: that is what tells
    the reader WHERE the block starts. So the reader decodes the parent first,
    then scans for a line that reads as the contract, drops it, and re-pads the
    `rows` lines that follow it."""
    text = parent_output if parent_output is not None else message
    lines = text.split('\n')
    at = None
    parsed = None
    for i, line in enumerate(lines):
        parsed = parse_contract(line)
        if parsed is not None:
            at = i
            break
    if at is None:
        raise ValueError('no ΣΤΉΛΗ contract line anywhere in the text')
    offsets, rows, split_right = parsed
    k = len(offsets)
    out = lines[:at] + lines[at + 1:]
    for i in range(at, min(at + rows, len(out))):
        fields = split_row(out[i], k, split_right)
        if fields is None:
            raise ValueError('row %d does not split into %d fields' % (i, k))
        rebuilt = re_pad(fields, offsets)
        if rebuilt is None:
            raise ValueError('row %d overflows its column' % i)
        out[i] = rebuilt
    return '\n'.join(out)


def selftest():
    ok = fail = 0

    def check(name, cond):
        nonlocal ok, fail
        if cond:
            ok += 1
        else:
            fail += 1
            print('FAIL %s' % name)

    # geometry, both spellings
    check('widths parse', parse_contract('‡56,18,12:26 rows single-spaced, pad field k to width k.')
          == ([0, 56, 74, 86], 26, False))
    check('widths are diffs, margin zero',
          parse_contract('‡8,8:9 rows single-spaced, pad field k to width k.')
          == ([0, 8, 16], 9, False))
    check('offsets parse',
          parse_contract('‡0,56,74,86:26 rows single-spaced, field k at offset k.')
          == ([0, 56, 74, 86], 26, False))
    check('split flag parses',
          parse_contract('‡56,18,12:26 rows single-spaced, pad field k to width k, split from the right.')
          == ([0, 56, 74, 86], 26, True))
    check('indented block uses the offsets spelling',
          parse_contract('‡2,30:9 rows single-spaced, field k at offset k.')
          == ([2, 30], 9, False))

    check('not a contract', parse_contract('# source: findmnt (real)') is None)

    # split directions
    check('split left', split_row('a b c d', 4, False) == ['a', 'b', 'c', 'd'])
    check('split left keeps tail', split_row('a b c d e', 4, False) == ['a', 'b', 'c', 'd e'])
    check('split right keeps head', split_row('a b c d e', 3, True) == ['a b c', 'd', 'e'])
    check('empty field', split_row('a  c', 3, False) == ['a', '', 'c'])

    # a whole block, left-to-right split, marker inside the text
    msg = ('# note\n‡0,8,16:4 rows single-spaced, field k at offset k.\n'
           'H1 H2 H3\na b c\ndd ee ff\nlonger g h')
    check('block decode', decode_message(msg) ==
          '# note\nH1      H2      H3\na       b       c\ndd      ee      ff\nlonger  g       h')
    check('marker line is dropped', '‡' not in decode_message(msg))

    # the findmnt shape: a first column that contains single spaces
    msg = ('‡0,12,20:3 rows single-spaced, field k at offset k, split from the right.\n'
           '/ a x\n| |-foo bar b y\n`-end c z')
    check('tree column survives', decode_message(msg) ==
          '/           a       x\n| |-foo bar b       y\n`-end       c       z')

    # an indented block keeps its margin
    check('margin kept', re_pad(['ab', 'cd'], [2, 10]) == '  ab      cd')
    print('selftest: %d pass, %d fail' % (ok, fail))
    return fail


def main(argv):
    if '--selftest' in argv:
        return 1 if selftest() else 0
    args = [a for a in argv[1:] if not a.startswith('--')]
    if not args:
        print(__doc__)
        return 2
    message = open(args[0], encoding='utf-8').read()
    parent = None
    if '--parent' in argv:
        parent = open(argv[argv.index('--parent') + 1], encoding='utf-8').read()
    out = decode_message(message, parent)
    if '--check' in argv:
        src = open(argv[argv.index('--check') + 1], encoding='utf-8').read()
        if out == src:
            print('EXACT: decoded output equals the source byte for byte')
            return 0
        print('MISMATCH')
        a, b = src.split('\n'), out.split('\n')
        for i in range(max(len(a), len(b))):
            if a[i:i + 1] != b[i:i + 1]:
                print('  line %d\n    src %r\n    got %r' % (i, (a[i:i + 1] or [''])[0][:120], (b[i:i + 1] or [''])[0][:120]))
                break
        return 1
    sys.stdout.write(out)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
