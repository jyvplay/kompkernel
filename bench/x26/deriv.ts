/**
 * X26: hunt for a NEW derivable-character family in PROSE.
 *
 * LEXIS (space after a sentence mark) and PSEPHOS/AETOS (intra-number
 * separators) are both instances of one law: delete characters that are a
 * FUNCTION of their context, and restore them with a one-line rule.
 *
 * Both of the known instances are near-exhausted on prose. This probe measures
 * the supply and yield of every other candidate family on the RAW prose lanes
 * (the correct place to measure a pre-grammar transform) and on the WIRE (the
 * correct place to measure a post-grammar transform).
 *
 * Sign convention: POSITIVE delta = the transform SAVES tokens.
 */
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);

const CANDS: Array<{ id: string; re: RegExp; rep: string; note: string }> = [
  { id: 'apos',     re: /'/g,  rep: '',     note: 'straight apostrophe (contractions)' },
  { id: 'aposR',    re: /[’‘]/g, rep: '',   note: 'curly apostrophes' },
  { id: 'finPer',   re: /\.(?=\s|$)/g, rep: '', note: 'sentence-final period' },
  { id: 'comma',    re: /,/g,  rep: '',     note: 'all commas' },
  { id: 'semicol',  re: /;/g,  rep: '',     note: 'all semicolons' },
  { id: 'spAfterP', re: /([.,;:!?]) /g, rep: '$1', note: 'space after sentence mark (LEXIS)' },
  { id: 'hyphen',   re: /(?<=[A-Za-z])-(?=[A-Za-z])/g, rep: '', note: 'intra-word hyphen' },
  { id: 'quoteD',   re: /"/g,  rep: '',     note: 'straight double quotes' },
  { id: 'crlf2lf',  re: /\r\n/g, rep: '\n', note: 'CRLF -> LF' },
  { id: 'dblWord',  re: /\b(\w+) \1\b/g, rep: '$1', note: 'accidental doubled word' },
  { id: 'spBeforeSemi', re: / ;/g, rep: ';', note: 'space before semicolon' },
  { id: 'lowerSent',re: /(^|[.!?]\s+)([A-Z])/g, rep: '$1$2', note: 'sentence-initial capital (marker)' },
];

const lanes = fs.readFileSync('bench/x21/lanes.txt', 'utf8').trim().split('\n');
const PROSE = new Set(['kb-article.txt', 'llm-answer.md', 'meeting-transcript.txt',
  'email-thread.txt', 'readme.txt', 'de-kb.txt', 'bibliography.txt',
  'spring-projects_spring-framework_35118.md', 'svenstaro_miniserve.md']);

function run(mode: 'raw' | 'wire') {
  const tot: Record<string, number> = {};
  const sites: Record<string, number> = {};
  const per: Record<string, Record<string, number>> = {};
  for (let i = 0; i < lanes.length; i++) {
    const name = lanes[i].split('/').pop()!;
    if (!PROSE.has(name)) continue;
    let text: string;
    if (mode === 'raw') text = fs.readFileSync(lanes[i], 'utf8');
    else {
      const wf = `bench/x24/wires/${(i + 1).toString().padStart(2, '0')}.wire`;
      if (!fs.existsSync(wf)) continue;
      text = fs.readFileSync(wf, 'utf8');
    }
    const b = T(text);
    for (const c of CANDS) {
      const n = (text.match(c.re) || []).length;
      if (!n) continue;
      const d = b - T(text.replace(c.re, c.rep));
      tot[c.id] = (tot[c.id] ?? 0) + d;
      sites[c.id] = (sites[c.id] ?? 0) + n;
      (per[c.id] ??= {})[name] = d;
    }
  }
  console.log(`\n=== measured on ${mode.toUpperCase()}, prose lanes only (positive = SAVES) ===`);
  const rows = Object.keys(tot).sort((a, b) => tot[b] - tot[a]);
  for (const k of rows) {
    const c = CANDS.find((x) => x.id === k)!;
    console.log('  ' + k.padEnd(14), 'sites', String(sites[k]).padStart(5),
      'net', String(tot[k]).padStart(6), 'per-site', (tot[k] / sites[k]).toFixed(2).padStart(6),
      ' |', c.note);
  }
}
run('raw');
run('wire');
