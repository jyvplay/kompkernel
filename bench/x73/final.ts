import * as fs from 'node:fs';
import { stadionEncode } from '../../src/lib/omega/stadion';
import { codecEntries } from '../../src/lib/omega/registry';
const t = fs.readFileSync('bench/holdout-x40/cue-sheet.md', 'utf8');
const r: any = stadionEncode(t, 'o200k_base' as any);
console.log('stadion:', r.messageTokens, 'parent', r.parentCodec, 'exact', r.decoded === t);
console.log('registry has stichomythia:', codecEntries().some(e => e.key === 'stichomythia'));
