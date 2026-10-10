/** bench/w13-baseline.ts — honest current-frontier measurement for W13. */
import fs from 'node:fs';
import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { daedalusEncode } from '../src/lib/omega/daedalus';
import { panoptesEncode } from '../src/lib/omega/panoptes';
import { metatronEncode } from '../src/lib/omega/metatron';
import { epistemeEncode } from '../src/lib/omega/episteme';
import { chironEncode, chironDecode } from '../src/lib/omega/chiron';
import { ariadneEncode } from '../src/lib/omega/ariadne';
import { CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, MOSAIC_HANDTRACE_300, mosaicFixtures } from './fixtures';

const ENC: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);

function lanes(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const f of fs.readdirSync('bench/holdout').sort()) out.push([`ho/${f.replace(/\.txt$/, '')}`, fs.readFileSync(path.join('bench/holdout', f), 'utf8')]);
  for (const f of ['doc3.txt','doc11.txt','lic-isc.txt']) out.push([`tr/${f.replace(/\.txt$/, '')}`, fs.readFileSync(path.join('bench/train', f), 'utf8')]);
  const f = mosaicFixtures();
  out.push(['CHAOS_900', CHAOS_900], ['CHAOS_F_LLM_REPORT', CHAOS_F_LLM_REPORT], ['prose', f.prose], ['chat-48', f.chat]);
  return out;
}

const codecs: Array<[string, (t: string) => { wire: string; decoded: string; messageTokens: number }]> = [
  ['DAEDALUS', (t) => { const r = daedalusEncode(t, ENC, { budgetMs: 1500 }); return { wire: r.wire, decoded: r.decoded, messageTokens: r.messageTokens }; }],
  ['PANOPTES', (t) => { const r = panoptesEncode(t, ENC, { budgetMs: 1500 } as any); return { wire: r.wire, decoded: r.decoded, messageTokens: r.messageTokens }; }],
  ['EPISTEME', (t) => { const r = epistemeEncode(t, ENC, { budgetMs: 1500 } as any); return { wire: r.wire, decoded: r.decoded, messageTokens: r.messageTokens }; }],
  ['METATRON', (t) => { const r = metatronEncode(t, ENC, { budgetMs: 1500 } as any); return { wire: r.wire, decoded: r.decoded, messageTokens: r.messageTokens }; }],
];

const rows: string[] = [];
console.log('lane'.padEnd(22), 'in'.padStart(7), ...codecs.map((c) => c[0].padStart(10)));
const tot = new Map<string, number>(codecs.map((c) => [c[0], 0]));
let totIn = 0;
for (const [lane, text] of lanes()) {
  const inT = T(text);
  totIn += inT;
  const cells: string[] = [];
  for (const [name, fn] of codecs) {
    const t0 = Date.now();
    let v = inT; let ok = false;
    try { const r = fn(text); ok = r.decoded === text; v = ok ? r.messageTokens : inT; } catch (e) { v = inT; }
    tot.set(name, (tot.get(name) ?? 0) + v);
    cells.push(`${ok ? '' : '!'}${v}`.padStart(10));
  }
  console.log(lane.padEnd(22), String(inT).padStart(7), ...cells);
}
console.log('-'.repeat(70));
console.log('TOTAL'.padEnd(22), String(totIn).padStart(7), ...codecs.map((c) => String(tot.get(c[0])).padStart(10)));
for (const [n] of codecs) console.log(n, 'savings vs raw:', (((totIn - (tot.get(n) ?? 0)) / totIn) * 100).toFixed(2) + '%');
