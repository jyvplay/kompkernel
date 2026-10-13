/**
 * bench/llm-blind-gen.ts — blind LLM-decode test generator.
 *
 * Writes N seeded texts (repeated-phrase prose, so CHIRON emits macros) to
 *   <dir>/hidden/orig_<i>.txt         (originals: NOT to be shown to the decoder)
 * and the decoder-visible message to
 *   <dir>/visible/msg_<i>.txt         (exactly the chat message: decoder prompt + wire)
 * The decoder is asked to output the original; the diff is computed by
 * bench/llm-blind-check.ts, never by the decoder.
 *
 *   node llm-blind-gen.mjs <dir> <n> <seed>
 */
import fs from 'node:fs';
import path from 'node:path';
import { chironEncode, chironDecoderPrompt, chironDecode, KAIROS_WORK_UNITS } from '../src/lib/omega/chiron';

const [dir, nArg, seedArg] = process.argv.slice(2);
const N = Number(nArg ?? 3);
let seed = Number(seedArg ?? 7) >>> 0;
const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)];
const WORDS = ['ledger', 'harbor', 'quartz', 'lantern', 'meridian', 'copper', 'orbit', 'tundra', 'velvet', 'cascade', 'anchor', 'prism', 'garnet', 'signal', 'mosaic', 'theorem', 'delta', 'vector'];
const PHRASES = ['the quarterly review of the', 'shipping manifest for the', 'note from the field team about', 'summary of the open items in'];

fs.mkdirSync(path.join(dir, 'hidden'), { recursive: true });
fs.mkdirSync(path.join(dir, 'visible'), { recursive: true });
for (let i = 1; i <= N; i++) {
  const phrases = [pick(PHRASES), pick(PHRASES)];
  const lines: string[] = [];
  for (let k = 0; k < 6; k++) {
    const body = Array.from({ length: 6 }, () => pick(WORDS)).join(' ');
    lines.push(`${pick(phrases)} ${body}, ${pick(phrases)} ${body}.`);
  }
  const text = lines.join('\n');
  fs.writeFileSync(path.join(dir, 'hidden', `orig_${i}.txt`), text);
  const r = chironEncode(text, 'o200k_base', { workUnits: KAIROS_WORK_UNITS });
  const prompt = chironDecoderPrompt(r.wire);
  const msg = prompt; // chironDecoderPrompt(wire) already contains the wire and the contract
  fs.writeFileSync(path.join(dir, 'visible', `msg_${i}.txt`), msg);
  // program-side sanity only (the decoder never sees this)
  fs.writeFileSync(path.join(dir, 'hidden', `wire_${i}.txt`), r.wire);
  fs.writeFileSync(path.join(dir, 'hidden', `check_${i}.json`), JSON.stringify({ exact: chironDecode(r.wire) === text, mode: r.mode, rules: r.rules, messageTokens: r.messageTokens, inTokens: r.inTokens }));
}
console.log('wrote', N, 'samples to', dir);
