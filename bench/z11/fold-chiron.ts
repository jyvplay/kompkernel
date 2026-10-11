// z11: composition probe. HYLE deterministic folds (fast arm 'b' choice) then a FIXED CHIRON arm (no tournament).
// Exactness is checked by HYLE's own hyleDecode on the composed wire (chiron arm via ARM_DECODE).
import fs from 'node:fs';
import { hyleEncode, hyleDecode, hyleContractFor } from '@/lib/omega/hyle';
import { chironEncode } from '@/lib/omega/chiron';
import { countTokens } from '@/lib/omega/bpe';
const files = fs.readFileSync(process.env.LIST || 'bench/z11/corpus-55.txt', 'utf8').split('\n').filter(Boolean);
const SH = Number(process.env.SHARD || 0), NS = Number(process.env.NSHARD || 1);
const T = (s: string) => countTokens(s, 'o200k_base');
files.forEach((f, i) => {
  if (i % NS !== SH) return;
  const t = fs.readFileSync(f, 'utf8');
  const h = hyleEncode(t, 'o200k_base', { fast: true });
  let wire: string, folds: string[] = [];
  if (h.wire.startsWith('¦') && h.wire.indexOf('\n') > 0) {
    const nl = h.wire.indexOf('\n');
    const dirs = h.wire.slice(1, nl).split(';');
    const body = h.wire.slice(nl + 1);
    folds = h.folds;
    const c = chironEncode(body, 'o200k_base');
    const cw = c.wire;
    const dLine = dirs.concat(['Bc']).join(';');
    wire = '¦' + dLine + '\n' + cw;
    // the chiron contract is billed once; hyle directive contract for the used directives
    var msg = T(wire) + T(hyleContractFor(dirs)) + (c.messageTokens - T(c.wire));
    var armTok = c.messageTokens;
  } else {
    const c = chironEncode(t, 'o200k_base');
    wire = c.wire; msg = c.messageTokens; folds = []; armTok = c.messageTokens;
  }
  const decoded = hyleDecode(wire);
  console.log(JSON.stringify({ f, in: T(t), msg, chironOnly: armTok, folds, decodedOk: decoded === t, wire: wire.startsWith('§') || wire.startsWith('¦') ? wire : wire }));
});
