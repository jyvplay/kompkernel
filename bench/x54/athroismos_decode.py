#!/usr/bin/env python3
"""X54: independent ATHROISMOS decoder, written from the contract text.
Parses delimiter, target field/name, start value, drivers, scale, German
format and exceptions out of the contract sentence itself; re-integrates
the running column with exact integer (scaled) arithmetic.

Usage: athroismos_decode.py contract.txt reduced.txt > decoded.txt
"""
import csv, io, re, sys

def parse_num(s, de):
    if de:
        s = s.replace('.', '').replace(',', '.')
    if '.' in s:
        ip, fp = s.split('.')
    else:
        ip, fp = s, ''
    neg = ip.startswith('-')
    ip = ip.lstrip('+-')
    v = int(ip + fp) if (ip + fp) else 0
    return (-v if neg else v), len(fp)

def render(v, scale, de):
    neg = v < 0
    a = str(abs(v)).rjust(scale + 1, '0')
    ip = a if scale == 0 else a[:-scale]
    fp = '' if scale == 0 else a[-scale:]
    if de:
        groups = []
        while len(ip) > 3:
            groups.append(ip[-3:]); ip = ip[:-3]
        groups.append(ip)
        ip = '.'.join(reversed(groups))
        return ('-' if neg else '') + ip + ('' if scale == 0 else ',' + fp)
    return ('-' if neg else '') + ip + ('' if scale == 0 else '.' + fp)

def main() -> None:
    contract = open(sys.argv[1]).read().strip()
    reduced = open(sys.argv[2]).read()
    assert contract.startswith('ATHROISMOS:'), contract[:40]
    m = re.search(r'insert (?:("([^"]*)")|a field) as field (\d+) of the header and each row of '
                  r'the (comma|tab|semicolon|pipe)-separated table: hold a running value, '
                  r'([^ ]+) before data row 1; each row\'s inserted value = running value '
                  r'([+-] (?:\{[^}]+\}|field \d+)(?: [+-] (?:\{[^}]+\}|field \d+))*) \(empty field = 0\), written '
                  r'(?:with exactly (\d+) decimals|as an integer), and becomes the running '
                  r'value for the next row(; except (.+?) \(continue running from each printed '
                  r'exception value\))?\.', contract)
    assert m, contract
    name = m.group(2)
    col1 = int(m.group(3))
    delim = {'comma': ',', 'tab': '\t', 'semicolon': ';', 'pipe': '|'}[m.group(4)]
    start_text = m.group(5)
    formula = m.group(6)
    scale = int(m.group(7)) if m.group(7) else 0
    de = 'German format' in contract
    exceptions = {}
    if m.group(9):
        for e in m.group(9).split(', '):
            em = re.fullmatch(r'data row (\d+) = (.+)', e)
            assert em, e
            exceptions[int(em.group(1))] = em.group(2)

    rdr = csv.reader(io.StringIO(reduced), delimiter=delim)
    rows = list(rdr)
    header = rows[0]
    def colidx(ref):
        if ref.startswith('{'):
            # name lookup happens in the REDUCED header: already a reduced index
            return header.index(ref[1:-1])
        n1 = int(ref.split()[1])
        return (n1 - 1) - 1 if (n1 - 1) > col1 - 1 else (n1 - 1)
    terms = re.findall(r'([+-]) (\{[^}]+\}|field \d+)', formula)
    assert terms, formula
    drivers = [(1 if s == '+' else -1, colidx(r)) for s, r in terms]

    start, sscale = parse_num(start_text, de)
    assert sscale == scale or scale == 0
    prev = start
    out_rows = []
    # header
    h = list(header)
    h.insert(col1 - 1, name if name is not None else '')
    out_rows.append(h)
    for i, row in enumerate(rows[1:], start=1):
        step = 0
        for sign, ci in drivers:
            celltxt = row[ci]
            if celltxt == '':
                continue
            v, csc = parse_num(celltxt, de)
            assert csc == scale, (celltxt, csc, scale)
            step += sign * v
        val = prev + step
        if i in exceptions:
            txt = exceptions[i]
            val, esc = parse_num(txt, de)
            assert esc == scale
        else:
            txt = render(val, scale, de)
        r = list(row)
        r.insert(col1 - 1, txt)
        out_rows.append(r)
        prev = val

    # produce output preserving the original quoting style as much as csv allows:
    # re-emit line by line, splicing the inserted RAW field into the raw line
    raw_lines = reduced.split('\n')
    eol_last = raw_lines[-1] == ''
    if eol_last:
        raw_lines = raw_lines[:-1]
    assert len(raw_lines) == len(out_rows), (len(raw_lines), len(out_rows))
    lines = []
    for li, raw in enumerate(raw_lines):
        # find raw field spans with a quote-aware scan
        spans = []
        j = 0
        n = len(raw)
        while True:
            start_j = j
            if j < n and raw[j] == '"':
                j += 1
                while j < n:
                    if raw[j] == '"':
                        if j + 1 < n and raw[j + 1] == '"':
                            j += 2
                        else:
                            j += 1
                            break
                    else:
                        j += 1
            else:
                while j < n and raw[j] != delim:
                    j += 1
            spans.append(raw[start_j:j])
            if j >= n:
                break
            j += 1  # skip delim
            if j == n:
                spans.append('')
                break
        ins = out_rows[li][col1 - 1]
        if li == 0 and (delim in ins or '"' in ins):
            ins = '"' + ins.replace('"', '""') + '"'
        spans.insert(col1 - 1, ins)
        lines.append(delim.join(spans))
    sys.stdout.write('\n'.join(lines) + ('\n' if eol_last else ''))

if __name__ == '__main__':
    main()
