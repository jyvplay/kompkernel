/**
 * X41 — the decisive measurement: does a neighbour delta survive the frontier?
 *
 * For each lane: M(oura(raw)) versus M(oura(delta(raw))), same process, same
 * clock, plus the raw token counts. If the delta is redundant with the parent's
 * dictionary the second number will be no better; if the delta removes text the
 * dictionary could not reach (unique-but-neighbour-similar spans) it will be
 * better by a real margin.
 *
 * The delta used here is the *measured-best* variant of the transform the codec
 * will ship: previous line, common prefix p, common suffix s, middle written
 * out; the marker form `~p,s:` is included in every token count, so no cost is
 * hidden outside the measurement.
 */
import * as fs from 'node:fs';
import { ouraEncode } from '@/lib/omega/oura';
import { countTokens } from '@/lib/omega/bpe';

const enc: any = 'o200k_base';

function commonPrefix(a: string, b: string): number {
  let k = 0;
  const m = Math.min(a.length, b.length);
  while (k < m && a[k] === b[k]) k++;
  return k;
}
function commonSuffix(a: string, b: string, from: number): number {
  let k = 0;
  const m = Math.min(a.length, b.length) - from;
  while (k < m && a[a.length - 1 - k] === b[b.length - 1 - k]) k++;
  return k;
}

/** Ship the delta only when it is character-shorter than the line itself. */
function deltaText(lines: string[]): string {
  const out: string[] = [];
  let prev = '';
  for (const l of lines) {
    const p = commonPrefix(l, prev);
    const s = commonSuffix(l, prev, p);
    const cand = '~' + p + ',' + s + ':' + l.slice(p, l.length - s);
    out.push(cand.length < l.length ? cand : l);
    prev = l;
  }
  return out.join('\n');
}

for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p, 'utf8');
  const d = deltaText(t.split('\n'));
  const rawTok = countTokens(t, enc);
  const dTok = countTokens(d, enc);
  const t0 = Date.now();
  const a: any = ouraEncode(t, enc);
  const ta = Date.now();
  const b: any = ouraEncode(d, enc);
  const tb = Date.now();
  console.log(
    p.split('/').pop()!.padEnd(22),
    'raw=' + String(rawTok).padStart(5),
    'deltaRaw=' + String(dTok).padStart(5),
    'oura=' + String(a.messageTokens).padStart(5),
    'ouraDelta=' + String(b.messageTokens).padStart(5),
    'd=' + String(b.messageTokens - a.messageTokens).padStart(5),
    ((ta - t0) / 1000).toFixed(0) + 's/' + ((tb - ta) / 1000).toFixed(0) + 's',
  );
}
