// X20: where do the wire tokens go? rules tape vs body, glyph refs vs literal text.
import fs from 'node:fs';
import { countTokens, tokenStrings } from '@/lib/omega/bpe';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { chironParseTape, CHIRON_SCRIPTS, chironInScript, CHIRON_SEP, CHIRON_START } from '@/lib/omega/chiron';
const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const tokens = tokenStrings(text, enc);
  const r: any = daedalusEncode(text, enc);
  const wire: string = r.wire;
  if (wire === text || wire === '') { console.log(JSON.stringify({ file: f, rawTok: tokens.length, mode: r.mode, note: 'identity' })); continue; }
  const sep = wire.indexOf(CHIRON_SEP);
  const tape = wire.slice(1, sep);
  const body = wire.slice(sep + 1);
  const script = (r.script && CHIRON_SCRIPTS.find((s: any) => s.name === r.script)) || CHIRON_SCRIPTS[0];
  const parsed = chironParseTape(tape, script);
  // classify body tokens
  let litTok = 0, glTok = 0, mixed = 0;
  for (const {s: t} of tokenStrings(body, enc)) {
    const hasG = [...t].some(c => chironInScript(script, c.codePointAt(0)!));
    if (!hasG) litTok++; else if ([...t].every(c => chironInScript(script, c.codePointAt(0)!))) glTok++; else mixed++;
  }
  const ruleTexts = (parsed ?? []).map((p: any) => p.text ?? '');
  const ruleTok = countTokens(ruleTexts.join('|'), enc);
  console.log(JSON.stringify({
    file: f, rawTok: tokens.length, wireTok: r.outTokens, contract: r.contractTokens, msg: r.messageTokens,
    rules: parsed?.length ?? -1, tapeTok: countTokens(tape, enc), bodyTok: countTokens(body, enc),
    bodyLiteralTok: litTok, bodyGlyphOnlyTok: glTok, bodyMixedTok: mixed,
    ruleTextTok: ruleTok, script: r.script, winner: r.winningArm,
  }));
}
