/**
 * X68 ENGRAMMA cold-process timing. One lane, one mode (memo on/off), fresh
 * process, so the shared pure tokenizer caches start cold in both arms. Emits
 * the complete message SHA-256, the frontier cost vector and the wall clock.
 */
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { siblingTemplateEncode } from '../../src/lib/omega/sibling-template';
import { countTokens } from '../../src/lib/omega/bpe';
import { engramStats } from '../../src/lib/omega/engram';
const enc: any = 'o200k_base';
const [path, mode] = process.argv.slice(2);
if (mode === 'off') process.env.OMEGA_ENGRAM = '0';
const text = fs.readFileSync(path, 'utf8');
const t0 = Date.now();
const r = tagstackEncode(text, enc);
const sib = siblingTemplateEncode(text, enc, r);
const ms = Date.now() - t0;
console.log(JSON.stringify({
  path, mode, ms, chars: text.length, rawTokens: countTokens(text, enc),
  frontierCosts: r.frontierCosts, min: Math.min(...Object.values(r.frontierCosts).map(Number)),
  winner: r.parentCodec, exact: r.decoded === text,
  messageSha256: crypto.createHash('sha256').update(r.message, 'utf8').digest('hex'),
  siblingSha256: crypto.createHash('sha256').update(sib.message, 'utf8').digest('hex'),
  stats: { ...engramStats },
}));
