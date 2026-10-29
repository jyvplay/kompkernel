#!/usr/bin/env python3
"""X55 KEPHALAION from-contract decoder.

Reads a payload file whose first line is the KEPHALAION contract followed by
the reduced table; executes ONLY the contract prose (regex-parsed English),
and writes the restored table. No knowledge of the TS implementation beyond
the contract text.
"""
import decimal
import re
import sys


def parse_num(s, de):
    if s == '':
        return decimal.Decimal(0)
    if de:
        s = s.replace('.', '').replace(',', '.')
    return decimal.Decimal(s)


def render(v, decimals, de):
    if decimals == 0:
        assert v == int(v), f'non-integer {v} at scale 0'
        s = str(int(v))
    else:
        q = decimal.Decimal(10) ** -decimals
        s = format(v.quantize(q), f'.{decimals}f')
    if de:
        whole, _, frac = s.partition('.')
        neg = whole.startswith('-')
        if neg:
            whole = whole[1:]
        groups = []
        while len(whole) > 3:
            groups.append(whole[-3:])
            whole = whole[:-3]
        groups.append(whole)
        whole = '.'.join(reversed(groups))
        s = ('-' if neg else '') + whole + ((',' + frac) if frac or decimals else '')
    return s


def restore(contract, body):
    semi = 'semicolon-separated' in contract
    tab = 'tab-separated' in contract
    delim = ';' if semi else ('\t' if tab else ',')
    de = 'German format' in contract
    trailing = body.endswith('\n')
    lines = body.split('\n')
    if trailing:
        lines = lines[:-1]
    rows = [ln.split(delim) for ln in lines]
    header = rows[0]

    def written_decimals(clause):
        m = re.search(r'written with exactly (\d+) decimals', clause)
        if m:
            return int(m.group(1))
        assert 'written as an integer' in clause, clause
        return 0

    m = re.search(r'insert "(.*)" as field (\d+) of the header and each row: the inserted value = (.*?)(?: \(except ([^)]*)\))?\.', contract)
    if m:
        name, pos, rhs, exc_text = m.group(1), int(m.group(2)), m.group(3), m.group(4)
        decimals = written_decimals(rhs)
        exc = {}
        if exc_text:
            for mm in re.finditer(r'data row (\d+) = ([^,()]+(?:,\d+)?)', exc_text):
                exc[int(mm.group(1))] = mm.group(2).strip()
        range_m = re.match(r'^the sum of fields (\d+) to (\d+) of the same row', rhs)
        idx = {h: i for i, h in enumerate(header)}
        out = [header[:pos - 1] + [name] + header[pos - 1:]]
        for ri, row in enumerate(rows[1:], start=1):
            if ri in exc:
                val = exc[ri]
            elif range_m:
                a, b = int(range_m.group(1)), int(range_m.group(2))
                s = sum(parse_num(row[c - 1], de) for c in range(a, b + 1))
                val = render(s, decimals, de)
            else:
                rhs_clean = re.sub(r', written .*', '', rhs)
                rhs_clean = rhs_clean.replace(' (empty field = 0)', '')
                names = re.findall(r'\{[^{}]*\}', rhs_clean)
                ops_str = rhs_clean
                for nm in names:
                    ops_str = ops_str.replace(nm, '#')
                parts_ops = [c for c in ops_str if c in '+-']
                vals = [parse_num(row[idx[nm[1:-1]]], de) for nm in names]
                s = vals[0]
                # first op char is the leading ' = ' context? rhs starts '= ...' is stripped by regex group; names order drives
                ops = parts_ops[:]
                # remove a spurious leading sign if rhs had 'the sum...'
                if len(ops) > len(vals) - 1:
                    ops = ops[-(len(vals) - 1):]
                for op, v in zip(ops, vals[1:]):
                    s = s + v if op == '+' else s - v
                val = render(s, decimals, de)
            out.append(row[:pos - 1] + [val] + row[pos - 1:])
        rows = out
        header = rows[0]

    m2 = re.search(r"fill data row (\d+)'s empty fields (.+?): each is the sum of its column over all other data rows, in that column's number format", contract)
    if m2:
        ridx = int(m2.group(1))
        raw_fields = [x.strip() for x in m2.group(2).split(', ')]
        idx = {h: i for i, h in enumerate(header)}
        for rf in raw_fields:
            if rf.startswith('{'):
                c = idx[rf[1:-1]]
            else:
                c = int(rf.replace('field ', '')) - 1
            if rows[ridx][c] != '':
                continue
            s = decimal.Decimal(0)
            col_decs = set()
            for ri, row in enumerate(rows):
                if ri == 0 or ri == ridx or row[c] == '':
                    continue
                s += parse_num(row[c], de)
                cell = row[c].replace('.', '').replace(',', '.') if de else row[c]
                col_decs.add(len(cell.split('.')[1]) if '.' in cell else 0)
            assert len(col_decs) == 1, ('column scale ambiguity', col_decs)
            rows[ridx][c] = render(s, col_decs.pop(), de)

    out = '\n'.join(delim.join(r) for r in rows)
    return out + ('\n' if trailing else '')


def main():
    payload = open(sys.argv[1], 'r', encoding='utf-8', newline='').read()
    nl = payload.index('\n')
    contract, body = payload[:nl], payload[nl + 1:]
    sys.stdout.write(restore(contract, body))


if __name__ == '__main__':
    main()
