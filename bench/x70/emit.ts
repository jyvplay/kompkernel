import * as fs from 'node:fs';
import { brachysEncode } from '../../src/lib/omega/brachys';
const enc: any = 'o200k_base';
const p = process.argv[2], out = process.argv[3];
const r: any = brachysEncode(fs.readFileSync(p, 'utf8'), enc);
if (!r.brachys) { console.error('fell back: ' + r.notes); process.exit(2); }
fs.writeFileSync(out, r.message);
console.error(`${p}: ${r.messageTokens} tok (frontier ${r.frontierFloor}); contract ${r.contractTokens} + wire ${r.wireTokens}; wrote ${out}`);
