/**
 * bench/leaderboard.ts — real-BPE leaderboard over the repo's exact codecs.
 * Bundled with esbuild (alias @ -> src) and executed under Node; no mocks.
 */
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { veritasEncode } from '@/lib/omega/veritas';
import { quasarEncode } from '@/lib/omega/quasar';
import { helixEncode } from '@/lib/omega/helix';
import { meridianEncode } from '@/lib/omega/meridian';
import { plexusEncode } from '@/lib/omega/plexus';
import { pulseEncode } from '@/lib/omega/pulse';
import { anaphoraEncode } from '@/lib/omega/anaphora';
import { axiomEncode } from '@/lib/omega/axiom';
import { tesseraEncode } from '@/lib/omega/tessera';
import { strataEncode } from '@/lib/omega/strata';
import { signetEncode } from '@/lib/omega/signet';
import { mosaicEncode } from '@/lib/omega/mosaic';
import { atlasEncodeCached as atlasEncode } from '@/lib/omega/atlas';
import { auroraEncodeCached as auroraEncode } from '@/lib/omega/aurora';
import { crownEncodeCached as crownEncode } from '@/lib/omega/crown';
import { irisEncode } from '@/lib/omega/iris';
import { kernelEncode } from '@/lib/omega/kernel';
import { zenithEncode } from '@/lib/omega/zenith';
import { eclipseEncode } from '@/lib/omega/eclipse';
import { spliceEncode } from '@/lib/omega/splice';
import { orbitEncode } from '@/lib/omega/orbit';
import { apexEncode } from '@/lib/omega/apex';
import { columnEncode } from '@/lib/omega/column';
import { trieEncode } from '@/lib/omega/trie';
import { repairEncode } from '@/lib/omega/repair';
import { praxisEncode } from '@/lib/omega/praxis';
import { sigmaEncode } from '@/lib/omega/sigma';
import { ltpProject } from '@/lib/omega/ltp';
import { nexusEncode } from '@/lib/omega/nexus';
import { eidolonProject } from '@/lib/omega/eidolon';
import { compressPrometheusICDM } from '@/lib/omega/prometheus-icdm';
import { morphEncode } from '@/lib/omega/morph';
import { stencilEncode } from '@/lib/omega/stencil';
import { e8Encode } from '@/lib/omega/omega-e8seed';
import { omegaXiCompress, omegaXiDecode } from '@/lib/omega/atom-codec';
import { rosettaEncode } from '@/lib/omega/rosetta';
import { kappaEncode } from '@/lib/omega/kappa';
import { phraseEncode } from '@/lib/omega/phrase';
import { tauEncode } from '@/lib/omega/tau';
import { latticeEncode } from '@/lib/omega/lattice';
import { strandEncode } from '@/lib/omega/strand';
import { phoenixEncode } from '@/lib/omega/phoenix';
import { valenceEncode } from '@/lib/omega/valence';
import { astraeaEncode } from '@/lib/omega/astraea';
import { polarisEncode } from '@/lib/omega/polaris';
import { tensorEncode } from '@/lib/omega/tensor';
import { hypergraphEncode } from '@/lib/omega/hypergraph';
import { kineticEncode } from '@/lib/omega/kinetic';
import { synergyEncode } from '@/lib/omega/synergy';
import { hyperionEncode } from '@/lib/omega/hyperion';

export interface Row {
  key: string; wireTokens: number; deliveredTokens: number | null;
  exact: boolean; rt: boolean; ms: number; note: string;
}

