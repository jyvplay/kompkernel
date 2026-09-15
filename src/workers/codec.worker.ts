/// <reference lib="webworker" />
import { omegaXiCompress } from '../lib/omega/atom-codec';
import { compressPrometheusICDM } from '../lib/omega/prometheus-icdm';
import { zetaEncode } from '../lib/omega/zeta';
import { chronosEncode } from '../lib/omega/chronos-v6';
import { compressChronosArena } from '../lib/omega/chronos-arena';
import { nexusEncode } from '../lib/omega/nexus';
import { apexEncode } from '../lib/omega/apex';
import { veritasEncode } from '../lib/omega/veritas';
import { quasarEncode } from '../lib/omega/quasar';
import { helixEncode } from '../lib/omega/helix';
import { meridianEncode } from '../lib/omega/meridian';
import { plexusEncode } from '../lib/omega/plexus';
import { pulseEncode } from '../lib/omega/pulse';
import { anaphoraEncode } from '../lib/omega/anaphora';
import { axiomEncode } from '../lib/omega/axiom';
import { orbitEncode } from '../lib/omega/orbit';
import { tesseraEncode } from '../lib/omega/tessera';
import { strataEncode } from '../lib/omega/strata';
import { signetEncode } from '../lib/omega/signet';
import { mosaicEncode } from '../lib/omega/mosaic';
import { atlasEncodeCached } from '../lib/omega/atlas';
import { auroraEncodeCached } from '../lib/omega/aurora';
import { crownEncodeFromMembers } from '../lib/omega/crown';
import { irisEncodeFromCrown } from '../lib/omega/iris';
import { kernelEncodeFromCrown } from '../lib/omega/kernel';
import { zenithEncodeFromKernel } from '../lib/omega/zenith';
import { eclipseFromCandidates } from '../lib/omega/eclipse';
import { prismEncode } from '../lib/omega/prism';
import { spliceEncode } from '../lib/omega/splice';
import { replayEncode } from '../lib/omega/replay';
import { raptorEncode } from '../lib/omega/raptor';
import { mnemeApply } from '../lib/omega/persistent-dict';
import type { CodecWorkerRequest, CodecWorkerResponse } from './codec.types';

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<CodecWorkerRequest>) => {
  const { id, input, mnemeDict, axiomLedger } = event.data;
  void (async () => {
    try {
      const m0 = mnemeApply(input, 'o200k_base', mnemeDict);
      // Independent async lanes overlap naturally; synchronous lanes stay off
      // the UI thread and are memoized before meta-codecs query them again.
      const [omegaXi, prometheus, zeta, chronos, chronosArena, nexus, mnemeNexus, apex] =
        await Promise.all([
          omegaXiCompress(input, 'o200k_base'),
          compressPrometheusICDM(input, 'o200k_base'),
          zetaEncode(input, 'o200k_base'),
          chronosEncode(input, 'o200k_base'),
          compressChronosArena(input, 'o200k_base'),
          nexusEncode(input, 'o200k_base'),
          nexusEncode(m0.wire, 'o200k_base'),
          apexEncode(input, 'o200k_base'),
        ]);

      const veritas = veritasEncode(input, 'o200k_base');
      const quasar = quasarEncode(input, 'o200k_base');
      const helix = helixEncode(input, 'o200k_base');
      const pulse = pulseEncode(input, 'o200k_base');
      const anaphora = anaphoraEncode(input, 'o200k_base');
      const meridian = meridianEncode(input, 'o200k_base');
      const plexus = plexusEncode(input, 'o200k_base');
      const signet = signetEncode(input, 'o200k_base');
      const tessera = tesseraEncode(input, 'o200k_base');
      const strata = strataEncode(input, 'o200k_base');
      const axiom = axiomEncode(input, 'o200k_base', axiomLedger);
      const mosaic = mosaicEncode(input, 'o200k_base');
      const orbit = await orbitEncode(input, 'o200k_base', apex, axiomLedger, {
        meridian,
        anaphora,
        quasar,
        plexus,
        pulse,
        helix,
        veritas,
        axiom,
        tessera,
        strata,
        signet,
        mosaic,
      });
      const atlas = atlasEncodeCached(input, 'o200k_base');
      const aurora = auroraEncodeCached(input, 'o200k_base');
      const crown = await crownEncodeFromMembers(input, 'o200k_base', {
        atlas,
        aurora,
        mosaic,
        orbit,
        signet,
        helix,
        pulse,
        anaphora,
      });
      const iris = irisEncodeFromCrown(input, crown, 'o200k_base');
      const kernel = kernelEncodeFromCrown(input, crown, 'o200k_base');
      const zenith = zenithEncodeFromKernel(input, kernel, 'o200k_base');
      const splice = spliceEncode(input, 'o200k_base');
      const replay = replayEncode(input, 'o200k_base');
      const raptor = raptorEncode(input, 'o200k_base');
      const eclipse = eclipseFromCandidates(input, zenith, splice, replay, raptor, 'o200k_base');
      const prism = prismEncode(input, 'o200k_base');

      const response: CodecWorkerResponse = {
        id,
        ok: true,
        omegaXi,
        prometheus,
        zeta,
        chronos,
        chronosArena,
        nexus,
        mnemeNexus,
        apex,
        veritas,
        quasar,
        helix,
        meridian,
        plexus,
        pulse,
        anaphora,
        axiom,
        orbit,
        tessera,
        strata,
        signet,
        mosaic,
        atlas,
        aurora,
        crown,
        iris,
        kernel,
        zenith,
        eclipse,
        prism,
      };
      ctx.postMessage(response);
    } catch (error) {
      const response: CodecWorkerResponse = {
        id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
      ctx.postMessage(response);
    }
  })();
};