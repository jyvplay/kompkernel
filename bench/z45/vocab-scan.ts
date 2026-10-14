// Z45: scan o200k/cl100k vocab for punctuation+word compound tokens.
import { decodeIds, encodeIds, type EncodingName } from '@/lib/omega/bpe';
const enc: EncodingName = (process.env.ENC as EncodingName) || 'o200k_base';
const N = enc === 'o200k_base' ? 200019 : 100256;
const buckets = new Map<string, string[]>();
let bad = 0;
for (let id = 0; id < N; id++) {
  let s: string;
  try { s = decodeIds([id], enc); } catch { bad++; continue; }
  if (s.includes('\uFFFD')) continue;
  const m = /^([^\s\p{L}\p{N}])([\p{Lu}]?[\p{Ll}]+)$/u.exec(s);
  if (m) {
    const k = m[1];
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(s);
  }
}
const rows = [...buckets.entries()].sort((a, b) => b[1].length - a[1].length);
console.log(`enc=${enc} compound punct+word tokens by punct char:`);
for (const [k, v] of rows.slice(0, 40)) {
  const upper = v.filter(x => /^.[\p{Lu}]/u.test(x)).length;
  console.log(`${JSON.stringify(k).padEnd(6)} n=${String(v.length).padEnd(5)} upperStart=${String(upper).padEnd(4)} e.g. ${v.slice(0, 12).map(x => JSON.stringify(x)).join(' ')}`);
}
// also: ' ,' style? And newline-prefixed words? Let's check a few more shapes
let nlWord = 0, spacePunctWord = 0;
for (let id = 0; id < N; id++) {
  let s: string; try { s = decodeIds([id], enc); } catch { continue; }
  if (/^\n[\p{L}]+$/u.test(s)) nlWord++;
}
console.log('newline+word tokens:', nlWord);
