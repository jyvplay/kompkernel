import { countTokens, type EncodingName } from './bpe';

/** BANYAN-B1: bounded backward line references with one-splice deltas. */
export const BANYAN_SENTINEL = 'βB1\n';
export const BANYAN_LITERAL = 'βB1L\n';

function bestParent(line: string, prior: string[]): { p: number; pre: number; suf: number; mid: string } | null {
  let best: { p: number; pre: number; suf: number; mid: string } | null = null;
  const lim = Math.max(0, prior.length - 64);
  for (let p = prior.length - 1; p >= lim; p--) {
    const q = prior[p];
    let pre = 0;
    while (pre < line.length && pre < q.length && line[pre] === q[pre]) pre++;
    let suf = 0;
    while (suf < line.length - pre && suf < q.length - pre && line[line.length - 1 - suf] === q[q.length - 1 - suf]) suf++;
    const mid = line.slice(pre, line.length - suf);
    const cand = { p, pre, suf, mid };
    if (!best || mid.length < best.mid.length) best = cand;
  }
  return best;
}

export function banyanEncode(text: string, enc: EncodingName = 'o200k_base'): { wire: string; decoded: string; exact: boolean } {
  if (!text || text.includes('β')) return { wire: text, decoded: text, exact: true };
  const final = text.endsWith('\n') ? 1 : 0;
  const lines = text.split('\n');
  if (final) lines.pop();
  if (lines.length < 3) return { wire: text, decoded: text, exact: true };
  const out: string[] = [`${BANYAN_SENTINEL}${lines.length},${final}`];
  const built: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (i === 0) { out.push(`R${lines[i]}`); built.push(lines[i]); continue; }
    const d = bestParent(lines[i], built);
    if (!d || d.mid.length + 12 >= lines[i].length) out.push(`R${lines[i]}`);
    else out.push(`D${d.p},${d.pre},${d.suf}:${d.mid}`);
    built.push(lines[i]);
  }
  const wire = out.join('\n');
  return { wire, decoded: banyanDecode(wire), exact: banyanDecode(wire) === text };
}

export function banyanDecode(wire: string): string {
  if (wire.startsWith(BANYAN_LITERAL)) return wire.slice(BANYAN_LITERAL.length);
  if (!wire.startsWith(BANYAN_SENTINEL)) return wire;
  const rows = wire.split('\n');
  const [nS, fS] = rows[1].split(',');
  const n = Number(nS), final = Number(fS);
  if (!Number.isInteger(n) || n < 1 || rows.length !== n + 2) return wire;
  const built: string[] = [];
  for (let i = 0; i < n; i++) {
    const row = rows[i + 2];
    if (row.startsWith('R')) built.push(row.slice(1));
    else if (row.startsWith('D')) {
      const m = /^D(\d+),(\d+),(\d+):(.*)$/.exec(row);
      if (!m) return wire;
      const [p, pre, suf] = m.slice(1, 4).map(Number);
      const parent = built[p];
      if (parent === undefined || pre + suf > parent.length) return wire;
      built.push(parent.slice(0, pre) + m[4] + (suf ? parent.slice(parent.length - suf) : ''));
    } else return wire;
  }
  return built.join('\n') + (final ? '\n' : '');
}

export function banyanCandidate(text: string, enc: EncodingName) {
  if (text.startsWith('β')) return null;
  const r = banyanEncode(text, enc);
  if (!r.exact || countTokens(r.wire, enc) >= countTokens(text, enc)) return null;
  return r;
}
