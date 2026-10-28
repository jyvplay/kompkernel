# X52 fixture generator. od fixtures come from real GNU od (shell); xxd and
# hexdump -C fixtures are EMULATED here per their documented layouts because
# neither tool exists in this sandbox. DIPTYCHON verifies any input byte-exact
# from inferred parameters, so emulation fidelity affects coverage, not truth.
import sys
def gutter(bs): return ''.join(chr(b) if 0x20 <= b <= 0x7e else '.' for b in bs)
def xxd(data, upper=False, group=2, cols=16, decimal=False):
    H = ('%02X' if upper else '%02x')
    out = []
    fieldw = (cols // group) * (2 * group) + (cols // group - 1)
    for i in range(0, len(data), cols):
        chunk = data[i:i+cols]
        off = ('%08d' % i) if decimal else ('%08x' % i)
        groups = []
        for j in range(0, len(chunk), group):
            groups.append(''.join(H % b for b in chunk[j:j+group]))
        hexfield = ' '.join(groups).ljust(fieldw)
        out.append(f"{off}: {hexfield}  {gutter(chunk)}")
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
for name, srcpath in [('bin', '/tmp/x52-bin8k'), ('txt', '/tmp/x52-txt8k')]:
    data = open(srcpath, 'rb').read()
    open(f'bench/x52/fixtures/xxd-{name}.txt', 'w').write(xxd(data))
    open(f'bench/x52/fixtures/hdC-{name}.txt', 'w').write(hexdumpC(data))
data = open('/tmp/x52-bin8k', 'rb').read()
open('bench/x52/fixtures/xxd-upper.txt', 'w').write(xxd(data, upper=True))
print('emulated fixtures written')
