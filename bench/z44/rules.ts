/**
 * Z44 rule audit: parse a CHIRON/DAEDALUS wire, and account per rule for the
 * tokens it costs (tape) vs the tokens it saves (references in the body).
 * Run: ./bench/z44/build.sh bench/z44/rules.ts <file>... [--enc=...] [--top=N]
 */
import fs from 'node:fs';
import { countTokens, tokenStrings, type EncodingName } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';

const args = process.argv.slice(2);
const enc = (args.find((a) => a.startsWith('--enc='))?.slice(6) ?? 'o200k_base') as EncodingName;
const topN = Number(args.find((a) => a.startsWith('--top='))?.slice(6) ?? 12);
const files = args.filter((a) => !a.startsWith('--'));

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const I = countTokens(text, enc);
  const r = daedalusEncode(text, enc, { maxArms: 2 });
  if (r.mode !== 'daedalus') { console.log(`${f}: identity`); continue; }
  const wire = r.wire;
  const sep = wire.indexOf(CHIRON_SEP);
  const tape = wire.slice(CHIRON_START.length, sep);
  const body = wire.slice(sep + 1);
  // rule names = the first non-ASCII char of each rule; tape = sequence of (name, text).
  // Scan literally: a rule starts at a char that is not in the text of any earlier rule.
  const nameChars: string[] = [];
  const rules: Array<{ name: string; text: string }> = [];
  let cur: { name: string; text: string } | null = null;
  const isNameCandidate = (ch: string) => /[^\x00-\x7F]/.test(ch);
  for (let i = 0; i < tape.length; i++) {
    const ch = tape[i];
    if (isNameCandidate(ch) && !nameChars.includes(ch)) {
      if (cur) rules.push(cur);
      nameChars.push(ch);
      cur = { name: ch, text: '' };
    } else if (cur) cur.text += ch;
  }
  if (cur) rules.push(cur);
  // references in body
  const refCount = new Map<string, number>();
  for (const ch of body) if (nameChars.includes(ch)) refCount.set(ch, (refCount.get(ch) ?? 0) + 1);
  const rc = (n: string) => refCount.get(n) ?? 0;
  let tapeTok = 0, deadTok = 0, onceTok = 0, multiTok = 0, refTokTotal = 0, composite = 0;
  const rows: Array<{ name: string; t: number; refs: number; net: number; text: string; comp: boolean }> = [];
  for (const ru of rules) {
    const t = countTokens(ru.text, enc);
    const refs = rc(ru.name);
    const comp = nameChars.some((n) => ru.text.includes(n));
    if (comp) composite++;
    tapeTok += t + 1;
    if (refs === 0) deadTok += t + 1;
    else if (refs === 1) onceTok += t + 1;
    else multiTok += t + 1;
    refTokTotal += refs;
    rows.push({ name: ru.name, t, refs, net: refs - (t + 1), text: ru.text.slice(0, 46), comp });
  }
  console.log(`\n=== ${f.split('/').slice(-2).join('/')} I=${I} M=${r.messageTokens} W=${r.outTokens}`);
  console.log(`   rules=${rules.length} composite(rule text contains a ref)=${composite}  tapeToks(incl names)=${tapeTok}  deadRules=${rows.filter(x => x.refs === 0).length} (${deadTok} tok)  singleUse=${rows.filter(x => x.refs === 1).length} (${onceTok} tok)  multi=${rows.filter(x => x.refs > 1).length} (${multiTok} tok)`);
  console.log(`   body refs=${refTokTotal}; net of multi-use rules = ${rows.filter(x => x.refs > 1).reduce((a, b) => a + b.net, 0)}`);
  rows.sort((a, b) => b.net - a.net);
  console.log('   top rules by net gain:');
  for (const x of rows.slice(0, topN)) console.log(`     net=${String(x.net).padStart(5)} refs=${String(x.refs).padStart(4)} t=${String(x.t).padStart(3)} ${x.comp ? 'C' : ' '} ${JSON.stringify(x.text)}`);
  const worst = rows.filter((x) => x.net < 0).sort((a, b) => a.net - b.net);
  console.log(`   rules with negative net: ${worst.length}, total lost = ${worst.reduce((a, b) => a + b.net, 0)}`);
  for (const x of worst.slice(0, Math.min(6, worst.length))) console.log(`     net=${String(x.net).padStart(5)} refs=${x.refs} t=${x.t} ${x.comp ? 'C' : ' '} ${JSON.stringify(x.text)}`);
}
