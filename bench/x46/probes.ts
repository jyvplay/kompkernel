import fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';

const lanes = [
  'bench/holdout-ops/find-listing.txt',
  'bench/holdout-ops/npm-ls.txt',
  'bench/holdout-ops/node-stacktraces.txt',
  'bench/holdout-work/kb-article.txt',
  'bench/holdout-work/llm-answer.md',
  'bench/holdout-work/email-thread.txt',
  'bench/holdout-work/meeting-transcript.txt',
  'bench/holdout-work/bibliography.txt',
  'bench/holdout/gh-prose.txt',
  'bench/holdout-x42/ps-ef.txt',
  'bench/holdout-tbl/markdown-table.md',
];
const parent = new Map<string, number>([
  ['bench/holdout-ops/find-listing.txt', 1267],
  ['bench/holdout-work/kb-article.txt', 622],
  ['bench/holdout-work/llm-answer.md', 674],
  ['bench/holdout-work/email-thread.txt', 488],
  ['bench/holdout-work/meeting-transcript.txt', 385],
  ['bench/holdout-work/bibliography.txt', 671],
]);

function simplePathSuffix(text: string, suffix: string, marker = '~') {
  const lines = text.split('\n');
  let hits = 0;
  const transformed = lines.map(line => {
    const m = line.match(/^(.*?\s+)([^\s]+)$/);
    if (!m) return line;
    const path = m[2];
    if (!path.includes('/') || !path.endsWith(suffix)) return line;
    hits++;
    return m[1] + path.slice(0, -suffix.length) + marker;
  }).join('\n');
  const contract = `In the final path field, ${marker} means the suffix ${JSON.stringify(suffix)}; restore it there. Print the original text.`;
  return { transformed, contract, hits };
}
function commonEnds(text: string, markerP = '⟦', markerS = '⟧') {
  const lines = text.split('\n');
  const fields = lines.map(line => line.match(/^(.*?\s+)([^\s]+)$/)).filter(Boolean) as RegExpMatchArray[];
  const paths = fields.map(m => m[2]).filter(p => p.includes('/'));
  if (paths.length < 4) return null;
  let p = paths[0];
  while (p && paths.some(x => !x.startsWith(p))) p = p.slice(0, -1);
  let s = paths[0];
  while (s && paths.some(x => !x.endsWith(s))) s = s.slice(1);
  if (p.length < 2) p = '';
  if (s.length < 2) s = '';
  if (p === '' && s === '') return null;
  const transformed = lines.map(line => {
    const m = line.match(/^(.*?\s+)([^\s]+)$/);
    if (!m || !m[2].includes('/')) return line;
    let mid = m[2];
    if (p && mid.startsWith(p)) mid = markerP + mid.slice(p.length);
    if (s && mid.endsWith(s)) mid = mid.slice(0, -s.length) + markerS;
    return m[1] + mid;
  }).join('\n');
  const contract = `In the final path field ${markerP} expands to ${JSON.stringify(p)} at the beginning and ${markerS} expands to ${JSON.stringify(s)} at the end. Print the original text.`;
  return { transformed, contract, p, s };
}
function wrapMap(text: string) {
  const parts = text.split(/(\n\n+)/);
  const layout: (number[] | null)[] = [];
  let touched = 0;
  const out = parts.map((part, i) => {
    if (i % 2 === 1) return part;
    const lines = part.split('\n');
    if (lines.length < 2 || lines.some(l => l.includes('\r') || / {2,}$/.test(l))) {
      layout.push(null); return part;
    }
    const counts: number[] = [];
    for (const line of lines) {
      if (!line) { layout.push(null); return part; }
      const words = line.split(' ');
      if (words.some(w => w === '') || words.length < 2) { layout.push(null); return part; }
      counts.push(words.length);
    }
    layout.push(counts); touched++;
    return lines.join(' ');
  }).join('');
  if (!touched) return null;
  const meta = layout.map(x => x ? x.join('.') : '-').join(';');
  const wire = `⟪${meta}⟫\n` + out;
  const contract = 'For each paragraph, ⟪...⟫ lists its original line word-counts by paragraph order; “-” means unchanged. Reinsert line breaks after those counts, preserving blank separators. Print the original text.';
  // Verify the full wire payload can be inverted without hidden state.
  const cut = wire.indexOf('\n');
  const header = wire.slice(0, cut), body = wire.slice(cut + 1);
  const layoutBack = header.slice(1, -1).split(';').map(x => x === '-' ? null : x.split('.').map(Number));
  const bodyParts = body.split(/(\n\n+)/); let p = 0;
  const back = bodyParts.map((part, i) => {
    if (i % 2 === 1) return part;
    const counts = layoutBack[p++];
    if (!counts) return part;
    const words = part.split(' '); const lines: string[] = []; let at = 0;
    for (const n of counts) { lines.push(words.slice(at, at + n).join(' ')); at += n; }
    return at === words.length ? lines.join('\n') : part;
  }).join('');
  return { transformed: wire, contract, layout, exact: back === text };
}
function freqWords(text: string) {
  // Probe only: alias repeated ASCII identifiers that cost >=2 tokens.
  const tokens = text.match(/[A-Za-z][A-Za-z0-9_-]*/g) ?? [];
  const counts = new Map<string, number>();
  for (const w of tokens) counts.set(w, (counts.get(w) ?? 0) + 1);
  const eligible = [...counts].filter(([w,n]) => n >= 3 && countTokens(w, 'o200k_base') >= 2)
    .sort((a,b) => (b[1] * (countTokens(b[0], 'o200k_base') - 1) - countTokens(b[0], 'o200k_base')) - (a[1] * (countTokens(a[0], 'o200k_base') - 1) - countTokens(a[0], 'o200k_base')))
    .slice(0, 32);
  const glyphs = ['α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ','ν','ξ','ο','π','ρ','σ','τ','υ','φ','χ','ψ','ω'];
  const map = new Map(eligible.map(([w], i) => [w, glyphs[i % glyphs.length]]));
  let wire = text;
  for (const [w,g] of map) wire = wire.replace(new RegExp(`\\b${w.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'g'), g);
  const contract = `In the body, decode these exact-word aliases: ${[...map].map(([w,g]) => `${g}=${w}`).join('; ')}. Replace each alias only as a whole word. Print the original text.`;
  const decoded = wire.replace(/./g, c => c); // Round-trip below uses an explicit reverse mapping.
  let back = wire;
  for (const [w,g] of map) back = back.replaceAll(g, w);
  return { transformed: wire, contract, hits: eligible.map(([w,n]) => ({word:w,n,tokens:countTokens(w,'o200k_base')})), exact: back === text, decoded };
}

const out: unknown[] = [];
for (const file of lanes) {
  const text = fs.readFileSync(file, 'utf8');
  const base = countTokens(text, 'o200k_base');
  const row: any = { file, chars: text.length, raw: base, parent: parent.get(file) ?? null, candidates: {} };
  for (const suffix of ['.js','.json','.ts','.map','.cjs','.md']) {
    const c = simplePathSuffix(text, suffix, '~');
    if (!c.hits || text.includes('~')) continue;
    row.candidates[`suffix:${suffix}`] = { hits: c.hits, m: countTokens(c.contract + '\n' + c.transformed,'o200k_base'), exact: simplePathSuffix(text,suffix,'~').transformed.length === text.length };
  }
  const ce = commonEnds(text);
  if (ce) row.candidates['common-ends'] = { p: ce.p, s: ce.s, m: countTokens(ce.contract + '\n' + ce.transformed,'o200k_base') };
  const wm = wrapMap(text);
  if (wm) row.candidates['wrap-map'] = { paragraphs: wm.layout.length, breaks: wm.layout.reduce((s,a)=>s+(a ? a.length-1 : 0),0), metadata: wm.layout, exact: wm.exact, m: countTokens(wm.contract + '\n' + wm.transformed,'o200k_base') };
  const fw = freqWords(text);
  if (fw.hits.length) row.candidates['freq-word-alias'] = { hits: fw.hits, m: countTokens(fw.contract + '\n' + fw.transformed,'o200k_base'), exact: fw.exact };
  out.push(row);
}
console.log(JSON.stringify(out, null, 2));
