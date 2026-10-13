// Z41: where do the cl100k tokens of the DAEDALUS-D wire go on dpkg-l (blocks on vs off)?
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { daedalusEncode } from '@/lib/omega/daedalus';
const f = process.argv[2];
const t = fs.readFileSync(f, 'utf8');
for (const nb of [false, true]) {
  const r = daedalusEncode(t, 'o200k_base', { dualTokenizer: true, noBlocks: nb });
  const w = r.wire;
  const cut = w.indexOf('¶');
  const tape = w.slice(1, cut), body = w.slice(cut + 1);
  const lists = (tape.match(/…[^ ]*/g) ?? []).length;
  const reps = (tape.match(/×/g) ?? []).length + (body.match(/×/g) ?? []).length;
  console.log(JSON.stringify({ noBlocks: nb, arm: r.winningArm, blocks: r.blocks, lists: r.lists, o: r.messageTokens, c_prompt: countTokens(r.decoderPrompt, 'cl100k_base'), c_tape: countTokens(tape, 'cl100k_base'), c_body: countTokens(body, 'cl100k_base'), tapeChars: tape.length, bodyChars: body.length, listTokens: lists, repMarks: reps }));
}
console.log('marker cost cl100k/o200k:', ['§', '¶', '×', '…'].map((c) => `${c}:${countTokens(c, 'cl100k_base')}/${countTokens(c, 'o200k_base')}`).join(' '));
