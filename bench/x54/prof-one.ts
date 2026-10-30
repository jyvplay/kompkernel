import * as fs from 'node:fs';
import { archetyponEncode } from '../../src/lib/omega/archetypon';
const text = fs.readFileSync(process.argv[3] ?? 'bench/x52/fixtures/od-bin512.txt', 'utf8');
const t0 = Date.now();
const r: any = archetyponEncode(text, 'o200k_base' as const);
console.log(JSON.stringify({ parent: 'archetypon', ms: Date.now() - t0, exact: r.decoded === text, tokens: r.messageTokens }));
