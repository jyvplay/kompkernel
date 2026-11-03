import * as fs from 'node:fs';
import { austereEncode } from '../../src/lib/omega/austere';
const enc: any = 'o200k_base';
const r: any = austereEncode(fs.readFileSync(process.argv[2], 'utf8'), enc);
if (!r.applied) { console.error('fell back: ' + r.tried.join(' ')); process.exit(2); }
fs.writeFileSync(process.argv[3], r.message);
console.error(`${process.argv[2]}: ${r.messageTokens} tok (brachys ${r.brachysTokens}, frontier ${r.frontierTokens}); contract ${r.contractTokens}; wrote ${process.argv[3]}`);
