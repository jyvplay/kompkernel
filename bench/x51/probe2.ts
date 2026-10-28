// X51 probe phase 2: candidate transforms measured through DAEDALUS (OMEGA_DET=1) + exactness scans.
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
const ENC = 'o200k_base' as const;
const T = (s: string) => countTokens(s, ENC);
const read = (p: string) => fs.readFileSync(p, 'utf8');

function dae(text: string): number { const r = daedalusEncode(text, ENC); if (!r.exact || r.decoded !== text) throw new Error('daedalus inexact'); return r.messageTokens; }
function ako(text: string): number { const r = akolouthia2Encode(text, ENC); if (!r.exact || r.decoded !== text) throw new Error('ako inexact'); return countTokens(r.decoderPrompt, ENC); }

// ---------- semver packing ----------
// pad form: each component zero-padded to 3, concatenated (9 digits). int form: (M+1)*1e6+m*1e3+p.
const pad3 = (n: string) => n.padStart(3, '0');
function packPad(m: string, a: string, b: string): string { return pad3(m) + pad3(a) + pad3(b); }
function packInt(m: string, a: string, b: string): string { return String((Number(m) + 1) * 1_000_000 + Number(a) * 1000 + Number(b)); }
function okComp(s: string): boolean { return /^\d{1,3}$/.test(s) && (s === '0' || !s.startsWith('0')); }

// contexts: (1) JSON string fully = [prefix]X.Y.Z ; (2) tree @X.Y.Z( |EOL) ; (3) .so.X.Y.Z ; (4) vX.Y.Z after / or [ or ( or space
function semverTransform(text: string, mode: 'pad' | 'int'): { out: string; sites: number; distinct: number; collisions: number } {
  const pack = mode === 'pad' ? packPad : packInt;
  let sites = 0; const seen = new Set<string>();
  let out = text;
  out = out.replace(/"(\^|~|>=|<=|>|<|=|v)?(\d+)\.(\d+)\.(\d+)"/g, (w, pre, a, b, c) => {
    if (!(okComp(a) && okComp(b) && okComp(c))) return w; sites++; seen.add(`${a}.${b}.${c}`); return `"${pre ?? ''}${pack(a, b, c)}"`;
  });
  out = out.replace(/@(\d+)\.(\d+)\.(\d+)(?=[ \n\r]|$)/g, (w, a, b, c) => {
    if (!(okComp(a) && okComp(b) && okComp(c))) return w; sites++; seen.add(`${a}.${b}.${c}`); return `@${pack(a, b, c)}`;
  });
  out = out.replace(/\.so\.(\d+)\.(\d+)\.(\d+)(?![\d.])/g, (w, a, b, c) => {
    if (!(okComp(a) && okComp(b) && okComp(c))) return w; sites++; seen.add(`${a}.${b}.${c}`); return `.so.${pack(a, b, c)}`;
  });
  // collisions: pre-existing in-scope packed shapes in ORIGINAL text not produced by us
  let collisions = 0;
  if (mode === 'pad') {
    collisions += [...text.matchAll(/"(?:\^|~|>=|<=|>|<|=|v)?\d{9}"/g)].length;
    collisions += [...text.matchAll(/@\d{9}(?=[ \n\r]|$)/g)].length;
    collisions += [...text.matchAll(/\.so\.\d{9}(?![\d.])/g)].length;
  } else {
    collisions += [...text.matchAll(/"(?:\^|~|>=|<=|>|<|=|v)?\d{7,9}"/g)].length;
    collisions += [...text.matchAll(/@\d{7,9}(?=[ \n\r]|$)/g)].length;
    collisions += [...text.matchAll(/\.so\.\d{7,9}(?![\d.])/g)].length;
  }
  return { out, sites, distinct: seen.size, collisions };
}
function semverRestore(text: string, mode: 'pad' | 'int'): string {
  const unpack = (s: string): string => {
    if (mode === 'pad') return `${Number(s.slice(0, 3))}.${Number(s.slice(3, 6))}.${Number(s.slice(6, 9))}`;
    const n = Number(s) - 1_000_000; return `${Math.floor(n / 1_000_000)}.${Math.floor(n / 1000) % 1000}.${n % 1000}`;
  };
  const dig = mode === 'pad' ? '\\d{9}' : '\\d{7,9}';
  let out = text.replace(new RegExp(`"(\\^|~|>=|<=|>|<|=|v)?(${dig})"`, 'g'), (_w, pre, d) => `"${pre ?? ''}${unpack(d)}"`);
  out = out.replace(new RegExp(`@(${dig})(?=[ \\n\\r]|$)`, 'g'), (_w, d) => `@${unpack(d)}`);
  out = out.replace(new RegExp(`\\.so\\.(${dig})(?![\\d.])`, 'g'), (_w, d) => `.so.${unpack(d)}`);
  return out;
}

