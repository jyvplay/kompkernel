// z11: HYLE fold (deterministic, fast) -> arm on folded body. Exactness via hyleDecode with arm 'c' (chiron-family wire).
import fs from 'node:fs';
import { hyleEncode, hyleDecode, hyleContractFor } from '@/lib/omega/hyle';
import { chironEncode, KAIROS_WORK_UNITS } from '@/lib/omega/chiron';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
const files = fs.readFileSync(process.env.LIST || 'bench/z11/corpus-55.txt', 'utf8').split('\n').filter(Boolean);
const SH = Number(process.env.SHARD || 0), NS = Number(process.env.NSHARD || 1);
const T = (s: string) => countTokens(s, 'o200k_base');
files.forEach((f, i) => {
  if (i % NS !== SH) return;
  const t = fs.readFileSync(f, 'utf8');
  const h = hyleEncode(t, 'o200k_base', { fast: true });
  if (!h.folds.length) return;           // only files where a fold fires
  const nl = h.wire.indexOf('\n');
  const dirs = h.wire.slice(1, nl).split(';');
  const body = h.wire.slice(nl + 1);     // folded text (arm b)
  const hc = T(hyleContractFor(dirs));
  const row: any = { f, in: T(t), folds: h.folds, bodyTok: T(body) };
  // DAEDALUS on folded body (fixed arm, wall-clock budget as shipped)
  const d = daedalusEncode(body, 'o200k_base');
  const dWire = '¦' + dirs.concat(['Bc']).join(';') + '\n' + d.wire;
  row.dae = { msg: T(dWire) + hc + Math.max(0, d.messageTokens - d.outTokens), ok: hyleDecode(dWire) === t, arm: d.winner ?? '', ms: d.ms };
  // CHIRON (KAIROS work units) on folded body
  const c = chironEncode(body, 'o200k_base', { workUnits: KAIROS_WORK_UNITS });
  const cWire = '¦' + dirs.concat(['Bc']).join(';') + '\n' + c.wire;
  row.chiron = { msg: T(cWire) + hc + Math.max(0, c.messageTokens - c.outTokens), ok: hyleDecode(cWire) === t };
  console.log(JSON.stringify(row));
});
