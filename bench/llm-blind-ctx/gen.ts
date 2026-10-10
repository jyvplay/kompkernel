// Writes: visible/earlier_i.txt (the earlier message), visible/msg_i.txt (contract + wire), hidden/new_i.txt, hidden/wire_i.txt.
import fs from 'node:fs';
import { ctxEncode, CTX_CONTRACT } from '../../src/lib/omega/ctxcopy';
const cases = [
  ['httpx__src__httpx___pool.py'],
  ['click__docs__handling-files.md'],
  ['markupsafe__CHANGES.rst'],
];
cases.forEach(([name], idx) => {
  const i = idx + 1;
  const C = fs.readFileSync(`bench/tmp/ctx-pairs/${name}.old`, 'utf8');
  const T = fs.readFileSync(`bench/tmp/ctx-pairs/${name}.new`, 'utf8');
  const r = ctxEncode(T, C, { unique: true });
  if (!r) throw new Error('refused ' + name);
  fs.writeFileSync(`bench/llm-blind-ctx/visible/earlier_${i}.txt`, C);
  fs.writeFileSync(`bench/llm-blind-ctx/visible/msg_${i}.txt`, CTX_CONTRACT + '\n' + r.wire);
  fs.writeFileSync(`bench/llm-blind-ctx/hidden/new_${i}.txt`, T);
  fs.writeFileSync(`bench/llm-blind-ctx/hidden/wire_${i}.txt`, r.wire);
  console.log(JSON.stringify({ i, name, copies: r.copies, copiedFrac: +(r.copiedChars / T.length).toFixed(3), wireChars: r.wire.length, earlierChars: C.length, newChars: T.length }));
});
