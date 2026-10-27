import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';

const file = 'bench/holdout-ops/find-listing.txt';
const source = fs.readFileSync(file, 'utf8');
const parentM = 1267; // SYNKRISIS X45 receipt, same source hash (checked in X46)

function mapLineBodies(text: string, map: (line: string) => string): string {
  const parts = text.split(/(\r\n|\n|\r)/);
  for (let i = 0; i < parts.length; i += 2) parts[i] = map(parts[i]);
  return parts.join('');
}
function splitFinalPath(line: string) {
  const m = line.match(/^(.*?)(\S+)([ \t]*)$/);
  if (!m || (!m[2].includes('/') && !m[2].includes('\\')) || (m[1] && !/[ \t]$/.test(m[1]))) return null;
  return { before: m[1], path: m[2], after: m[3] };
}
function maxCodePointPrefix(a: string, b: string): number {
  const aa = Array.from(a), bb = Array.from(b);
  let k = 0;
  while (k < aa.length && k < bb.length && aa[k] === bb[k]) k++;
  return k;
}

const experiments: any[] = [];
function record(name: string, wire: string, contract: string, decoded: string, detail: unknown) {
  const exact = decoded === source;
  const M = countTokens(`${contract}\n${wire}`, 'o200k_base');
  experiments.push({ name, hits: (detail as any).hits ?? null, exact,
    messageTokens: M, synkrisisParentM: parentM, deltaToParent: M - parentM,
    deltaToRaw: M - countTokens(source, 'o200k_base'),
    gate: exact && M < parentM ? 'strict win' : 'rejected; return parent',
    detail });
}

// Branch A: in-band alias for one repeated path component, exact component scope.
{
  const alias = '¤N';
  let hits = 0, collision = false;
  const wire = mapLineBodies(source, line => {
    if (!line) return line;
    const f = splitFinalPath(line);
    if (!f) return line;
    const components = f.path.split(/[\\/]/);
    if (components.includes(alias)) collision = true;
    const replaced = components.map(c => {
      if (c === 'node_modules') { hits++; return alias; }
      return c;
    }).join(f.path.includes('\\') ? '\\' : '/');
    return f.before + replaced + f.after;
  });
  const contract = `In each final path, the whole component ${alias} means node_modules; replace it and preserve separators. Print only.`;
  const decoded = collision ? '' : mapLineBodies(wire, line => {
    if (!line) return line;
    const f = splitFinalPath(line);
    if (!f) return line;
    const restored = f.path.split(/[\\/]/).map(c => c === alias ? 'node_modules' : c)
      .join(f.path.includes('\\') ? '\\' : '/');
    return f.before + restored + f.after;
  });
  record('path-component alias dictionary (node_modules → ¤N)', wire, contract, decoded,
    { hits, collision, falsifier: 'decline if ¤N is already a path component' });
}

// Branch B: adjacent-row LCP delta; decoder uses the previously reconstructed path.
{
  const marker = '⟦';
  const rows: { before: string; path: string; after: string }[] = [];
  let supported = true;
  mapLineBodies(source, line => {
    if (!line) return line;
    const f = splitFinalPath(line);
    if (!f || f.path.includes(marker)) { supported = false; return line; }
    rows.push(f); return line;
  });
  let previous = '';
  const wire = supported ? mapLineBodies(source, line => {
    if (!line) return line;
    const f = splitFinalPath(line)!;
    const k = maxCodePointPrefix(previous, f.path);
    const prefix = Array.from(f.path).slice(0, k).join('');
    const rest = Array.from(f.path).slice(k).join('');
    previous = f.path;
    return `${f.before}${marker}${k}|${rest}${f.after}`;
  }) : source;
  const contract = `Each final path is ${marker}k|tail: copy the first k Unicode code points of the previous reconstructed path, then append tail; first k is 0. Print only.`;
  let prior = '';
  const decoded = supported ? mapLineBodies(wire, line => {
    if (!line) return line;
    const f = line.match(/^(.*?)(\S+)([ \t]*)$/);
    if (!f) { supported = false; return line; }
    const code = f[2].match(/^⟦(\d+)\|(.*)$/s);
    if (!code) { supported = false; return line; }
    const prefixPoints = Array.from(prior).slice(0, Number(code[1]));
    if (prefixPoints.length !== Number(code[1])) { supported = false; return line; }
    const path = prefixPoints.join('') + code[2];
    prior = path;
    return f[1] + path + f[3];
  }) : '';
  record('adjacent-row longest-common-prefix delta', wire, contract, supported ? decoded : '',
    { rows: rows.length, markerCollision: !supported, falsifier: 'decline if a path contains the reserved marker or any row is not a path' });
}

const receipt = {
  input: file,
  sourceSha256: '8b445fd0443c98821b9858ec0a16f3a620c62fa68b870638a01667e05a6964c6',
  encoding: 'o200k_base',
  measurement: 'complete one-chat contract + wire; these branches were not composed over SYNKRISIS',
  rawTokens: countTokens(source, 'o200k_base'),
  parent: 'SYNKRISIS X45',
  experiments,
};
fs.mkdirSync('bench/x46/receipts', { recursive: true });
fs.writeFileSync('bench/x46/receipts/mechanism-branches.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
if (experiments.some(x => !x.exact)) process.exitCode = 1;
