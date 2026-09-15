import type { OmegaXiResult } from '../lib/omega/atom-codec';
import type { PrometheusResult } from '../lib/omega/prometheus-icdm';
import type { ZetaResult } from '../lib/omega/zeta';
import type { ChronosResult } from '../lib/omega/chronos-v6';
import type { ChronosArenaResult } from '../lib/omega/chronos-arena';
import type { NexusResult } from '../lib/omega/nexus';
import type { ApexResult } from '../lib/omega/apex';
import type { VeritasResult } from '../lib/omega/veritas';
import type { QuasarResult } from '../lib/omega/quasar';
import type { HelixResult } from '../lib/omega/helix';
import type { MeridianResult } from '../lib/omega/meridian';
import type { PlexusResult } from '../lib/omega/plexus';
import type { PulseResult } from '../lib/omega/pulse';
import type { AnaphoraResult } from '../lib/omega/anaphora';
import type { AxiomResult, AxiomLedgerEntry } from '../lib/omega/axiom';
import type { OrbitResult } from '../lib/omega/orbit';
import type { TesseraResult } from '../lib/omega/tessera';
import type { StrataResult } from '../lib/omega/strata';
import type { SignetResult } from '../lib/omega/signet';
import type { RosettaResult } from '../lib/omega/rosetta';
import type { KappaResult } from '../lib/omega/kappa';
import type { MosaicResult } from '../lib/omega/mosaic';
import type { AtlasResult } from '../lib/omega/atlas';
import type { AuroraResult } from '../lib/omega/aurora';
import type { CrownResult } from '../lib/omega/crown';
import type { IrisResult } from '../lib/omega/iris';
import type { KernelResult } from '../lib/omega/kernel';
import type { ZenithResult } from '../lib/omega/zenith';
import type { EclipseResult } from '../lib/omega/eclipse';
import type { PersistentDictEntry } from '../lib/omega/persistent-dict';

export interface CodecWorkerRequest {
  id: number;
  input: string;
  mnemeDict: PersistentDictEntry[];
  axiomLedger: AxiomLedgerEntry[];
}

export interface CodecWorkerResult {
  id: number;
  ok: true;
  omegaXi: OmegaXiResult;
  prometheus: PrometheusResult;
  zeta: ZetaResult;
  chronos: ChronosResult;
  chronosArena: ChronosArenaResult;
  nexus: NexusResult;
  mnemeNexus: NexusResult;
  apex: ApexResult;
  veritas: VeritasResult;
  quasar: QuasarResult;
  helix: HelixResult;
  meridian: MeridianResult;
  plexus: PlexusResult;
  pulse: PulseResult;
  anaphora: AnaphoraResult;
  axiom: AxiomResult;
  orbit: OrbitResult;
  tessera: TesseraResult;
  strata: StrataResult;
  signet: SignetResult;
  rosetta: RosettaResult;
  kappa: KappaResult;
  mosaic: MosaicResult;
  atlas: AtlasResult;
  aurora: AuroraResult;
  crown: CrownResult;
  iris: IrisResult;
  kernel: KernelResult;
  zenith: ZenithResult;
  eclipse: EclipseResult;
}

export interface CodecWorkerFailure {
  id: number;
  ok: false;
  error: string;
}

export type CodecWorkerResponse = CodecWorkerResult | CodecWorkerFailure;