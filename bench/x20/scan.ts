// X20 candidate scanner: for each *determined-shape* rule, measure the raw o200k token
// saving over the 28-lane corpus.  This is an UPPER BOUND (the grammar may already own
// the same bytes); it is a filter, not a result.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';

type Cand = { name: string; clause: number; note: string; apply: (s: string) => { out: string; occ: number } };

const cnt = (s: string, re: RegExp): number => (s.match(new RegExp(re.source, 'g')) || []).length;

const CANDS: Cand[] = [
  { name: 'isoDate', clause: 18, note: 'YYYY-MM-DD -> YYYYMMDD (STIGME baseline)',
    apply: s => ({ out: s.replace(/(\d{4})-(\d{2})-(\d{2})/g, '$1$2$3'), occ: cnt(s, /(\d{4})-(\d{2})-(\d{2})/g) }) },
  { name: 'isoTimeT', clause: 19, note: 'THH:MM:SS -> THHMMSS',
    apply: s => ({ out: s.replace(/T(\d{2}):(\d{2}):(\d{2})/g, 'T$1$2$3'), occ: cnt(s, /T(\d{2}):(\d{2}):(\d{2})/g) }) },
  { name: 'colonTime', clause: 20, note: 'HH:MM:SS -> HHMMSS anywhere (2+ colons)',
    apply: s => ({ out: s.replace(/\b(\d{2}):(\d{2}):(\d{2})\b/g, '$1$2$3'), occ: cnt(s, /\b(\d{2}):(\d{2}):(\d{2})\b/g) }) },
  { name: 'thousands', clause: 20, note: '1,234,567 -> 1234567 (group by 3 from right)',
    apply: s => ({ out: s.replace(/(?<=\d),(?=\d{3}\b)/g, ''), occ: cnt(s, /(?<=\d),(?=\d{3}\b)/g) }) },
  { name: 'crlf', clause: 12, note: 'strip CR, clause: every newline is CRLF',
    apply: s => ({ out: s.replace(/\r\n/g, '\n'), occ: cnt(s, /\r\n/g) }) },
  { name: 'xmlCloseName', clause: 12, note: '</g> -> </>  (stack-determined tag name)',
    apply: s => ({ out: s.replace(/<\/([A-Za-z][\w.:-]*)\s*>/g, '</>'), occ: cnt(s, /<\/([A-Za-z][\w.:-]*)\s*>/g) }) },
  { name: 'mdBullet', clause: 12, note: 'line-leading "- " removed, clause: every line is a bullet',
    apply: s => ({ out: s.replace(/^(\s*)- /gm, '$1'), occ: cnt(s, /^(\s*)- /gm) }) },
  { name: 'mdTablePad', clause: 14, note: 'remove padding spaces inside | ... | rows',
    apply: s => ({ out: s.replace(/^(\|[^|\n]*)\|(.*)$/gm, (m, a, b) => a.replace(/[ \t]+$/,'') + '|' + b), occ: cnt(s, /^(\s*\|)/gm) }) },
  { name: 'ordinal', clause: 16, note: '1st/2nd/3rd/4th -> 1/2/3/4',
    apply: s => ({ out: s.replace(/\b(\d{1,3})(st|nd|rd|th)\b/g, '$1'), occ: cnt(s, /\b(\d{1,3})(st|nd|rd|th)\b/g) }) },
  { name: 'hexColor', clause: 14, note: '#rrggbb -> rrggbb',
    apply: s => ({ out: s.replace(/#([0-9a-fA-F]{6})\b/g, '$1'), occ: cnt(s, /#([0-9a-fA-F]{6})\b/g) }) },
  { name: 'urlScheme', clause: 14, note: 'https:// -> §  ; http:// -> ¶',
    apply: s => ({ out: s.replace(/https:\/\//g, '§').replace(/http:\/\//g, '¶'), occ: cnt(s, /https?:\/\//g) }) },
  { name: 'trailingWS', clause: 10, note: 'strip trailing blanks on every line',
    apply: s => ({ out: s.replace(/[ \t]+$/gm, ''), occ: cnt(s, /[ \t]+$/gm) }) },
  { name: 'uuidDash', clause: 16, note: 'UUID dashes removed (8-4-4-4-12 determined)',
    apply: s => ({ out: s.replace(/\b([0-9a-fA-F]{8})-([0-9a-fA-F]{4})-([0-9a-fA-F]{4})-([0-9a-fA-F]{4})-([0-9a-fA-F]{12})\b/g, '$1$2$3$4$5'), occ: cnt(s, /\b([0-9a-fA-F]{8})-([0-9a-fA-F]{4})-([0-9a-fA-F]{4})-([0-9a-fA-F]{4})-([0-9a-fA-F]{12})\b/g) }) },
  { name: 'macColon', clause: 16, note: 'MAC aa:bb:cc -> aabbcc',
    apply: s => ({ out: s.replace(/\b([0-9a-fA-F]{2}):([0-9a-fA-F]{2}):([0-9a-fA-F]{2}):([0-9a-fA-F]{2}):([0-9a-fA-F]{2}):([0-9a-fA-F]{2})\b/g, '$1$2$3$4$5$6'), occ: cnt(s, /\b([0-9a-fA-F]{2}):([0-9a-fA-F]{2}):([0-9a-fA-F]{2}):([0-9a-fA-F]{2}):([0-9a-fA-F]{2}):([0-9a-fA-F]{2})\b/g) }) },
  { name: 'isoWeek', clause: 18, note: 'YYYY-Www-D -> YYYYWwwD',
    apply: s => ({ out: s.replace(/\b(\d{4})-W(\d{2})-(\d)\b/g, '$1W$2$3'), occ: cnt(s, /\b(\d{4})-W(\d{2})-(\d)\b/g) }) },
  { name: 'isoDateTime', clause: 20, note: 'YYYY-MM-DDTHH:MM -> YYYYMMDDTHHMM',
    apply: s => ({ out: s.replace(/\b(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/g, '$1$2$3T$4$5'), occ: cnt(s, /\b(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/g) }) },
  { name: 'version', clause: 18, note: 'v1.2.3 -> v123 (3-component numeric versions)',
    apply: s => ({ out: s.replace(/\b(\d+)\.(\d+)\.(\d+)\b/g, '$1$2$3'), occ: cnt(s, /\b(\d+)\.(\d+)\.(\d+)\b/g) }) },
  { name: 'dottedQuad', clause: 18, note: 'IPv4 a.b.c.d -> abcd (NOT determined: flagged to test)',
    apply: s => ({ out: s.replace(/\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g, '$1$2$3$4'), occ: cnt(s, /\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g) }) },
  { name: 'nbsp', clause: 12, note: 'U+00A0 -> space',
    apply: s => ({ out: s.replace(/ /g, ' '), occ: cnt(s, / /g) }) },
  { name: 'smartQuotes', clause: 14, note: 'curly quotes -> straight',
    apply: s => ({ out: s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"'), occ: cnt(s, /[‘’“”]/g) }) },
  { name: 'emDash', clause: 12, note: 'em/en dash -> hyphen',
    apply: s => ({ out: s.replace(/[—–]/g, '-'), occ: cnt(s, /[—–]/g) }) },
  { name: 'ellipsis', clause: 12, note: '… -> ...',
    apply: s => ({ out: s.replace(/…/g, '...'), occ: cnt(s, /…/g) }) },
  { name: 'commaSpace', clause: 14, note: '", " -> "," everywhere (comma always followed by space)',
    apply: s => ({ out: s.replace(/, /g, ','), occ: cnt(s, /, /g) }) },
  { name: 'semicolonSpace', clause: 14, note: '"; " -> ";"',
    apply: s => ({ out: s.replace(/; /g, ';'), occ: cnt(s, /; /g) }) },
  { name: 'colonSpace', clause: 14, note: '": " -> ":"',
    apply: s => ({ out: s.replace(/: /g, ':'), occ: cnt(s, /: /g) }) },
  { name: 'repeatChars', clause: 16, note: 'xxxx (n>=3) -> x{n}',
    apply: s => ({ out: s.replace(/(.)\1{2,}/g, m => m[0] + '{' + m.length + '}'), occ: cnt(s, /(.)\1{2,}/g) }) },
  { name: 'degC', clause: 14, note: '°C -> C',
    apply: s => ({ out: s.replace(/°C/g, 'C'), occ: cnt(s, /°C/g) }) },
];

const files = fs.readFileSync('bench/x16/lanes-all.txt', 'utf8').trim().split('\n');
const enc = 'o200k_base' as const;
const agg = new Map<string, { occ: number; save: number; fire: number; net: number }>();
for (const c of CANDS) agg.set(c.name, { occ: 0, save: 0, fire: 0, net: 0 });
const rows: any[] = [];
let totRaw = 0;

for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const raw = countTokens(t, enc);
  totRaw += raw;
  const row: any = { file: f.split('/').pop(), raw };
  for (const c of CANDS) {
    let r;
    try { r = c.apply(t); } catch { continue; }
    if (r.occ === 0) { row[c.name] = 0; continue; }
    const nt = countTokens(r.out, enc);
    const save = raw - nt;
    row[c.name] = save;
    const a = agg.get(c.name)!;
    a.occ += r.occ; a.save += save;
    if (save > c.clause) { a.fire++; a.net += save - c.clause; }
  }
  rows.push(row);
}

console.log('lane'.padEnd(34) + 'raw'.padStart(6) + CANDS.map(c => c.name.slice(0, 9).padStart(10)).join(''));
for (const r of rows) {
  console.log(String(r.file).slice(0, 33).padEnd(34) + String(r.raw).padStart(6) +
    CANDS.map(c => String(r[c.name] ?? 0).padStart(10)).join(''));
}
console.log('\n=== aggregate (raw-token upper bound) ===');
console.log('candidate'.padEnd(16) + 'occ'.padStart(8) + 'save'.padStart(8) + 'lanes'.padStart(7) + 'net'.padStart(8) + '  ' + 'note');
const sorted = [...agg.entries()].sort((a, b) => b[1].net - a[1].net);
for (const [n, a] of sorted) {
  const c = CANDS.find(x => x.name === n)!;
  console.log(n.padEnd(16) + String(a.occ).padStart(8) + String(a.save).padStart(8) +
    String(a.fire).padStart(7) + String(a.net).padStart(8) + '  ' + c.note);
}
console.log('\ncorpus raw tokens:', totRaw);