// ---------- IPv4 packing ----------
function ipTransform(text: string): { out: string; sites: number; distinct: number; collisions: number } {
  let sites = 0; const seen = new Set<string>();
  const out = text.replace(/(?<![\d.])(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?![\d.])/g, (w, a, b, c, d) => {
    if ([a, b, c, d].some((x: string) => Number(x) > 255 || (x.length > 1 && x.startsWith('0')))) return w;
    sites++; seen.add(w); return [a, b, c, d].map(pad3).join('');
  });
  const collisions = [...text.matchAll(/(?<![\d.])\d{12}(?![\d.])/g)].length;
  return { out, sites, distinct: seen.size, collisions };
}

const CONTRACT_SEMVER = 'Versions: a 9-digit run in a quoted string, after @, or after .so. is a packed version: split it 3-3-3, drop leading zeros in each part, join with dots.';
const CONTRACT_IP = 'Addresses: a 12-digit run is an IPv4 address: split it 3-3-3-3, drop leading zeros in each part, join with dots.';
console.log('contract semver tok', T(CONTRACT_SEMVER), 'ip tok', T(CONTRACT_IP));
console.log('micro pad vs int:', T('001002003'), T('1002003'), T('000009017'), T('1009017'), 'ip pad12', T('192168000001'), 'ip int', T('3232235521'));

const lanes: [string, string][] = [
  ['node-versions', 'bench/holdout-x41/node-versions.txt'],
  ['json-pkg', 'bench/holdout/json-pkg.txt'],
  ['npm-ls', 'bench/holdout-ops/npm-ls.txt'],
  ['pkg0', 'bench/train/pkg0.txt'],
  ['ss-tan', 'bench/holdout-x42/ss-tan.txt'],
  ['kubectl', 'bench/holdout-tbl/kubectl-get-pods.txt'],
  ['openstack', 'bench/holdout-ops/openstack-loghub-26.log'],
  ['ls-l-real', 'bench/holdout-x41/ls-l-real.txt'],
  ['apt-real', 'bench/holdout-x41/apt-real.txt'],
];
for (const [name, p] of lanes) {
  const text = read(p); const t0 = Date.now();
  const base = Math.min(dae(text), ako(text));
  const row: any = { lane: name, rawTok: T(text), baseMinParent: base, ms: Date.now() - t0 };
  for (const mode of ['pad', 'int'] as const) {
    const tr = semverTransform(text, mode);
    if (tr.sites > 0) {
      const rt = semverRestore(tr.out, mode) === text;
      const cand = rt && tr.collisions === 0 ? Math.min(dae(tr.out), ako(tr.out)) + T(CONTRACT_SEMVER) + 1 : null;
      row[`semver_${mode}`] = { sites: tr.sites, distinct: tr.distinct, collisions: tr.collisions, roundTrip: rt, candPlusContract: cand, deltaVsBase: cand === null ? null : cand - base };
    }
  }
  const ip = ipTransform(text);
  if (ip.sites > 0) {
    const cand = ip.collisions === 0 ? Math.min(dae(ip.out), ako(ip.out)) + T(CONTRACT_IP) + 1 : null;
    row.ip = { sites: ip.sites, distinct: ip.distinct, collisions: ip.collisions, candPlusContract: cand, deltaVsBase: cand === null ? null : cand - base };
  }
  console.log(JSON.stringify(row));
}

