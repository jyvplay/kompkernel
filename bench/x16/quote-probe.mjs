// X16 probe: how much of an email/quote chain is repeated content once quote markers are stripped?
import fs from 'node:fs';
import { encode } from 'gpt-tokenizer/encoding/o200k_base';
const f = process.argv[2];
const raw = fs.readFileSync(f, 'utf8');
const lines = raw.split('\n');
const strip = (l) => l.replace(/^(>\s?)+/, '').trim();
const seen = new Map();
let totalTok = 0, repTok = 0, repLines = 0, dupLines = 0;
for (const l of lines) {
  const t = encode(l + '\n').length; totalTok += t;
  const s = strip(l);
  if (s.length < 30) continue;
  if (seen.has(s)) { repTok += t; repLines++; } else seen.set(s, 1);
}
// sentence-level: split stripped text into sentences, count repeated sentences
const all = lines.map(strip).join(' ');
const sents = all.split(/(?<=[.!?])\s+/).filter(s => s.length >= 40);
const cnt = new Map(); for (const s of sents) cnt.set(s, (cnt.get(s) ?? 0) + 1);
let sentRepTok = 0, sentRep = 0;
const seenS = new Set();
for (const s of sents) { if (seenS.has(s)) { sentRepTok += encode(s + ' ').length; sentRep++; } seenS.add(s); }
console.log(JSON.stringify({ file: f, lines: lines.length, tokensAll: totalTok, repeatedLineTok: repTok, repeatedLines: repLines,
  sentences: sents.length, repeatedSentences: sentRep, repeatedSentenceTok: sentRepTok }));
