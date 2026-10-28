// X53: blind-decode sample for the DIPTYCHON carray variant (fresh bytes).
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { diptychonPlan } from '../../src/lib/omega/diptychon';
const ENC = 'o200k_base' as const;
fs.mkdirSync('bench/x53/blind2/visible', { recursive: true });
fs.mkdirSync('bench/x53/blind2/hidden', { recursive: true });
fs.mkdirSync('bench/x53/blind2/decode', { recursive: true });

// fresh deterministic bytes -> xxd -i-shaped array via python (xxd absent in
// sandbox; shape per xxd -i defaults: 12/line, 2-space indent, 0x, no last comma)
execSync('python3 -c "import sys; sys.stdout.buffer.write(bytes(((i*73+41) ^ (i>>2)) & 255 for i in range(240)))" > /tmp/blind2.bin');
const arr = execSync('python3 - <<\'PYEOF\'\ndata=open("/tmp/blind2.bin","rb").read()\nlines=[]\nfor i in range(0,len(data),12):\n    ch=data[i:i+12]\n    lines.append("  "+", ".join("0x%02x"%b for b in ch)+("," if i+12<len(data) else ""))\nprint("unsigned char cert_der[] = {")\nprint("\\n".join(lines))\nprint("};")\nprint("unsigned int cert_der_len = 240;")\nPYEOF', { encoding: 'utf8' });

const p = diptychonPlan(arr, ENC);
if (!p) { console.log('NO PLAN'); process.exit(1); }
fs.writeFileSync('bench/x53/blind2/visible/C1.message', p.contract + '\n' + p.reducedText);
fs.writeFileSync('bench/x53/blind2/hidden/C1.orig', arr);
console.log('C1 ready fmt=' + p.spec.format + ' compact=' + p.spec.compact);
