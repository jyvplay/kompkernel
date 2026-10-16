/**
 * X20 probe: headroom of *format-redundancy* elisions, measured with the live tokenizer.
 * ---------------------------------------------------------------------------------------
 * Each family is a (forward, inverse) pair on the whole message plus a descriptor. A family is
 * "invertible" on a lane only if inverse(forward(x)) === x byte for byte, which is checked here.
 * The saving reported here is an UPPER bound: it counts tokens of the raw text before and after,
 * ignoring (a) the descriptor and clause cost and (b) the fact that the DAEDALUS rule tape already
 * aliases repeated literals. It is used only to decide which families are worth a real run.
 *
 * usage: bench/x20/run.sh bench/x20/fmt-probe.ts [lane ...]     (default: the 28 X16/X17 lanes)
 */
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';

type Res = { hit: boolean; before: number; after: number; saved: number; occ: number; desc: number; note: string };

const LANES = process.argv.length > 2 ? process.argv.slice(2) : [
  'bench/holdout-lang/de-kb.txt', 'bench/holdout-mk/chart.svg', 'bench/holdout-mk/dump.sql',
  'bench/holdout-ops/find-listing.txt', 'bench/holdout-ops/git-numstat.txt',
  'bench/holdout-ops/node-stacktraces.txt', 'bench/holdout-ops/openstack-loghub-26.log',
  'bench/holdout-tab/aapl-2014.csv', 'bench/holdout-tab/vix-daily-1990.csv',
  'bench/holdout-tbl/df-h.txt', 'bench/holdout-tbl/kubectl-get-pods.txt',
  'bench/holdout-tbl/psql-output.txt', 'bench/holdout-work/bibliography.txt',
  'bench/holdout-work/email-thread.txt', 'bench/holdout-work/kb-article.txt',
  'bench/holdout-work/llm-answer.md', 'bench/holdout-work/meeting-transcript.txt',
  'bench/readme.txt'.replace('bench/readme.txt', 'bench/holdout/readme.txt'),
  'bench/z11/fresh/csv-8.csv', 
  'bench/z48/corpus/sp500-200.csv', 'bench/holdout-ops/ls-full-iso.txt', 'bench/z20/samples/git-log-iso.txt',
  'bench/z11/fresh/ops-git-log-stat.txt', 'bench/z46/corpus/traces/spring-projects_spring-framework_35118.md',
  'bench/z47/corpus/changelog/svenstaro_miniserve.md', 'bench/holdout-ops/git-log-fuller.txt',
];

/* ---------- F1: thousands separators in digit runs ---------------------------- */
function grp(text: string): Res {
  const before = countTokens(text, 'o200k_base');
  // a grouped number: 1-3 digits, then groups of exactly 3, separator in , . _ space(nbsp,thin)
  const RE = /(?<![\d.,])\d{1,3}(?:[.,_][\u00a0\u2009\u202f ]?(?=\d{3}(?!\d))){1,}(?![\d.,])/g;
  const occ = (text.match(RE) || []).length;
  const stripped = text.replace(RE, (m) => m.replace(/[.,_][\u00a0\u2009\u202f ]?/g, ''));
  // inverse: any bare digit run of length >= 4, not touching a letter/digit/dot, regrouped by 3 with ','
  const INV = /(?<![\w.,])\d{4,}(?![\w.,])/g;
  const back = stripped.replace(INV, (m) => m.replace(/\B(?=(\d{3})+(?!\d))/g, ','));
  const exact = back === text;
  const seps = (text.match(RE) || []).join('').length - (text.match(RE) || []).join('').replace(/[.,_]/g, '').length;
  const after = countTokens(stripped, 'o200k_base');
  return { hit: occ > 0, before, after, saved: before - after, occ, desc: 12,
    note: `seps=${seps} invertible=${exact} (grouping standard=${exact ? 'yes' : 'NO'})` };
}

