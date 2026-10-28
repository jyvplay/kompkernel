import * as fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { archetyponEncode } from '@/lib/omega/archetypon';

const path = 'bench/holdout-work/email-thread.txt';
const text = fs.readFileSync(path, 'utf8');
if (text.includes('\r')) throw new Error('probe only accepts LF text');
const final = text.endsWith('\n');
const lines = text.split('\n');
if (final) lines.pop();
const depths: number[] = [];
const body: string[] = [];
for (const original of lines) {
  let line = original;
  let depth = 0;
  while (line.startsWith('> ')) { depth++; line = line.slice(2); }
  if (line === '>') { depth++; line = ''; }
  // Refuse quote syntax outside the exact grammar the decoder below knows.
  if (line.startsWith('>') && line !== '>') throw new Error(`unsupported quote prefix: ${original}`);
  depths.push(depth);
  body.push(line);
}
const runs: [number, number][] = [];
for (const depth of depths) {
  const last = runs.at(-1);
  if (last && last[1] === depth) last[0]++;
  else runs.push([1, depth]);
}
const rawBody = body.join('\n') + (final ? '\n' : '');
const contract = 'Restore email quoting. Runs [line-count,depth] cover the raw lines below. Prefix nonblank lines with "> " repeated depth times; on blank lines join depth copies of ">" with spaces. Preserve LF.';
const wire = 'SYNKRISIS/EMAIL-QUOTE\n' + runs.map(([n, depth]) => `${n},${depth}`).join(';') + '\n' + rawBody;
const message = contract + '\n' + wire;
const reconstructed = body.map((line, i) => line === ''
  ? Array(depths[i]).fill('>').join(' ')
  : '> '.repeat(depths[i]) + line).join('\n') + (final ? '\n' : '');
const exact = reconstructed === text;
const parent: any = archetyponEncode(text, 'o200k_base');
const prior = parent.decoded === text ? parent.messageTokens : countTokens(text, 'o200k_base');
const result = {
  lane: 'email-thread',
  source: path,
  rawTokens: countTokens(text, 'o200k_base'),
  parentBestTokens: prior,
  candidateM: countTokens(message, 'o200k_base'),
  deltaVsParent: countTokens(message, 'o200k_base') - prior,
  contractTokens: countTokens(contract, 'o200k_base'),
  quoteDepthRuns: runs,
  lineCount: lines.length,
  exact,
  gatePass: exact && countTokens(message, 'o200k_base') <= prior,
  rejected: !exact || countTokens(message, 'o200k_base') > prior,
};
fs.writeFileSync('bench/x45/receipts/email-quote-probe.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (!exact) process.exitCode = 1;
