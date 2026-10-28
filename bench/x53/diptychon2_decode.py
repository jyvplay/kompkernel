#!/usr/bin/env python3
"""X53: independent decoder for the DIPTYCHON VARIANT contracts (plain od,
C arrays), written from the contract text. Parses the parameters out of the
contract sentence itself.

Usage: diptychon2_decode.py contract.txt reduced.txt > decoded.txt
"""
import re, sys

def main() -> None:
    contract = open(sys.argv[1]).read().strip()
    reduced = open(sys.argv[2]).read()
    assert contract.startswith('DIPTYCHON:'), contract[:40]
    lines = reduced.split('\n')
    assert lines[-1] == ''
    lines = lines[:-1]

    def parse_hex_line(s):
        if ' ' in s:
            parts = s.split(' ')
            if all(re.fullmatch(r'[0-9a-f]{2}', p) for p in parts):
                return [int(p, 16) for p in parts]
            return None
        if re.fullmatch(r'[0-9a-f]+', s) and len(s) % 2 == 0 and len(s) >= 2:
            return [int(s[i:i+2], 16) for i in range(0, len(s), 2)]
        return None

    out = []
    if 'C byte array' in contract:
        m = re.search(r'Rewrite each such line as: (\d+) spaces, then its bytes each as (0[xX]) '
                      r'followed by 2 (upper-case )?hex digits, (joined by a comma and a space|'
                      r'joined by commas with no spaces), (\d+) bytes per line \(the last data line '
                      r'may hold fewer\), with a comma right after the last byte of every data line'
                      r'( except the last data line)?', contract)
        assert m, contract
        indent = int(m.group(1)); prefix = m.group(2); upper = bool(m.group(3))
        sep = ', ' if m.group(4) == 'joined by a comma and a space' else ','
        per_line = int(m.group(5)); except_last = bool(m.group(6))
        parsed = [parse_hex_line(l) for l in lines]
        # data lines: hex-parseable with <= per_line bytes
        is_data = [p is not None and len(p) <= per_line for p in parsed]
        last_data = max((i for i, d in enumerate(is_data) if d), default=-1)
        def hx(b):
            s = format(b, '02x')
            return s.upper() if upper else s
        for i, line in enumerate(lines):
            if is_data[i]:
                items = sep.join(prefix + hx(b) for b in parsed[i])
                comma = '' if (i == last_data and except_last) else ','
                out.append(' ' * indent + items + comma)
            else:
                out.append(line)
    elif 'od dump with no ASCII panel' in contract:
        mg = re.search(r'Rewrite each such line as: (.+?), then (each byte preceded by a space '
                       r'as 2 hex digits|the bytes grouped in 2s, each group preceded by a space '
                       r'and written as 4 hex digits) \(no padding on a short last line\)', contract)
        assert mg, contract
        offspec, grouping = mg.group(1), mg.group(2)
        group = 2 if grouping.startswith('the bytes grouped') else 1
        mo = re.match(r'the byte offset in (hex|octal|decimal) \((\d+) times the data-line index '
                      r'from 0(?: plus (\d+))?\), zero-padded to (\d+) digits', offspec)
        if offspec == 'no offset':
            radix, n, base, width = 0, 16, 0, 0
        else:
            assert mo, offspec
            radix = {'hex': 16, 'octal': 8, 'decimal': 10}[mo.group(1)]
            n = int(mo.group(2)); base = int(mo.group(3) or 0); width = int(mo.group(4))
        squeeze = 'line containing only *' in contract
        def fmt_off(v):
            s = format(v, 'x') if radix == 16 else format(v, 'o') if radix == 8 else str(v)
            return s.rjust(width, '0')
        # final offset line: a last line that is just a number in the radix of
        # exactly `width` digits whose value equals base + the byte total of
        # all PRECEDING lines (its own hex-parse as bytes does not count).
        items = [(line, parse_hex_line(line)) for line in lines]
        preceding_total = sum(len(b) for _, b in items[:-1] if b is not None)
        cum = 0; prev = None; in_star = False
        for idx, (line, b) in enumerate(items):
            is_last = idx == len(items) - 1
            if (is_last and radix != 0 and re.fullmatch(r'[0-9a-fA-F]+', line)
                    and len(line) == width and int(line, radix) == base + preceding_total):
                out.append(fmt_off(base + cum)); prev = None; in_star = False
                continue
            if b is None:
                out.append(line); prev = None; in_star = False
                continue
            full = len(b) == n
            if squeeze and full and prev is not None and b == prev:
                if not in_star:
                    out.append('*'); in_star = True
            else:
                off = '' if radix == 0 else fmt_off(base + cum)
                groups = []
                for i in range(0, len(b), group):
                    groups.append(' ' + ''.join(format(x, '02x') for x in b[i:i+group]))
                out.append(off + ''.join(groups))
                in_star = False; prev = b
            cum += len(b)
    else:
        raise AssertionError('unknown DIPTYCHON variant contract: ' + contract[:80])
    sys.stdout.write('\n'.join(out) + '\n')

if __name__ == '__main__':
    main()