/* ---------- F2: fixed decimal scale / integer width in delimited regions ------ */
function tableLike(text: string): Res {
  const before = countTokens(text, 'o200k_base');
  const lines = text.split('\n');
  let occ = 0;
  // per-column trailing-zero removal for any delimiter, discovered independently per line-run
  const delims = [',', '|', '\t', ';'];
  let best = { out: text, occ: 0, delim: '' };
  for (const d of delims) {
    const rows = lines.map((l) => l.replace(/\r$/, '').split(d));
    if (rows.length < 2) continue;
    const ncol = Math.min(...rows.map((r) => r.length));
    if (ncol < 2) continue;
    const scale: number[] = new Array(ncol).fill(-2);
    for (let c = 0; c < ncol; c++) {
      let s = -1;
      for (const r of rows) {
        const cell = r[c].trim();
        const m = /^-?\d*(\.\d*)?$/.exec(cell);
        if (!m || cell === '') { s = -1; break; }
        const k = m[1] ? cell.split('.')[1].length : 0;
        if (s === -1) s = k; else if (s !== k) { s = -1; break; }
      }
      scale[c] = s;
    }
    if (!scale.some((s) => s >= 1)) continue;
    let n = 0;
    const out = lines.map((l) => l.replace(/\r$/, '').split(d).map((cell, c) => {
      const s = scale[c];
      if (s < 1) return cell;
      const lead = /^\s*/.exec(cell)![0];
      const trail = /\s*$/.exec(cell)![0];
      const body = cell.slice(lead.length, cell.length - trail.length);
      if (!/^-?\d+\.\d+$/.test(body)) return cell;
      let v = body.replace(/0+$/, '');
      if (v.endsWith('.')) v = v.slice(0, -1);
      if (v === body) return cell;
      n++;
      return lead + v + trail;
    }).join(d)).join('\n') + (text.endsWith('\n') ? '\n' : '');
    if (n > best.occ) best = { out, occ: n, delim: d };
  }
  occ = best.occ;
  const after = countTokens(best.out, 'o200k_base');
  return { hit: occ > 0, before, after, saved: before - after, occ, desc: 18, note: `delim=${JSON.stringify(best.delim)}` };
}

