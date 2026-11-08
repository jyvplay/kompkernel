/** X82 battery: INTRA-TOKEN transforms. The frontier models repeated lines, fields,
 *  alignment and delimiters; it does NOT model character-level redundancy INSIDE a
 *  token (that is HARMOS's family). Test candidates that stay inside that lane. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';

type T = { id: string; probe: (S: string) => number; pack: (S: string) => string; unpack: (S: string) => string; clause: string };
const TS: T[] = [
  { // 100.0 -> 1000 ; every decimal must carry exactly s digits
    id: 'decimal',
    probe: (S) => (S.match(/\d+\.\d+/g) ?? []).length,
    pack: (S) => S.replace(/(\d+)\.(\d+)/g, '$1$2'),
    unpack: function (S) { const s = (this as any)._s as number; return S.replace(new RegExp(`(\\d+)(\\d{${s}})(?![\\d.])`, 'g'), '$1.$2'); },
    clause: '',
  } as any,
  { // user_0000 -> user0000 : underscore deleted before a digit run
    id: 'uscore',
    probe: (S) => (S.match(/[A-Za-z]+_\d+/g) ?? []).length,
    pack: (S) => S.replace(/([A-Za-z]+)_(\d+)/g, '$1$2'),
    unpack: (S) => S, // filled per-lane below
    clause: 'an underscore is deleted before a digit run',
  },
  { // 192.168.1.5 -> 192168001005 : octets zero-padded to 3
    id: 'ipv4',
    probe: (S) => (S.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g) ?? []).length,
    pack: (S) => S.replace(/\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g, (_m, a, b, c, d) => [a, b, c, d].map(x => x.padStart(3, '0')).join('')),
    unpack: (S) => S.replace(/(?<!\d)(\d{3})(\d{3})(\d{3})(\d{3})(?!\d)/g, (_m, a, b, c, d) => [a, b, c, d].map(x => String(+x)).join('.')),
    clause: 'a 12-digit run is four 3-digit IPv4 octets, join with dots',
  },
];

for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const n = p.split('/').pop()!;
  const base: any = tagstackFrontier(S, enc);
  console.log(`\n### ${n}  frontier ${base.messageTokens}`);
  for (const t of TS) {
    const cnt = t.probe(S);
    if (!cnt) { console.log(`  ${t.id.padEnd(9)} 0 sites`); continue; }
    if (t.id === 'decimal') {
      const decs = S.match(/\d+\.\d+/g)!;
      const scales = new Set(decs.map(d => d.split('.')[1].length));
      if (scales.size !== 1) { console.log(`  decimal   ${cnt} sites but scales {${[...scales].join(',')}} -> refuse`); continue; }
      const s = [...scales][0];
      const T = S.replace(/(\d+)\.(\d+)/g, '$1$2');
      const rt = T.replace(new RegExp(`(\\d+)(\\d{${s}})(?![\\d.])`, 'g'), '$1.$2') === S;
      const C = `§X82 decimals: the point is deleted; every number has ${s} decimal digit${s > 1 ? 's' : ''}.`;
      const ct = countTokens(C, enc);
      const fT: any = tagstackFrontier(T, enc);
      const f: any = tagstackFrontier(C + '\n' + T, enc);
      console.log(`  decimal   ${cnt} sites scale=${s} rt=${rt} rawΔ${countTokens(T, enc) - countTokens(S, enc)} contract ${ct} F ${base.messageTokens} -> ${f.messageTokens} (${f.messageTokens - base.messageTokens >= 0 ? '+' : ''}${f.messageTokens - base.messageTokens})`);
      continue;
    }
    const T = t.pack(S);
    const C = `§X82 ${t.clause}.`;
    const ct = countTokens(C, enc);
    const fT: any = tagstackFrontier(T, enc);
    const f: any = tagstackFrontier(C + '\n' + T, enc);
    console.log(`  ${t.id.padEnd(9)} ${cnt} sites rawΔ${countTokens(T, enc) - countTokens(S, enc)} contract ${ct} F ${base.messageTokens} -> ${f.messageTokens} (${f.messageTokens - base.messageTokens >= 0 ? '+' : ''}${f.messageTokens - base.messageTokens})`);
  }
}
