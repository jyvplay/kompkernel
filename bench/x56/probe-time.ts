import * as fs from 'node:fs';
import { isoskelesPlan } from '../../src/lib/omega/isoskeles';
const ENC = 'o200k_base' as const;
const t = process.argv[2]!;
const text = fs.readFileSync(t, 'utf8');
const t0 = Date.now();
const p = isoskelesPlan(text, ENC);
console.log(t, 'plan=', !!p, 'ms=', Date.now() - t0);
