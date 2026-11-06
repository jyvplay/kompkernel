/** Print ONLY the contracted message. The source is never printed. */
import * as fs from 'node:fs';
import { brachylogiaEncode } from '../../src/lib/omega/brachylogia';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const p = process.argv[2];
const r = brachylogiaEncode(fs.readFileSync(p, 'utf8'), enc, tagstackEncode as any);
console.log(`--- applied ${r.applied} clauses ${r.clausesRewritten} tokens ${r.messageTokens} (frontier ${r.frontierTokens})`);
console.log(r.message);
