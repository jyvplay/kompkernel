// X25 chunk census. Where do the tokens actually go?
//
// Uses the exact o200k_base pre-tokenizer regex. Because BPE never crosses a
// chunk boundary, |encode(s)| = SUM_c |encode(c)| exactly, so attributing tokens
// to chunk classes is exact, not approximate.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';

const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);

const PRETOK =
  /[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]*[\p{Ll}\p{Lm}\p{Lo}\p{M}]+(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]+[\p{Ll}\p{Lm}\p{Lo}\p{M}]*(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n/]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;

function chunks(s: string): string[] {
  PRETOK.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = PRETOK.exec(s))) out.push(m[0]);
  return out;
}
const isL = (c: string) => /\p{L}/u.test(c);
const isN = (c: string) => /\p{N}/u.test(c);
const isS = (c: string) => /\s/.test(c);
function cls(c: string): string {
  const body = c.replace(/^\s/, '');
  if (!body) return 'WS';
  if ([...body].every(isN)) return 'NUM';
  if ([...body].every(isL)) return 'LET';
  if ([...body].every((x) => !isL(x) && !isN(x) && !isS(x))) return 'PUN';
  if ([...body].every((x) => isS(x))) return 'WS';
  return 'MIX';
}

const lanes = fs.readFileSync('bench/x21/lanes.txt', 'utf8').trim().split('\n');
const onWire = process.env.WIRE === '1';
console.log(`=== ${onWire ? 'POLYTROPOS WIRE' : 'RAW'} ===`);
console.log('lane'.padEnd(34), 'tok'.padStart(6), 'chk'.padStart(6),
  'LET'.padStart(6), 'NUM'.padStart(6), 'PUN'.padStart(6), 'WS'.padStart(5), 'MIX'.padStart(5),
  '| multiTokChunks'.padStart(16), 'wsOnly'.padStart(7));
const agg: Record<string, number> = { LET: 0, NUM: 0, PUN: 0, WS: 0, MIX: 0 };
let aggTok = 0, aggWsOnly = 0, aggMultiExtra = 0;
const offenders = new Map<string, number>();

for (let i = 0; i < lanes.length; i++) {
  let text: string;
  if (onWire) {
    const wf = `bench/x24/wires/${(i + 1).toString().padStart(2, '0')}.wire`;
    if (!fs.existsSync(wf)) continue;
    text = fs.readFileSync(wf, 'utf8');
  } else text = fs.readFileSync(lanes[i], 'utf8');

  const cs = chunks(text);
  const by: Record<string, number> = { LET: 0, NUM: 0, PUN: 0, WS: 0, MIX: 0 };
  let wsOnly = 0, multiExtra = 0, multiChunks = 0;
  for (const c of cs) {
    const k = cls(c);
    const t = T(c);
    by[k] += t;
    if (k === 'WS') wsOnly++;
    if (t > 1) { multiChunks++; multiExtra += t - 1; offenders.set(c, (offenders.get(c) || 0) + (t - 1)); }
  }
  const tot = T(text);
  aggTok += tot; aggWsOnly += wsOnly; aggMultiExtra += multiExtra;
  for (const k of Object.keys(agg)) agg[k] += by[k];
  console.log(lanes[i].split('/').pop()!.padEnd(34), String(tot).padStart(6), String(cs.length).padStart(6),
    String(by.LET).padStart(6), String(by.NUM).padStart(6), String(by.PUN).padStart(6), String(by.WS).padStart(5), String(by.MIX).padStart(5),
    `| ${String(multiChunks).padStart(5)} cost +${String(multiExtra).padStart(5)}`.padStart(16), String(wsOnly).padStart(7));
}
console.log('TOTAL tok', aggTok, JSON.stringify(agg), 'wsOnlyChunks', aggWsOnly, 'extraTokensFromMultiTokenChunks', aggMultiExtra);
console.log('--- top multi-token chunks (extra tokens charged) ---');
[...offenders.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
  .forEach(([c, n]) => console.log(String(n).padStart(5), JSON.stringify(c)));