export async function leaderboard(text: string, enc: EncodingName = 'o200k_base'): Promise<{ inTokens: number; rows: Row[] }> {
  const inTokens = countTokens(text, enc);
  const rows: Row[] = [];
  const t0 = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const add = (key: string, r: { wire: string; decoded?: string | null; exact?: boolean }, ms: number, delivered?: number | null, note = '') => {
    const wireTokens = countTokens(r.wire, enc);
    rows.push({
      key,
      wireTokens,
      deliveredTokens: delivered ?? null,
      exact: r.exact !== false,
      rt: r.decoded == null ? true : r.decoded === text,
      ms, note,
    });
  };
  const run = async (key: string, fn: () => Promise<{ wire: string; decoded?: string | null; exact?: boolean }> | { wire: string; decoded?: string | null; exact?: boolean }, deliveredFrom?: (r: any) => number | null) => {
    const s = t0();
    try {
      const r = await fn();
      add(key, r, t0() - s, deliveredFrom ? deliveredFrom(r) : null);
    } catch (e: any) {
      rows.push({ key, wireTokens: -1, deliveredTokens: null, exact: false, rt: false, ms: t0() - s, note: 'ERROR ' + e.message });
    }
  };

  await run('identity', () => ({ wire: text, decoded: text }));
  await run('ltp', () => ltpProject(text, enc));
  await run('sigma', () => sigmaEncode(text, enc));
  await run('stencil', () => stencilEncode(text, enc));
  await run('morph', () => morphEncode(text, enc));
  await run('praxis', () => praxisEncode(text, enc));
  await run('trie', () => trieEncode(text, enc));
  await run('repair', () => repairEncode(text, enc));
  await run('column', () => columnEncode(text, enc));
  await run('prometheus', () => compressPrometheusICDM(text, enc));
  await run('eidolon', () => eidolonProject(text, enc));
  await run('nexus', async () => nexusEncode(text, enc));
  await run('veritas', () => veritasEncode(text, enc));
  await run('quasar', () => quasarEncode(text, enc));
  await run('helix', () => helixEncode(text, enc));
  await run('meridian', () => meridianEncode(text, enc));
  await run('plexus', () => plexusEncode(text, enc));
  await run('pulse', () => pulseEncode(text, enc));
  await run('anaphora', () => anaphoraEncode(text, enc));
  await run('axiom', () => axiomEncode(text, enc, []));
  await run('tessera', () => tesseraEncode(text, enc));
  await run('strata', () => strataEncode(text, enc));
  await run('signet', () => signetEncode(text, enc));
  await run('kappa', () => kappaEncode(text, enc));
  await run('phrase', () => phraseEncode(text, enc));
  await run('tau', () => tauEncode(text, enc));
  await run('lattice', () => latticeEncode(text, enc));
  await run('strand', () => strandEncode(text, enc));
  await run('phoenix', () => phoenixEncode(text, enc));
  await run('valence', () => valenceEncode(text, enc));
  await run('astraea', () => astraeaEncode(text, enc));
  await run('polaris', () => polarisEncode(text, enc));
  await run('hyperion', () => hyperionEncode(text, enc));
  await run('tensor', () => tensorEncode(text, enc));
  await run('hypergraph', () => hypergraphEncode(text, enc));
  await run('kinetic', () => kineticEncode(text, enc));
  await run('synergy', () => synergyEncode(text, enc));
  await run('apex', () => apexEncode(text, enc));
  await run('mosaic', () => mosaicEncode(text, enc));
  await run('orbit', async () => orbitEncode(text, enc));
  await run('atlas', async () => atlasEncode(text, enc), (r: any) => r.deliveredTokens ?? null);
  await run('aurora', async () => auroraEncode(text, enc), (r: any) => r.deliveredTokens ?? null);
  await run('crown', async () => crownEncode(text, enc), (r: any) => r.deliveredTokens ?? null);
  await run('iris', async () => irisEncode(text, enc), (r: any) => r.deliveredTokens ?? null);
  await run('kernel', async () => kernelEncode(text, enc), (r: any) => r.deliveredTokens ?? null);
  await run('zenith', async () => zenithEncode(text, enc), (r: any) => r.deliveredTokens ?? null);
  await run('splice', () => spliceEncode(text, enc), (r: any) => r.deliveredTokens ?? null);
  await run('eclipse', async () => eclipseEncode(text, enc), (r: any) => r.deliveredTokens ?? null);
  // ROSETTA last: its internal member lanes hit the caches warmed above.
  await run('rosetta', async () => rosettaEncode(text, enc));
  await run('omegaE8', () => e8Encode(text, enc));
  const s = t0();
  try {
    const xi = await omegaXiCompress(text, enc);
    const back = await omegaXiDecode(xi.output, enc);
    rows.push({ key: 'omegaXi', wireTokens: xi.outTokens, deliveredTokens: null, exact: back === text, rt: back === text, ms: t0() - s, note: xi.codecName });
  } catch (e: any) {
    rows.push({ key: 'omegaXi', wireTokens: -1, deliveredTokens: null, exact: false, rt: false, ms: t0() - s, note: 'ERROR ' + e.message });
  }
  return { inTokens, rows };
}

export function printBoard(name: string, text: string, enc: EncodingName, rows: Row[], inTokens: number) {
  const sorted = [...rows].sort((a, b) => {
    const av = a.wireTokens, bv = b.wireTokens;
    return av - bv;
  });
  console.log(`\n=== ${name} — ${text.length} chars, ${inTokens} in-tokens (${enc}) ===`);
  console.log('codec              wireTok  deliv   exact  rt   ms     note');
  for (const r of sorted) {
    console.log(
      r.key.padEnd(18) + String(r.wireTokens).padStart(6) + '  ' +
      String(r.deliveredTokens ?? '-').padStart(6) + '  ' +
      (r.exact ? 'Y' : 'N') + '     ' + (r.rt ? 'Y' : 'N') + '   ' +
      String(Math.round(r.ms)).padStart(6) + '  ' + (r.note || '').slice(0, 60));
  }
}
