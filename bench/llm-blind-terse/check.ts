// Byte-exact scorer: decode/dec_i.txt vs hidden/orig_i.txt. Control: chironDecode(hidden/wire_i.txt).
import fs from 'node:fs';
import { chironDecode } from '../../src/lib/omega/chiron';
const out: any[] = [];
for (const i of [1, 2, 3]) {
  const orig = fs.readFileSync(`bench/llm-blind-terse/hidden/orig_${i}.txt`, 'utf8');
  const dec = fs.readFileSync(`bench/llm-blind-terse/decode/dec_${i}.txt`, 'utf8');
  const wire = fs.readFileSync(`bench/llm-blind-terse/hidden/wire_${i}.txt`, 'utf8');
  out.push({ i, llmDecodeByteExact: dec === orig, origBytes: orig.length, decBytes: dec.length, controlChironDecodeExact: chironDecode(wire) === orig });
}
console.log(JSON.stringify(out));
