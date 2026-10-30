# X52: importable xxd / hexdump -C emulators (documented layouts) + CLI.
# Used only to produce test fixtures; DIPTYCHON never trusts these — it
# verifies every input by byte-exact re-rendering from inferred parameters.
import sys
def gutter(bs): return ''.join(chr(b) if 0x20 <= b <= 0x7e else '.' for b in bs)
def xxd(data, upper=False, group=2, cols=16, decimal=False, autoskip=False):
    H = ('%02X' if upper else '%02x')
    out = []
    fieldw = (cols // group) * (2 * group) + (cols // group - 1)
    prev_zero = False; star = False
    for i in range(0, len(data), cols):
        chunk = data[i:i+cols]
        is_zero = len(chunk) == cols and all(b == 0 for b in chunk)
        if autoskip and is_zero and prev_zero:
            if not star: out.append('*'); star = True
            continue
        star = False; prev_zero = is_zero
        off = ('%08d' % i) if decimal else ('%08x' % i)
        groups = [''.join(H % b for b in chunk[j:j+group]) for j in range(0, len(chunk), group)]
        out.append(f"{off}: {' '.join(groups).ljust(fieldw)}  {gutter(chunk)}")
    return '\n'.join(out) + '\n'
def hexdumpC(data, squeeze=True):
    out = []; prev = None; star = False
    for i in range(0, len(data), 16):
        chunk = data[i:i+16]
        if squeeze and chunk == prev and len(chunk) == 16:
            if not star: out.append('*'); star = True
            continue
        star = False; prev = chunk
        cells = []
        for j in range(16):
            if j == 8: cells.append(' ')
            cells.append(('%02x ' % chunk[j]) if j < len(chunk) else '   ')
        out.append(f"{i:08x}  {''.join(cells)} |{gutter(chunk)}|")
    out.append(f"{len(data):08x}")
    return '\n'.join(out) + '\n'
if __name__ == '__main__':
    fmt, path = sys.argv[1], sys.argv[2]
    opts = sys.argv[3] if len(sys.argv) > 3 else ''
    data = open(path, 'rb').read()
    if fmt == 'xxd':
        sys.stdout.write(xxd(data, upper='u' in opts, group=int(opts.split('g')[1][0]) if 'g' in opts else 2,
                             decimal='d' in opts, autoskip='a' in opts))
    elif fmt == 'hdC':
        sys.stdout.write(hexdumpC(data, squeeze='n' not in opts))
    else:
        sys.exit(2)
