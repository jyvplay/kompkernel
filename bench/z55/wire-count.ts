// z55: DAEDALUS message tokens for two KLADOS wire formats on the same parse (digit depth vs two-space indent per level).
import fs from 'node:fs';
import { kladosParse, kladosWire } from '@/lib/omega/kladios';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const style = text.includes('├') || text.includes('└') ? 'box' : 'ascii';
  const lines = kladosParse(text, style);
  const digit = kladosWire(lines);
  const indent = lines.map(l => ' '.repeat(2 * l.depth) + l.text).join('\n');
  const dd = daedalusEncode(digit, 'o200k_base').messageTokens;
  const di = daedalusEncode(indent, 'o200k_base').messageTokens;
  const raw = daedalusEncode(text, 'o200k_base').messageTokens;
  console.log(JSON.stringify({ lane: f.split('/').pop(), style, raw_daedalus: raw, digit_wire: dd, indent_wire: di, plainTokens_digit: countTokens(digit, 'o200k_base'), plainTokens_indent: countTokens(indent, 'o200k_base') }));
}
