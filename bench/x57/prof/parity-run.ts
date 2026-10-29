// X57 speed-repair byte-parity check: one (codec, lane) per process.
// Prints sha256(message), tokens, exact, ms. Budget comes from env
// OMEGA_WORK_BUDGET (0 = unbounded = pre-X57 behavior; unset = default).
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { tagstackEncode } from '../../../src/lib/omega/tagstack';
import { archetyponEncode } from '../../../src/lib/omega/archetypon';
import { synkrisisEncode } from '../../../src/lib/omega/synkrisis';
const ENC = 'o200k_base' as const;
const [codec, lane] = process.argv.slice(2) as [string, string];
const text = fs.readFileSync(lane, 'utf8');
const t0 = Date.now();
let r: any;
if (codec === 'tagstack') r = tagstackEncode(text, ENC);
else if (codec === 'archetypon') r = archetyponEncode(text, ENC);
else if (codec === 'synkrisis') r = synkrisisEncode(text, ENC);
else throw new Error(codec);
const sha = crypto.createHash('sha256').update(r.message).digest('hex');
console.log(JSON.stringify({
  codec, lane, budget: process.env.OMEGA_WORK_BUDGET ?? 'default',
  ms: Date.now() - t0, tokens: r.messageTokens, exact: r.decoded === text, sha: sha.slice(0, 16),
}));
