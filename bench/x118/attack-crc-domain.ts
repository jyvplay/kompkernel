/** X118 new attack on the repaired ΣΥΝΘΕΣΙΣ: the fused key's CRC is computed over
 * the PRE-template body (after mode+measure). Attack: a body that satisfies the
 * template inverse but whose CRC was taken over a DIFFERENT domain (post-template,
 * or the fully expanded source) must be refused, never silently accepted. Also
 * attack a key whose field order is swapped (f9=f11) and a marker-collision body.
 * Independent of the encoder: constructs hostile wires and calls the decoder. */
import * as fs from 'node:fs';
import { synthesisDecodeBody, synthesisKey, type SynthesisKeyParts } from '../../src/lib/omega/synthesis';
import { crc32 } from '../../src/lib/omega/aither';
const crc = (s: string) => crc32(new TextEncoder().encode(s)).toString(16).padStart(8, '0');
const wire = fs.readFileSync('bench/x117/receipts/wires/ls-l-real.syn.txt', 'utf8');
const nl = wire.indexOf('\n'); const key = wire.slice(0, nl); const body = wire.slice(nl + 1);
const parts: SynthesisKeyParts = { j: 11, i: 9, marker: '※', crc: '25b707b9' };
const rows: any[] = [];
const attempt = (name: string, fn: () => string) => {
  try { const out = fn(); rows.push({ name, refused: false, ok: out.length > 0 }); }
  catch (e) { rows.push({ name, refused: true, error: e instanceof Error ? e.message : String(e) }); }
};
// baseline must decode
attempt('baseline valid', () => synthesisDecodeBody(body, parts));
// CRC domain attack 1: crc over the post-template body instead of pre
attempt('crc=post-template domain', () => synthesisDecodeBody(body, { ...parts, crc: crc(body) }));
// CRC domain attack 2: crc over a trivially wrong string
attempt('crc=wrong constant', () => synthesisDecodeBody(body, { ...parts, crc: 'deadbeef' }));
// field-order swap: rule reads f11 writes f9 (marker is in f11, so must refuse)
attempt('field order swapped f9=f11', () => synthesisDecodeBody(body, { ...parts, j: 9, i: 11 }));
// marker collision: claim a marker that does not occur -> template inverse no-op, CRC mismatch
attempt('marker absent', () => synthesisDecodeBody(body, { ...parts, marker: '۞' }));
// key canonical guard: a non-canonical spelling must not parse
import { synthesisParseKey } from '../../src/lib/omega/synthesis';
const nonCanon = key.replace(' (1-based)', '');
rows.push({ name: 'non-canonical key parses?', refused: synthesisParseKey(nonCanon) === null });
const silent = rows.filter(r => !r.refused && r.name !== 'baseline valid').length;
const receipt = { schema: 'kompkernel-x118-attack-crc-domain-v1', date: '2026-11-15', trials: rows.length, silentAccepts: silent, allFailClosed: silent === 0, rows };
fs.writeFileSync('bench/x118/receipts/attack-crc-domain.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
if (silent !== 0) process.exitCode = 1;
