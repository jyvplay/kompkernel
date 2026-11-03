/**
 * X73 probe 10 — the admissibility split.
 *
 * The registry has 236 codecs. The sweep shows that the cheapest messages on
 * several lanes come from codecs that ship NO contract — e.g. cue-sheet 127 via
 * logos, whose message is `Ω!万01万01!,1,0乙[AN1]...` with nothing that says what
 * any of it means. Those messages are byte-exact only for a PROGRAM that owns the
 * table, which is exactly what the access model forbids.
 *
 * So the question that decides this turn: among codecs whose message carries a
 * printable rule a reader can execute, is tagstack actually the minimum? This
 * probe measures the admissible family lane by lane.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { codecEntries } from '../../src/lib/omega/registry';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const KEYS = (process.env.KEYS ?? 'austere,brachys,hyle,kanon,aion,timema,symploke,apographe,metron,diastema,arithmos,hemera,kannabos,kephalaion,tabmin,stichos').split(',');
const entries = codecEntries().filter(e => KEYS.includes(e.key));
console.error(`admissible candidates: ${entries.map(e => e.key).join(' ')}`);
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const base: any = tagstackEncode(t, enc);
  const rows: Array<[string, number, boolean]> = [];
  for (const e of entries) {
    try {
      const r: any = await e.run(t, enc);
      const tok = r.oneChat ?? countTokens(r.output ?? '', enc);
      rows.push([e.key, tok, r.decoded === t]);
    } catch { }
  }
  rows.sort((a, b) => a[1] - b[1]);
  const below = rows.filter(r => r[2] && r[1] < base.messageTokens);
  console.log(`${p.split('/').pop().padEnd(22)} frontier ${String(base.messageTokens).padStart(5)} (${base.parentCodec}) | best ${rows.slice(0, 4).map(r => `${r[0]}:${r[1]}${r[2] ? '' : '!'}`).join(' ')} | BELOW ${below.map(r => `${r[0]}:${r[1]}`).join(' ') || 'none'}`);
}