// ---------- od dual encoding ----------
function odTransform(text: string): { out: string; lines: number } | null {
  const lines = text.split('\n'); let n = 0; const out: string[] = [];
  for (const l of lines) {
    const m = /^([0-9a-f]{6,}) ((?: [0-9a-f]{2})+) * >.*<$/.exec(l);
    if (m) { out.push(m[2]!.trim()); n++; } else if (l === '' || /^\d+$/.test(l) || l.startsWith('#')) out.push(l); else return null;
  }
  return { out: out.join('\n'), lines: n };
}
function odRestore(text: string): string {
  const lines = text.split('\n'); const out: string[] = []; let idx = 0;
  for (const l of lines) {
    if (/^(?:[0-9a-f]{2} )*[0-9a-f]{2}$/.test(l) && l.length >= 2) {
      const bytes = l.split(' ').map(h => parseInt(h, 16));
      const hexPart = bytes.map(b => ' ' + b.toString(16).padStart(2, '0')).join('');
      const gutter = bytes.map(b => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.')).join('');
      const off = (idx * 16).toString(16).padStart(6, '0');
      out.push(`${off} ${hexPart}${' '.repeat(3 * (16 - bytes.length))}  >${gutter}<`); idx++;
    } else out.push(l);
  }
  return out.join('\n');
}
for (const p of ['bench/x51/fixtures/od-ls.txt', 'bench/x51/fixtures/od-text.txt']) {
  if (!fs.existsSync(p)) { console.log('od lane missing', p); continue; }
  const text = read(p); const tr = odTransform(text);
  if (!tr) { console.log(JSON.stringify({ lane: p, odParse: false })); continue; }
  const rt = odRestore(tr.out) === text;
  const base = Math.min(dae(text), ako(text));
  const cand = Math.min(dae(tr.out), ako(tr.out));
  console.log(JSON.stringify({ lane: p.split('/').pop(), rawTok: T(text), lines: tr.lines, roundTrip: rt, baseMinParent: base, candParent: cand, deltaBeforeContract: cand - base }));
}

// ---------- git log --stat aggregate exactness ----------
for (const p of ['bench/z57/lanes/ops-git-log-stat.txt', 'bench/holdout-x41/git-log-stat.txt']) {
  const text = read(p); const blocks = text.split(/\n(?=commit [0-9a-f]{40})/);
  let checked = 0, filesOk = 0, insOkPure = 0, pure = 0, totalInsDelOk = 0;
  for (const b of blocks) {
    const sm = / (\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/.exec(b); if (!sm) continue;
    const fileLines = [...b.matchAll(/^ (.+?) +\| (\d+) ([+-]*)$/gm)];
    checked++; if (Number(sm[1]) === fileLines.length) filesOk++;
    const sumCounts = fileLines.reduce((a, f) => a + Number(f[2]), 0);
    const ins = Number(sm[2] ?? 0), del = Number(sm[3] ?? 0);
    if (ins + del === sumCounts) totalInsDelOk++;
    const allPlus = fileLines.every(f => !f[3]!.includes('-')); if (allPlus) { pure++; if (ins === sumCounts && del === 0) insOkPure++; }
  }
  console.log(JSON.stringify({ lane: p.split('/').pop(), commitsWithSummary: checked, filesCountExact: filesOk, insPlusDelEqSumCounts: totalInsDelOk, pureInsertBlocks: pure, pureExact: insOkPure }));
}

// ---------- du aggregate exactness ----------
for (const p of ['bench/holdout-x41/du-ak.txt', 'bench/holdout-x41/du-real.txt']) {
  const text = read(p); const entries = new Map<string, number>();
  for (const l of text.split('\n')) { const m = /^(\d+)\t(.+)$/.exec(l); if (m) entries.set(m[2]!, Number(m[1])); }
  let parents = 0, exactSum = 0, diffs: Record<string, number> = {};
  for (const [path, size] of entries) {
    const children = [...entries.keys()].filter(k => k.startsWith(path + '/') && !k.slice(path.length + 1).includes('/'));
    if (!children.length) continue; parents++;
    const s = children.reduce((a, k) => a + entries.get(k)!, 0);
    const d = size - s; diffs[d] = (diffs[d] ?? 0) + 1; if (d === 0) exactSum++;
  }
  console.log(JSON.stringify({ lane: p.split('/').pop(), entries: entries.size, parentsWithListedChildren: parents, exactChildSum: exactSum, diffHistogramTop: Object.entries(diffs).sort((a, b) => b[1] - a[1]).slice(0, 6) }));
}
console.log('DONE');
