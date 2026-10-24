/** X40 step 1 — read the RULE TAPE, which the census says is 60-85% of the message. */
import * as fs from 'node:fs';
import { ouraEncode } from '@/lib/omega/oura';
import { countTokens } from '@/lib/omega/bpe';
const enc: any = 'o200k_base';
for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p, 'utf8');
  const r: any = ouraEncode(t, enc);
  const w: string = r.wire;
  const start = w.indexOf('\u00a7');
  const sep = w.indexOf('\u00b6');
  const tape = start >= 0 && sep > start ? w.slice(start + 1, sep) : '';
  const body = sep >= 0 ? w.slice(sep + 1) : w;
  console.log('=== ' + p.split('/').pop() + '  M=' + r.messageTokens +
    '  tapeTok=' + countTokens(tape, enc) + '  tapeChars=' + tape.length +
    '  bodyTok=' + countTokens(body, enc) + '  parent=' + r.parent);
  if (process.env.SHOW) console.log('TAPE>>>' + tape.slice(0, Number(process.env.SHOW)) + '<<<');
  if (process.env.BODY) console.log('BODY>>>' + body.slice(0, Number(process.env.BODY)) + '<<<');
}
