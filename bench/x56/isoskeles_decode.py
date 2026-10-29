#!/usr/bin/env python3
"""X56 ISOSKELES from-contract decoder.

Reads a payload whose first line is the ISOSKELES contract followed by the
reduced (parent-decoded) table; executes ONLY the contract prose and writes
the restored table. No knowledge of the TS planner beyond the two contract
phrasings it can emit (named / positional), both regex-parsed here.
"""
import re
import sys


def restore(contract, body):
    delim = ';' if 'semicolon-separated' in contract else ('\t' if 'tab-separated' in contract else ',')
    trailing = body.endswith('\n')
    lines = body.split('\n')
    if trailing:
        lines = lines[:-1]
    # keep \r so CRLF round-trips byte-exactly
    crlf = lines and lines[0].endswith('\r')
    rows = [ln.rstrip('\r').split(delim) if crlf else ln.split(delim) for ln in lines]

    m_diag = re.search(r'A blank field on the diagonal \([^)]*\) is "([^"]*)"', contract)
    diag_const = m_diag.group(1) if m_diag else None

    named = 'form a symmetric square whose row names' in contract
    if named:
        m = re.search(r'fields (\d+) to (\d+) form a symmetric square', contract)
        f0, f1 = int(m.group(1)), int(m.group(2))
        n = f1 - f0 + 1
        lab = f0 - 2 if f0 >= 2 else None  # label column index (0-based), if any
        col_names = rows[0][f0 - 1:f1]
        row_names = [r[lab] if lab is not None else None for r in rows[1:1 + n]]
        assert row_names == col_names, 'name order mismatch'
        for i in range(n):
            ri_ = 1 + i
            for j in range(n):
                ci = f0 - 1 + j
                if rows[ri_][ci] == '':
                    if i == j:
                        rows[ri_][ci] = diag_const if diag_const is not None else ''
                    else:
                        rows[ri_][ci] = rows[1 + j][f0 - 1 + i]
    else:
        m = re.search(r'the square block of fields (\d+) to (\d+) across (data rows|rows) 1 to (\d+)', contract)
        f0, f1, kind, n = int(m.group(1)), int(m.group(2)), m.group(3), int(m.group(4))
        first_data = 1 if kind == 'data rows' else 0
        assert n == f1 - f0 + 1
        for r in range(n):
            for c in range(n):
                ci = f0 - 1 + c
                if rows[first_data + r][ci] == '':
                    if r == c:
                        rows[first_data + r][ci] = diag_const if diag_const is not None else ''
                    else:
                        rows[first_data + r][ci] = rows[first_data + c][f0 - 1 + r]

    eol = '\r\n' if crlf else '\n'
    out = eol.join(delim.join(r) for r in rows)
    return out + (eol if trailing else '')


def main():
    payload = open(sys.argv[1], 'r', encoding='utf-8', newline='').read()
    nl = payload.index('\n')
    sys.stdout.write(restore(payload[:nl], payload[nl + 1:]))


if __name__ == '__main__':
    main()