/* ---------- F3: URL scheme + www elision -------------------------------------- */
function scheme(text: string): Res {
  const before = countTokens(text, 'o200k_base');
  const n1 = (text.match(/https:\/\//g) || []).length;
  const n2 = (text.match(/http:\/\//g) || []).length;
  const n3 = (text.match(/https?:\/\/www\./g) || []).length;
  let out = text.replace(/https:\/\/www\./g, '\u0001').replace(/https:\/\//g, '\u0002').replace(/http:\/\//g, '\u0003');
  out = out.replace(/\u0001/g, '/w').replace(/\u0002/g, '/').replace(/\u0003/g, '!');
  const back = out.replace(/\/w(?=[\w-]+\.)/g, 'https://www.').replace(/\/(?=[\w-]+\.)/g, 'https://').replace(/!(?=[\w-]+\.)/g, 'http://');
  const after = countTokens(out, 'o200k_base');
  return { hit: n1 + n2 > 0, before, after, saved: before - after, occ: n1 + n2 + n3, desc: 22,
    note: `https=${n1 - n3} httpswww=${n3} http=${n2} invertible=${back === text}` };
}

/* ---------- F4: hard-wrap -> flow (paragraph unwrapping) --------------------- */
function unwrap(text: string): Res {
  const before = countTokens(text, 'o200k_base');
  const paras = text.split(/\n{2,}/);
  const flowed = paras.map((p) => p.split('\n').map((l) => l.trim()).filter((l) => l !== '').join(' ')).join('\n\n');
  if (flowed === text) return { hit: false, before, after: before, saved: 0, occ: 0, desc: 0, note: 'no change' };
  const after = countTokens(flowed, 'o200k_base');
  const nl = (text.match(/\n/g) || []).length;
  return { hit: true, before, after, saved: before - after, occ: nl, desc: 30, note: `newlines=${nl} (needs exact greedy rewrap to pay)` };
}

/* ---------- F5: alignment padding collapse ----------------------------------- */
function pad(text: string): Res {
  const before = countTokens(text, 'o200k_base');
  const out = text.replace(/[ \t]{2,}/g, ' ');
  const runs = (text.match(/[ \t]{2,}/g) || []).length;
  const after = countTokens(out, 'o200k_base');
  return { hit: runs > 0, before, after, saved: before - after, occ: runs, desc: 0, note: `descriptor = one number per run (cost ~= runs)` };
}

/* ---------- F6: CRLF / trailing whitespace / blank runs ---------------------- */
function crlf(text: string): Res {
  const before = countTokens(text, 'o200k_base');
  const out = text.replace(/\r\n/g, '\n');
  return { hit: out !== text, before, after: countTokens(out, 'o200k_base'), saved: before - countTokens(out, 'o200k_base'), occ: (text.match(/\r\n/g) || []).length, desc: 8, note: 'flag only' };
}
function trailws(text: string): Res {
  const before = countTokens(text, 'o200k_base');
  const out = text.replace(/[ \t]+(?=\n)/g, '');
  const n = (text.match(/[ \t]+(?=\n)/g) || []).length;
  return { hit: n > 0, before, after: countTokens(out, 'o200k_base'), saved: before - countTokens(out, 'o200k_base'), occ: n, desc: 2 * n, note: 'per-line widths needed' };
}

/* ---------- F7: typography (curly quotes, dashes, ellipsis, nbsp) ------------ */
function typo(text: string): Res {
  const before = countTokens(text, 'o200k_base');
  const out = text.replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'").replace(/\u2014/g, '--').replace(/\u2013/g, '-').replace(/\u2026/g, '...').replace(/\u00a0/g, ' ');
  const after = countTokens(out, 'o200k_base');
  const n = (text.match(/[\u201c\u201d\u2018\u2019\u2014\u2013\u2026\u00a0]/g) || []).length;
  return { hit: n > 0, before, after, saved: before - after, occ: n, desc: 20, note: 'inverse needs alternating-pair restore; verified in codec not here' };
}

const FAM: Array<[string, (t: string) => Res]> = [
  ['grp', grp], ['dp-table', tableLike], ['scheme', scheme], ['unwrap', unwrap],
  ['pad', pad], ['crlf', crlf], ['trailws', trailws], ['typo', typo],
];

const tot = new Map<string, { saved: number; occ: number; lanes: number }>();
for (const lane of LANES) {
  let text: string;
  try { text = fs.readFileSync(lane, 'utf8'); } catch { console.log(`MISSING ${lane}`); continue; }
  const cells: string[] = [];
  for (const [name, fn] of FAM) {
    const r = fn(text);
    if (r.hit) {
      cells.push(`${name}:${r.saved >= 0 ? '' : '+'}${Math.abs(r.saved)}@${r.occ}${r.note ? ' ' + r.note : ''}`);
      const t = tot.get(name) ?? { saved: 0, occ: 0, lanes: 0 };
      t.saved += Math.max(0, r.saved); t.occ += r.occ; t.lanes++; tot.set(name, t);
    }
  }
  console.log(`${lane.replace('bench/', '').padEnd(58)} in=${String(countTokens(text, 'o200k_base')).padStart(5)}  ${cells.join('  ')}`);
}
console.log('\n== total positive headroom (raw-text upper bound, before descriptor+clause cost) ==');
for (const [name, t] of [...tot.entries()].sort((a, b) => b[1].saved - a[1].saved)) {
  console.log(`${name.padEnd(10)} lanes=${String(t.lanes).padStart(3)} occ=${String(t.occ).padStart(5)} saved=${String(t.saved).padStart(5)}`);
}
