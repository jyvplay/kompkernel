/**
 * X76 / t5 — WHERE DOES THE FRONTIER'S WIRE SPEND ITS TOKENS?
 *
 * The padding experiment showed the frontier compresses padding at 8.2x, far better than
 * its 2.9x average, i.e. there is no headroom there. To find where the headroom IS, split
 * the message into CONTRACT / TAPE (the rule dictionary) / BODY and price each part.
 * A large tape is a target: it is a dictionary of substrings, and dictionaries compress.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { chironParseTape, CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS } from '../../src/lib/omega/chiron';
const enc: any = 'o200k_base';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const r: any = tagstackEncode(t, enc);
  const msg: string = r.message;
  const s = msg.indexOf(CHIRON_START);
  if (s < 0) { console.log(`${p.split('/').pop()!.padEnd(22)} ${String(r.messageTokens).padStart(5)}  NO TAPE (${r.parentCodec})`); continue; }
  const cut = msg.indexOf(CHIRON_SEP, s + 1);
  if (cut < 0) { console.log(`${p.split('/').pop()!.padEnd(22)} ${String(r.messageTokens).padStart(5)}  NO ¶`); continue; }
  const contract = msg.slice(0, s);
  const tape = msg.slice(s + 1, cut);
  const body = msg.slice(cut + 1);
  const ct = T(contract, enc), tt = T(tape, enc), bt = T(body, enc);
  let rules = 0, tapeChars = tape.length;
  for (const sc of CHIRON_SCRIPTS) {
    const parsed = chironParseTape(tape, sc);
    if (parsed) { rules = parsed.length; break; }
  }
  rows.push({ path: p, total: r.messageTokens, contract: ct, tape: tt, body: bt, rules, tapeChars });
  console.log(`${p.split('/').pop()!.padEnd(22)} ${String(r.messageTokens).padStart(5)} = contract ${String(ct).padStart(3)} + tape ${String(tt).padStart(4)} (${String(rules).padStart(3)} rules, ${String(tapeChars).padStart(4)}ch) + body ${String(bt).padStart(5)}`);
  fs.writeFileSync('bench/x76/receipts/tape-split.json', JSON.stringify(rows, null, 1) + '\n');
}
const st = rows.reduce((a, b) => a + b.total, 0), sc = rows.reduce((a, b) => a + b.contract, 0),
      sp = rows.reduce((a, b) => a + b.tape, 0), sb = rows.reduce((a, b) => a + b.body, 0);
console.log(`\nTOTAL ${st} = contract ${sc} + tape ${sp} + body ${sb}   (tape is ${(sp / st * 100).toFixed(1)}% of the message)`);
