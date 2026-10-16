// X19: ANKYRA plan probe. No DAEDALUS: measures the raw-token delta and contract cost.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { ankyraPlan, ankyraApply, ankyraUndo } from '@/lib/omega/ankyra';

const enc = 'o200k_base' as const;
const lanes = fs.readFileSync('bench/x16/lanes-all.txt', 'utf8').split('\n').filter(Boolean);
const only = process.argv.slice(2);

let totDelta = 0, totC = 0, totNet = 0, wins = 0, bad = 0;
for (const f of lanes) {
  if (only.length && !only.some(o => f.includes(o))) continue;
  const text = fs.readFileSync(f, 'utf8');
  const raw = countTokens(text, enc);
  let rule = null;
  try { rule = ankyraPlan(text, enc); } catch (e) { rule = null; }
  if (!rule) { console.log(`${f}\t${raw}\t-\t0\t0\t0`); continue; }
  const tr = ankyraApply(text, rule);
  if (ankyraUndo(tr, rule) !== text) { bad++; console.log(`${f}\tINEXACT`); continue; }
  const net = rule.rawDelta - rule.contractTokens;
  if (net > 0) wins++;
  totDelta += rule.rawDelta; totC += rule.contractTokens; totNet += net;
  console.log(`${f}\t${raw}\t${rule.cls}/${rule.dir}/${JSON.stringify(rule.y)}\tk=${rule.k} m=${rule.m}\tdelta=${rule.rawDelta}\tcontract=${rule.contractTokens}\tnet=${net}`);
}
console.log(`TOTAL delta ${totDelta} contract ${totC} net ${totNet} wins ${wins} inexact ${bad}`);
