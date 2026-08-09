'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PRESETS, SAMPLE_TEXT, type NeuraleseOptions } from '@/lib/neuralese';
import { convertAdvanced, DEFAULT_ADVANCED, type AdvancedOptions } from '@/lib/neuralese-advanced';
import { encodeLosslessAscii, buildLosslessDecoderPreamble } from '@/lib/neuralese-lossless';
import { cavemanCompress, cavemanDecoderPrompt, type CavemanLevel } from '@/lib/neuralese-caveman';
import { compressDragi } from '@/lib/neuralese-dragi';
import { compressWenyan, buildWenyanDecoder, type WenyanLevel } from '@/lib/neuralese-wenyan';
import { compressComposite, compressDragiAtScale, type RoutingTarget } from '@/lib/neuralese-composite';
import { compileOrdosTriBand } from '@/lib/neuralese-ordos';
import { encodeAsg, asgDecoderPrompt } from '@/lib/neuralese-asg';
import { compressAst, astDecoderPrompt } from '@/lib/neuralese-ast';
import { compileNoether } from '@/lib/neuralese-noether';
import { compressHolographic } from '@/lib/neuralese-holographic';
import { compressCaveHolo } from '@/lib/neuralese-caveholo';
import { compressIbCaveHolo } from '@/lib/neuralese-ib';
import { countTokens } from '../lib/omega/bpe';
import { omegaXiCompress, OMEGA_XI_SYSTEM_PROMPT, type OmegaXiResult } from '../lib/omega/atom-codec';
import { ltpProject, type LtpResult } from '../lib/omega/ltp';
import { compressPrometheusICDM, type PrometheusResult } from '../lib/omega/prometheus-icdm';
import { zetaEncode, type ZetaResult } from '../lib/omega/zeta';
import { buildJanusSession, type JanusSession } from '../lib/omega/janus';
import { sigmaEncode, type SigmaResult } from '../lib/omega/sigma';
import { stencilEncode, stencilDecoderPrompt, type StencilResult } from '../lib/omega/stencil';
import { morphEncode, morphDecoderPrompt, type MorphResult } from '../lib/omega/morph';
import { chronosEncode, type ChronosResult } from '../lib/omega/chronos-v6';
import { compressChronosArena, type ChronosArenaResult } from '../lib/omega/chronos-arena';
import { nexusEncode, type NexusResult } from '../lib/omega/nexus';
import { e8Encode, type E8Result } from '../lib/omega/omega-e8seed';
import { eidolonProject, EIDOLON_SYSTEM_PROMPT, type EidolonResult } from '../lib/omega/eidolon';
import { apexEncode, type ApexResult } from '../lib/omega/apex';
import { veritasEncode, VERITAS_SYSTEM_PROMPT, type VeritasResult } from '../lib/omega/veritas';
import { quasarEncode, QUASAR_SYSTEM_PROMPT, type QuasarResult } from '../lib/omega/quasar';
import { helixEncode, HELIX_SYSTEM_PROMPT, type HelixResult } from '../lib/omega/helix';
import { meridianEncode, MERIDIAN_SYSTEM_PROMPT, type MeridianResult } from '../lib/omega/meridian';
import { plexusEncode, PLEXUS_SYSTEM_PROMPT, type PlexusResult } from '../lib/omega/plexus';
import { pulseEncode, PULSE_SYSTEM_PROMPT, type PulseResult } from '../lib/omega/pulse';
import { anaphoraEncode, anaphoraDecoderPrompt, type AnaphoraResult } from '../lib/omega/anaphora';
import { orbitEncode, orbitDecoderPrompt, type OrbitResult } from '../lib/omega/orbit';
import { axiomEncode, AXIOM_SYSTEM_PROMPT, loadAxiomLedger, saveAxiomLedger, type AxiomResult, type AxiomLedgerEntry } from '../lib/omega/axiom';
import { tesseraEncode, TESSERA_SYSTEM_PROMPT, type TesseraResult } from '../lib/omega/tessera';
import { strataEncode, STRATA_SYSTEM_PROMPT, type StrataResult } from '../lib/omega/strata';
import { signetEncode, SIGNET_SYSTEM_PROMPT, type SignetResult } from '../lib/omega/signet';
import { mosaicEncode, mosaicDecoderPrompt, type MosaicResult } from '../lib/omega/mosaic';
import { atlasEncodeCached as atlasEncode, atlasDecoderPrompt, type AtlasResult } from '../lib/omega/atlas';
import { auroraEncodeCached as auroraEncode, auroraDecoderPrompt, type AuroraResult } from '../lib/omega/aurora';
import { crownEncodeCached as crownEncode, crownDecoderPrompt, type CrownResult } from '../lib/omega/crown';
import { irisDecoderPrompt, type IrisResult } from '../lib/omega/iris';
import { kernelDecoderPrompt, type KernelResult } from '../lib/omega/kernel';
import CodecWorker from '../workers/codec.worker?worker&inline';
import type { CodecWorkerResponse } from '../workers/codec.types';
import { compressDragiFull, type DragiFullResult } from '../lib/omega/dragi-full';
import { loadPersistentDict, savePersistentDict, clearPersistentDict, learnFromText, mnemeApply, type MnemeResult as MnemeTier0Result, type PersistentDictEntry } from '../lib/omega/persistent-dict';

interface HistoryRow {
  id: number;
  source: string;
  output: string;
  preset: string;
  charDeltaPct: number;
  createdAt: string;
}

type CodecKey =
  | keyof typeof PRESETS
  | 'losslessAscii' | 'omegaXi' | 'omegaE8' | 'eidolon' | 'ltp' | 'prometheus' | 'zeta'
  | 'janus' | 'sigma' | 'stencil' | 'morph' | 'chronos' | 'chronosArena' | 'nexus' | 'mneme' | 'apex'
  | 'caveMan' | 'dragi' | 'wenyan' | 'composite' | 'dragiScale' | 'ordos' | 'asgJson'
  | 'astCode' | 'noether' | 'holographic' | 'caveHolo' | 'ibCaveHolo' | 'veritasVx' | 'quasar' | 'helixAp' | 'meridian' | 'plexus'
  | 'axiom' | 'orbit' | 'anaphora' | 'pulse' | 'tessera' | 'strata' | 'signet' | 'mosaic' | 'atlas' | 'aurora' | 'crown' | 'iris' | 'kernel';

interface ParetoRow {
  key: string;
  label: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  fidelityPct: number;
  safety: 'High' | 'Moderate' | 'Low';
  notes: string;
}

const GROUPS: Array<{ label: string; hint: string; keys: CodecKey[] }> = [
  { label: '🟢 LOSSLESS · WEB UI SAFE', hint: 'Readable in any chat UI. Zero decode tokens.', keys: ['kernel','iris','crown','aurora','atlas','mosaic','orbit','signet','strata','tessera','axiom','plexus','anaphora','meridian','quasar','helixAp','pulse','veritasVx','apex','eidolon','nexus','mneme','zeta','prometheus','ltp','sigma','stencil','morph','losslessAscii'] },
  { label: '🟡 DUPLEX · SCRIPTED UIs', hint: 'Arena / CI / Artifacts. Compress input and help compress output.', keys: ['chronosArena','chronos','janus'] },
  { label: '🔴 BINARY TRANSPORT', hint: 'Needs middleware / tool-call decoder.', keys: ['omegaXi','omegaE8'] },
  { label: '📝 SEMANTIC (lossy, LLM-readable)', hint: 'Directly readable, not byte-exact.', keys: ['light','balanced','max','extreme','caveMan','dragi','wenyan','composite','dragiScale','ordos','asgJson','astCode','noether','holographic','caveHolo','ibCaveHolo'] },
];

const LABEL: Record<string, string> = {
  light: 'Light', balanced: 'Balanced', max: 'Max', extreme: 'Extreme',
  losslessAscii: 'Lossless ASCII', omegaXi: '⚡ Ω-Ξ Atom', omegaE8: 'Σ₈ Ω-Σ E8-Seed', eidolon: '👻 EIDOLON',
  ltp: '📐 LTP', prometheus: '🔥 Prometheus', zeta: 'Ζ Zeta Duplex', janus: '🏛 Janus',
  kernel: '⊙ KERNEL ★★★★★', iris: '◇ IRIS ★★★★', crown: '♛ CROWN ★★★', aurora: '◇ AURORA ★★★', atlas: '✧ ATLAS ★★★', mosaic: '▦ MOSAIC ★★★', orbit: '◎ ORBIT ★★★', signet: '⌗ SIGNET ★★★', strata: '⨂ STRATA ★★', tessera: '⧉ TESSERA ★★', axiom: '⟦ AXIOM ⟧ ★★', anaphora: '⟐ ANAPHORA', pulse: '⟡ PULSE',
  plexus: '✺ PLEXUS ★★', meridian: '☉ MERIDIAN ★', quasar: '✦ QUASAR', helixAp: '⟐ HELIX-AP', veritasVx: '⟁ VERITAS-VX', sigma: 'Σ Schema Fold', stencil: '⌘ Stencil', morph: 'Ϻ Morph', chronos: '👑 Chronos V6', chronosArena: '🏟 Chronos Arena',
  nexus: 'Ω∞ NEXUS ★', mneme: 'Μ Ω-Mneme', apex: 'Λ† APEX ★★',
  caveMan: '🦴 CaveMan', dragi: '🐉 DRAGI-FULL', wenyan: '文言文 Wenyan', composite: '⚡ CaveMan+DRAGI',
  dragiScale: '📚 DRAGI Multi', ordos: '🔺 Ordos', asgJson: 'ASG JSON', astCode: '💻 AST Code',
  noether: '⚛ Noether', holographic: '🌀 Holographic', caveHolo: '🔥 CaveHolo', ibCaveHolo: '🧊 IB-CaveHolo',
};

const HINT: Record<string, string> = {
  apex: 'Verified tournament over all readable compositions; never worse than any constituent codec.',
  nexus: '3-layer readable lossless composition.',
  mneme: 'Persistent cross-turn dictionary + Nexus.',
  zeta: 'LTP + Prometheus composed.',
  prometheus: 'In-context dictionary meta-tokens.',
  ltp: 'Whitespace projection with local residual.',
  sigma: 'Schema fold for JSON/CSV structure.',
  stencil: 'Template induction for recurring shapes with varying values.',
  iris: 'Runtime decoder-contract partial evaluation: CROWN’s exact winning wire is unchanged, while unreachable grammar productions are removed from its decoder contract. Strict delivered-token improvement with one linear scan.',
  kernel: 'Canonical minimal operational contract: chooses the real-BPE minimum of IRIS prose and a semantics-equivalent compact decoder notation. IRIS is the fallback, so delivered tokens never increase; exact CROWN wire is unchanged.',
  crown: 'Delivered-objective universal exact tournament. Scores wire+contract across ATLAS, AURORA, MOSAIC, ORBIT, and exact lanes; emits the winning wire verbatim.',
  aurora: 'Original non-tournament delivered objective: the partition DP state carries the lane-contract bitmask, so it optimizes wire+contract during partitioning instead of after.',
  atlas: 'Contract-aware meta-partition: delivered tokens = wire + selected decoder contract. Includes MOSAIC as a member and emits the member wire verbatim.',
  mosaic: 'Optimal document partition with per-region codec assignment. Every other codec asks "which algorithm fits this document?"; MOSAIC asks "what is the best partition into regions, and which algorithm fits each one?" — solved exactly by dynamic programming over regime boundaries with real BPE costs. A real agent turn is prose + JSON + logs + code; no single lane serves all of it. The one-region partition is in the search space, so it can never lose (self-test Z15), and a single-region result is emitted bare with zero framing tax.',
  signet: 'Character-class signature alignment. Records are segmented into maximal DIGIT/ALPHA/OTHER runs and grouped by identical class signature, so a numeric field can never be half-absorbed into the template the way LCS does — the defect that shattered a 40-record log into four families. Templates derive from ALL records, family detection is O(chars) not O(len²), and slots feed the typed column coders. Verified never worse than STRATA (self-test G16).',
  strata: 'Typed column decomposition. After transposing records into columns, each column is written as the RULE that generates it — constant / arithmetic / cyclic / affix-factored — chosen by measured argmin, with literal enumeration always available as fallback. Turns O(records) into O(1) per regular column. Verified ≤ TESSERA on every shape (self-test S16).',
  tessera: 'Columnar transposition: the only lane that PERMUTES rather than substitutes. Detects line families (record strides 1–4), emits the template once, groups slot values into columns so HELIX/binders finally see adjacent material. Composes with every other lane.',
  axiom: 'Session-anchored: labels bound in EARLIER turns cost 1 token and need no definition (admission floor n≥1, not n≥2). Cascade binds + TESSERA/HELIX/PULSE tournament. Cold-start = PLEXUS.',
  orbit: 'Set-wise argmin over every exact lane (apex/meridian/anaphora/quasar/plexus/pulse/helix/veritas/axiom). Never worse than any member.',
  anaphora: 'Zero-header in-place binding: first occurrence stays in body, later ones alias. Beats header dicts by A+h−D per entry.',
  pulse: 'Exact run-length factoring of repeated UTF-16 code units; orthogonal to phrase and arithmetic lanes.',
  plexus: 'Cascade in-place binding (no header reprint) ⊕ HELIX tournament; dominates QUASAR headers and MERIDIAN non-cascade H1. 300-char hand-trace.',
  meridian: 'Dual-hemisphere tournament: zero-header anaphora ⊕ arithmetic closed-forms; best of {H1,H2,H2∘H1,H1∘H2} under real BPE + byte-exact gates. 300-char hand-trace.',
  quasar: 'Multi-width token n-gram re-pair cascade with verified 1-tok CJK aliases; reverse-order nested decode.',
  helixAp: 'Arithmetic-progression lattice factoring — orthogonal to substring dictionaries; O(1) markers for numeric runs.',
  veritasVx: 'Token-space mined, escape-complete, identity-guarded VX1 dictionary. 200-char hand-trace verified: exact round-trip on JSON+CSV+grid+code.',
  losslessAscii: 'ASCII-only exact transport.',
  chronosArena: 'Best-of Hypercube/ICDM/LTP duel for scripted UIs.',
  chronos: 'Shorthand symbols; output-side client bridge.',
  janus: 'Duplex dictionary contract (input + output).',
  omegaXi: 'Maximum binary transport savings; middleware only.',
  omegaE8: 'Exploratory E8 lattice vector quantization.',
  eidolon: 'Lossless semantic projection: strip predictable grammar to a local residual; LLM reads semantic core directly.',
};

// Keep the browser responsive before the hard 1M-character acceptance limit.
// Heavy codecs have no bounded main-thread complexity contract; they are
// explicitly skipped above this soft threshold while lightweight lanes remain
// usable. This prevents first-load stalls/blank screens on large pastes.
const UI_SOFT_CHAR_LIMIT = 120000;
const UI_HARD_CHAR_LIMIT = 1000000;

function semanticFidelity(original: string, compressed: string): number {
  const a = new Set((original.toLowerCase().match(/[a-z0-9_]{3,}/g) ?? []));
  const b = new Set((compressed.toLowerCase().match(/[a-z0-9_]{3,}/g) ?? []));
  if (a.size === 0) return 1;
  let hit = 0;
  for (const tok of a) if (b.has(tok)) hit++;
  return hit / a.size;
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-center">
      <div className={`text-xl font-semibold ${good ? 'text-emerald-300' : 'text-slate-300'}`}>{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

export default function Workbench() {
  const [input, setInput] = useState(SAMPLE_TEXT);
  const [codec, setCodec] = useState<CodecKey>('apex');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreamble, setShowPreamble] = useState(false);
  const [showRoundTrip, setShowRoundTrip] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [adv, setAdv] = useState<AdvancedOptions>(DEFAULT_ADVANCED);
  const [cavemanLevel, setCavemanLevel] = useState<CavemanLevel>('full');
  const [wenyanLevel, setWenyanLevel] = useState<WenyanLevel>('lite');
  const [mnemeDict, setMnemeDict] = useState<PersistentDictEntry[]>([]);

  const [omegaXiRes, setOmegaXiRes] = useState<OmegaXiResult | null>(null);
  const [promRes, setPromRes] = useState<PrometheusResult | null>(null);
  const [zetaRes, setZetaRes] = useState<ZetaResult | null>(null);
  const [chronosRes, setChronosRes] = useState<ChronosResult | null>(null);
  const [caRes, setCaRes] = useState<ChronosArenaResult | null>(null);
  const [nexusRes, setNexusRes] = useState<NexusResult | null>(null);
  const [mnemeNexusRes, setMnemeNexusRes] = useState<NexusResult | null>(null);
  const [apexRes, setApexRes] = useState<ApexResult | null>(null);
  const [veritasRes, setVeritasRes] = useState<VeritasResult | null>(null);
  const [quasarRes, setQuasarRes] = useState<QuasarResult | null>(null);
  const [helixRes, setHelixRes] = useState<HelixResult | null>(null);
  const [meridianRes, setMeridianRes] = useState<MeridianResult | null>(null);
  const [plexusRes, setPlexusRes] = useState<PlexusResult | null>(null);
  const [pulseRes, setPulseRes] = useState<PulseResult | null>(null);
  const [anaphoraRes, setAnaphoraRes] = useState<AnaphoraResult | null>(null);
  const [axiomRes, setAxiomRes] = useState<AxiomResult | null>(null);
  const [orbitRes, setOrbitRes] = useState<OrbitResult | null>(null);
  const [tesseraRes, setTesseraRes] = useState<TesseraResult | null>(null);
  const [strataRes, setStrataRes] = useState<StrataResult | null>(null);
  const [signetRes, setSignetRes] = useState<SignetResult | null>(null);
  const [mosaicRes, setMosaicRes] = useState<MosaicResult | null>(null);
  const [atlasRes, setAtlasRes] = useState<AtlasResult | null>(null);
  const [auroraRes, setAuroraRes] = useState<AuroraResult | null>(null);
  const [crownRes, setCrownRes] = useState<CrownResult | null>(null);
  const [irisRes, setIrisRes] = useState<IrisResult | null>(null);
  const [kernelRes, setKernelRes] = useState<KernelResult | null>(null);
  const [axiomLedger, setAxiomLedger] = useState<AxiomLedgerEntry[]>([]);
  const [includeDecoder, setIncludeDecoder] = useState(false);
  const [asyncBusy, setAsyncBusy] = useState(false);
  const runId = useRef(0);

  const largeTextMode = input.length > UI_SOFT_CHAR_LIMIT;
  const hardTextMode = input.length > UI_HARD_CHAR_LIMIT;
  // Heavy semantic codecs have no bounded complexity contract from the vendor.
  // Never invoke them for large documents on the browser main thread.
  const heavyInput = largeTextMode ? '' : input;
  const safeCodecInput = largeTextMode ? '' : input;

  useEffect(() => { setMnemeDict(loadPersistentDict()); setAxiomLedger(loadAxiomLedger()); }, []);

  const lossless = useMemo(() => encodeLosslessAscii(safeCodecInput), [safeCodecInput]);
  const ltpRes = useMemo(() => ltpProject(safeCodecInput, 'o200k_base'), [safeCodecInput]);
  const sigmaRes = useMemo(() => sigmaEncode(safeCodecInput, 'o200k_base'), [safeCodecInput]);
  const stencilRes = useMemo(() => stencilEncode(safeCodecInput, 'o200k_base'), [safeCodecInput]);
  const morphRes = useMemo(() => morphEncode(safeCodecInput, 'o200k_base'), [safeCodecInput]);
  const janusRes = useMemo(() => buildJanusSession(safeCodecInput, 'o200k_base'), [safeCodecInput]);
  const omegaE8Res = useMemo(() => e8Encode(safeCodecInput, 'o200k_base'), [safeCodecInput]);
  const eidolonRes = useMemo(() => eidolonProject(safeCodecInput, 'o200k_base'), [safeCodecInput]);
  const mnemeRes = useMemo(() => mnemeApply(heavyInput, 'o200k_base', mnemeDict), [heavyInput, mnemeDict]);

  const cavemanDefault = useMemo(() => cavemanCompress(heavyInput, cavemanLevel), [heavyInput, cavemanLevel]);
  const dragiFull = useMemo(() => compressDragiFull(heavyInput, 'o200k_base'), [heavyInput]);
  const dragiScale = useMemo(() => compressDragiAtScale(heavyInput, 3), [heavyInput]);
  const wenyan = useMemo(() => compressWenyan(heavyInput, wenyanLevel), [heavyInput, wenyanLevel]);
  const composite = useMemo(() => compressComposite(heavyInput), [heavyInput]);
  const ordos = useMemo(() => compileOrdosTriBand(heavyInput), [heavyInput]);
  const asg = useMemo(() => encodeAsg(heavyInput), [heavyInput]);
  const ast = useMemo(() => compressAst(heavyInput), [heavyInput]);
  const noether = useMemo(() => compileNoether(heavyInput), [heavyInput]);
  const holographic = useMemo(() => compressHolographic(heavyInput), [heavyInput]);
  const caveHolo = useMemo(() => compressCaveHolo(heavyInput), [heavyInput]);
  const ibCaveHolo = useMemo(() => compressIbCaveHolo(heavyInput), [heavyInput]);
  const advancedPreset = useMemo(() => {
    if (codec in PRESETS) return convertAdvanced(heavyInput, PRESETS[codec as keyof typeof PRESETS].options as NeuraleseOptions, adv);
    return convertAdvanced(heavyInput, PRESETS.balanced.options, adv);
  }, [heavyInput, codec, adv]);

  useEffect(() => {
    if (hardTextMode) {
      setOmegaXiRes(null); setPromRes(null); setZetaRes(null); setChronosRes(null); setCaRes(null); setNexusRes(null); setMnemeNexusRes(null); setApexRes(null); setVeritasRes(null); setQuasarRes(null); setHelixRes(null); setMeridianRes(null); setPlexusRes(null); setPulseRes(null); setAnaphoraRes(null); setAxiomRes(null); setOrbitRes(null); setTesseraRes(null); setStrataRes(null); setSignetRes(null); setMosaicRes(null); setAtlasRes(null); setAuroraRes(null); setCrownRes(null); setIrisRes(null); setKernelRes(null);
      setAsyncBusy(false);
      return;
    }
    const id = ++runId.current;
    setAsyncBusy(!largeTextMode);
    if (largeTextMode) {
      setOmegaXiRes(null); setPromRes(null); setZetaRes(null); setChronosRes(null); setCaRes(null); setNexusRes(null); setMnemeNexusRes(null); setApexRes(null); setVeritasRes(null); setQuasarRes(null); setHelixRes(null); setMeridianRes(null); setPlexusRes(null); setPulseRes(null); setAnaphoraRes(null); setAxiomRes(null); setOrbitRes(null); setTesseraRes(null); setStrataRes(null); setSignetRes(null); setMosaicRes(null); setAtlasRes(null); setAuroraRes(null); setCrownRes(null); setIrisRes(null); setKernelRes(null);
      return;
    }
      setOmegaXiRes(null); setPromRes(null); setZetaRes(null); setChronosRes(null); setCaRes(null); setNexusRes(null); setMnemeNexusRes(null); setApexRes(null); setVeritasRes(null); setQuasarRes(null); setHelixRes(null); setMeridianRes(null); setPlexusRes(null); setPulseRes(null); setAnaphoraRes(null); setAxiomRes(null); setOrbitRes(null); setTesseraRes(null); setStrataRes(null); setSignetRes(null); setMosaicRes(null); setAtlasRes(null); setAuroraRes(null); setCrownRes(null); setIrisRes(null); setKernelRes(null);
    // The complete tournament runs in an inline module worker. Terminating the
    // previous worker cancels obsolete input immediately; the UI/main thread
    // never executes BPE mining or dynamic-programming loops.
    const worker = new CodecWorker();
    worker.onmessage = (event: MessageEvent<CodecWorkerResponse>) => {
      const data = event.data;
      if (data.id !== id || runId.current !== id) return;
      if (!data.ok) {
        console.error('codec worker failed:', data.error);
        setAsyncBusy(false);
        return;
      }
      setOmegaXiRes(data.omegaXi); setPromRes(data.prometheus); setZetaRes(data.zeta);
      setChronosRes(data.chronos); setCaRes(data.chronosArena); setNexusRes(data.nexus);
      setMnemeNexusRes(data.mnemeNexus); setApexRes(data.apex); setVeritasRes(data.veritas);
      setQuasarRes(data.quasar); setHelixRes(data.helix); setMeridianRes(data.meridian);
      setPlexusRes(data.plexus); setPulseRes(data.pulse); setAnaphoraRes(data.anaphora);
      setAxiomRes(data.axiom); setOrbitRes(data.orbit); setTesseraRes(data.tessera);
      setStrataRes(data.strata); setSignetRes(data.signet); setMosaicRes(data.mosaic);
      setAtlasRes(data.atlas); setAuroraRes(data.aurora); setCrownRes(data.crown);
      setIrisRes(data.iris);
      setKernelRes(data.kernel);
      setAsyncBusy(false);
    };
    worker.onerror = (event) => {
      if (runId.current === id) {
        console.error('codec worker crashed:', event.message);
        setAsyncBusy(false);
      }
    };
    const t = setTimeout(() => {
      worker.postMessage({ id, input, mnemeDict, axiomLedger });
    }, 140);
    return () => {
      clearTimeout(t);
      worker.terminate();
    };
  }, [input, mnemeDict, largeTextMode, hardTextMode, axiomLedger]);

  const selected = useMemo(() => {
    // All selectable lanes are bounded by the same soft safety gate. This
    // avoids a blank screen caused by selecting a lightweight-looking lane
    // whose downstream tokenizer/encoder still receives a near-1M document.
    const heavyCodecKeys: CodecKey[] = GROUPS.flatMap((group) => group.keys);
    if (largeTextMode && heavyCodecKeys.includes(codec)) {
      const level = hardTextMode ? '300k' : '120k';
      return {
        out: `⛔ ${LABEL[codec] ?? codec} paused above ${level} characters for browser safety.\n\nSplit the document into smaller chunks. No codec is allowed to tokenize the full large paste on the UI thread.`,
        back: input,
        exact: true,
        inTok: countTokens(input, 'o200k_base'),
        outTok: countTokens(input, 'o200k_base'),
        preamble: '# Large-input safe mode\nHeavy codecs are disabled over the configured browser safety limit.',
        notes: `Paused ${LABEL[codec] ?? codec} above ${level} characters to prevent UI stalls or tab crashes.`,
      };
    }
    switch (codec) {
      case 'kernel': return { out: kernelRes?.wire ?? '⏳ Computing KERNEL…', back: kernelRes?.decoded ?? input, exact: !!kernelRes?.exact, inTok: kernelRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: kernelRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: kernelDecoderPrompt(kernelRes), notes: kernelRes?.notes ?? '' };
      case 'iris': return { out: irisRes?.wire ?? '⏳ Computing IRIS…', back: irisRes?.decoded ?? input, exact: !!irisRes?.exact, inTok: irisRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: irisRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: irisDecoderPrompt(irisRes), notes: irisRes?.notes ?? '' };
      case 'crown': return { out: crownRes?.wire ?? '⏳ Computing CROWN…', back: crownRes?.decoded ?? input, exact: !!crownRes?.exact, inTok: crownRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: crownRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: crownDecoderPrompt(crownRes), notes: crownRes?.notes ?? '' };
      case 'aurora': return { out: auroraRes?.wire ?? '⏳ Computing AURORA…', back: auroraRes?.decoded ?? input, exact: !!auroraRes?.exact, inTok: auroraRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: auroraRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: auroraDecoderPrompt(auroraRes), notes: auroraRes?.notes ?? '' };
      case 'atlas': return { out: atlasRes?.wire ?? '⏳ Computing ATLAS…', back: atlasRes?.decoded ?? input, exact: !!atlasRes?.exact, inTok: atlasRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: atlasRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: atlasDecoderPrompt(atlasRes), notes: atlasRes?.notes ?? '' };
      case 'mosaic': return { out: mosaicRes?.wire ?? '⏳ Computing MOSAIC…', back: mosaicRes?.decoded ?? input, exact: !!mosaicRes?.exact, inTok: mosaicRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: mosaicRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: mosaicDecoderPrompt(mosaicRes), notes: mosaicRes?.notes ?? '' };
      case 'signet': return { out: signetRes?.wire ?? '⏳ Computing SIGNET…', back: signetRes?.decoded ?? input, exact: !!signetRes?.exact, inTok: signetRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: signetRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: SIGNET_SYSTEM_PROMPT, notes: signetRes?.notes ?? '' };
      case 'strata': return { out: strataRes?.wire ?? '⏳ Computing STRATA…', back: strataRes?.decoded ?? input, exact: !!strataRes?.exact, inTok: strataRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: strataRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: STRATA_SYSTEM_PROMPT, notes: strataRes?.notes ?? '' };
      case 'tessera': return { out: tesseraRes?.wire ?? '⏳ Computing TESSERA…', back: tesseraRes?.decoded ?? input, exact: !!tesseraRes?.exact, inTok: tesseraRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: tesseraRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: TESSERA_SYSTEM_PROMPT, notes: tesseraRes?.notes ?? '' };
      case 'axiom': return { out: axiomRes?.wire ?? '⏳ Computing AXIOM…', back: axiomRes?.decoded ?? input, exact: !!axiomRes?.exact, inTok: axiomRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: axiomRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: AXIOM_SYSTEM_PROMPT, notes: axiomRes?.notes ?? '' };
      case 'orbit': return { out: orbitRes?.wire ?? '⏳ Computing ORBIT…', back: orbitRes?.decoded ?? input, exact: !!orbitRes?.exact, inTok: orbitRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: orbitRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: orbitDecoderPrompt(orbitRes), notes: orbitRes?.notes ?? '' };
      case 'anaphora': return { out: anaphoraRes?.wire ?? '⏳ Computing ANAPHORA…', back: anaphoraRes?.decoded ?? input, exact: !!anaphoraRes?.exact, inTok: anaphoraRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: anaphoraRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: anaphoraDecoderPrompt(anaphoraRes), notes: anaphoraRes?.notes ?? '' };
      case 'pulse': return { out: pulseRes?.wire ?? '⏳ Computing PULSE…', back: pulseRes?.decoded ?? input, exact: !!pulseRes?.exact, inTok: pulseRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: pulseRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: PULSE_SYSTEM_PROMPT, notes: pulseRes?.notes ?? '' };
      case 'plexus': return { out: plexusRes?.wire ?? '⏳ Computing PLEXUS…', back: plexusRes?.decoded ?? input, exact: !!plexusRes?.exact, inTok: plexusRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: plexusRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: PLEXUS_SYSTEM_PROMPT, notes: plexusRes?.notes ?? '' };
      case 'meridian': return { out: meridianRes?.wire ?? '⏳ Computing MERIDIAN…', back: meridianRes?.decoded ?? input, exact: !!meridianRes?.exact, inTok: meridianRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: meridianRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: MERIDIAN_SYSTEM_PROMPT, notes: meridianRes?.notes ?? '' };
      case 'quasar': return { out: quasarRes?.wire ?? '⏳ Computing QUASAR…', back: quasarRes?.decoded ?? input, exact: !!quasarRes?.exact, inTok: quasarRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: quasarRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: QUASAR_SYSTEM_PROMPT, notes: quasarRes?.notes ?? '' };
      case 'helixAp': return { out: helixRes?.wire ?? '⏳ Computing HELIX…', back: helixRes?.decoded ?? input, exact: !!helixRes?.exact, inTok: helixRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: helixRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: HELIX_SYSTEM_PROMPT, notes: helixRes?.notes ?? '' };
      case 'veritasVx': return { out: veritasRes?.wire ?? '⏳ Computing VERITAS-VX…', back: veritasRes?.decoded ?? input, exact: !!veritasRes?.exact, inTok: veritasRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: veritasRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: VERITAS_SYSTEM_PROMPT, notes: veritasRes?.notes ?? '' };
      case 'apex': return { out: apexRes?.wire ?? '⏳ Computing APEX…', back: apexRes?.decoded ?? input, exact: !!apexRes?.exact, inTok: apexRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: apexRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: apexRes ? `# Λ† OMEGA-APEX\nWinner: ${apexRes.order}\nAudit: ${apexRes.candidateAudit.map(a => `${a.order}=${a.tokens}t${a.exact ? '' : '(rejected)'}`).join(' · ')}` : '# Λ† OMEGA-APEX', notes: apexRes?.notes ?? '' };
      case 'nexus': return { out: nexusRes?.wire ?? '⏳ Computing NEXUS…', back: nexusRes?.decoded ?? input, exact: !!nexusRes?.exact, inTok: nexusRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: nexusRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: nexusRes ? `# Ω∞ NEXUS\n${nexusRes.notes}` : '# Ω∞ NEXUS', notes: nexusRes?.notes ?? '' };
      case 'mneme': return { out: (mnemeRes.appendixHeader + (nexusRes?.wire ?? input)), back: input, exact: true, inTok: mnemeRes.inTokens, outTok: nexusRes?.outTokens ?? mnemeRes.inTokens, preamble: '# Ω-MNEME\nPersistent dictionary + Nexus', notes: `Tracked ${mnemeDict.length} phrases; matched ${mnemeRes.usedEntries.length}.` };
      case 'losslessAscii': return { out: lossless.output, back: lossless.decoded, exact: true, inTok: countTokens(input, 'o200k_base'), outTok: countTokens(lossless.output, 'o200k_base'), preamble: buildLosslessDecoderPreamble(lossless.entries), notes: 'ASCII-only exact transport.' };
      case 'omegaXi': return { out: hardTextMode ? '⛔ Ω-Ξ disabled over 300k chars for UI safety.' : (largeTextMode ? '⛔ Ω-Ξ skipped over 120k chars. Use EIDOLON/LTP/Sigma/Stencil or split input.' : (omegaXiRes?.output ?? '⏳ Computing Ω-Ξ…')), back: omegaXiRes?.decoded ?? input, exact: !!omegaXiRes?.exact, inTok: omegaXiRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: omegaXiRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: OMEGA_XI_SYSTEM_PROMPT, notes: omegaXiRes?.codecName ?? (largeTextMode ? 'skipped for latency safety' : '') };
      case 'omegaE8': return { out: omegaE8Res.wire, back: omegaE8Res.decoded, exact: omegaE8Res.exact, inTok: omegaE8Res.inTokens, outTok: omegaE8Res.outTokens, preamble: '# Ω-Σ E8-Seed\n8D lattice quantization over character blocks. Byte-exact recovery: e8Decode(wire).', notes: `Vector blocks: ${omegaE8Res.vectorBlocks}.` };
      case 'eidolon': return { out: eidolonRes.wire, back: eidolonRes.decoded, exact: eidolonRes.exact, inTok: eidolonRes.inTokens, outTok: eidolonRes.outTokens, preamble: EIDOLON_SYSTEM_PROMPT, notes: eidolonRes.notes };
      case 'ltp': return { out: ltpRes.wire, back: input, exact: ltpRes.exact, inTok: ltpRes.inTokens, outTok: ltpRes.outTokens, preamble: `# LTP\nResidual local: ${ltpRes.opCount} ops / ${ltpRes.residualBytes}B.`, notes: ltpRes.notes };
      case 'prometheus': return { out: promRes?.output ?? '⏳ Computing Prometheus…', back: promRes?.decoded ?? input, exact: !!promRes?.exact, inTok: promRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: promRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: '# OMEGA-V4 PROMETHEUS\nDictionary meta-tokens are read directly. OUTPUT CONTRACT: reuse the same symbols in replies; code fences verbatim.', notes: promRes ? `${promRes.dictionaryCount} dictionary entries.` : '' };
      case 'zeta': return { out: largeTextMode ? '⛔ Zeta skipped over 120k chars. Use EIDOLON/LTP/Sigma/Stencil or split input.' : (zetaRes?.wire ?? '⏳ Computing Zeta…'), back: input, exact: !!zetaRes?.exact, inTok: zetaRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: zetaRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: '# OMEGA-ZETA\nLTP + Prometheus. OUTPUT CONTRACT active when dictionary exists.', notes: zetaRes?.mode ?? (largeTextMode ? 'skipped for latency safety' : '') };
      case 'janus': return { out: (janusRes?.contractHeader ?? '') + (janusRes?.inputWire ?? input), back: input, exact: true, inTok: janusRes?.inputOriginalTokens ?? countTokens(input, 'o200k_base'), outTok: (janusRes?.inputWireTokens ?? countTokens(input, 'o200k_base')) + (janusRes?.contractHeaderTokens ?? 0), preamble: janusRes?.contractHeader ?? '# JANUS', notes: `${janusRes?.entries.length ?? 0} entries; output contract active.` };
      case 'sigma': return { out: sigmaRes.wire, back: sigmaRes.decoded, exact: sigmaRes.exact, inTok: sigmaRes.inTokens, outTok: sigmaRes.outTokens, preamble: '# OMEGA-SIGMA\nSchema header + bare rows. Byte-exact recovery: sigmaDecode(wire).\nOUTPUT CONTRACT: When responding with rows of the same schema, keep the schema once and emit bare row values; code verbatim.', notes: sigmaRes.notes };
      case 'stencil': return { out: stencilRes.wire, back: stencilRes.decoded, exact: stencilRes.exact, inTok: stencilRes.inTokens, outTok: stencilRes.outTokens, preamble: stencilDecoderPrompt(stencilRes) + '\nOUTPUT CONTRACT: Reuse the same Tn|slot syntax for recurring response lines; code fences verbatim.', notes: stencilRes.notes };
      case 'morph': return { out: morphRes.wire, back: morphRes.decoded, exact: morphRes.exact, inTok: morphRes.inTokens, outTok: morphRes.outTokens, preamble: morphDecoderPrompt(morphRes), notes: morphRes.notes };
      case 'chronos': return { out: largeTextMode ? '⛔ Chronos skipped over 120k chars for UI safety.' : (chronosRes?.wire ?? '⏳ Computing Chronos…'), back: chronosRes?.decoded ?? input, exact: !!chronosRes?.exact, inTok: chronosRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: chronosRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: '# OMEGA-V6 CHRONOS\nOUTPUT CONTRACT active; code fences verbatim.', notes: chronosRes?.notes ?? (largeTextMode ? 'skipped for latency safety' : '') };
      case 'chronosArena': return { out: largeTextMode ? '⛔ Chronos Arena skipped over 120k chars for UI safety.' : (caRes?.output ?? '⏳ Computing Chronos Arena…'), back: caRes?.decoded ?? input, exact: !!caRes?.exact, inTok: caRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: caRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: '# OMEGA-V6 CHRONOS-ARENA\nDual-lane: prose compressed, code verbatim.', notes: caRes?.mode ?? (largeTextMode ? 'skipped for latency safety' : '') };
      case 'caveMan': return { out: cavemanDefault.output, back: input, exact: false, inTok: countTokens(input,'o200k_base'), outTok: countTokens(cavemanDefault.output,'o200k_base'), preamble: cavemanDecoderPrompt(cavemanLevel) + '\n\nOUTPUT STYLE: Reply in the same dense telegraphic style. Omit articles, copulas, and filler. Write code and identifiers verbatim.', notes: 'Lossy grammar strip.' };
      case 'dragi': return { out: dragiFull.output, back: input, exact: false, inTok: dragiFull.inTokens, outTok: dragiFull.outTokens, preamble: dragiFull.decoderPrompt + '\n\nOUTPUT STYLE: Reply using the same typed block style where possible; code verbatim.', notes: dragiFull.notes };
      case 'wenyan': return { out: wenyan.output, back: input, exact: false, inTok: countTokens(input,'o200k_base'), outTok: countTokens(wenyan.output,'o200k_base'), preamble: buildWenyanDecoder() + '\n\nOUTPUT STYLE: Prefer the same compact Wenyan substitutions in prose replies; code blocks verbatim.', notes: 'Classical Chinese substitution.' };
      case 'composite': return { out: composite.output, back: input, exact: false, inTok: countTokens(input,'o200k_base'), outTok: countTokens(composite.output,'o200k_base'), preamble: composite.decoderPrompt + '\n\nOUTPUT STYLE: Keep replies in the same compressed CaveMan+DRAGI style; code verbatim.', notes: 'CaveMan then DRAGI.' };
      case 'dragiScale': return { out: dragiScale.output, back: input, exact: false, inTok: countTokens(input,'o200k_base'), outTok: countTokens(dragiScale.output,'o200k_base'), preamble: dragiScale.decoderPrompt + '\n\nOUTPUT STYLE: Maintain chunked D12 skeleton style in replies; code verbatim.', notes: 'Chunked multi-card D12.' };
      case 'ordos': return { out: ordos.output, back: input, exact: false, inTok: countTokens(input,'o200k_base'), outTok: countTokens(ordos.output,'o200k_base'), preamble: ordos.orchestratorPrompt + '\n\nOUTPUT STYLE: Preserve L1/L2/L3 compact structure in replies.', notes: 'Tri-band compiler.' };
      case 'asgJson': return { out: asg.output, back: asg.decoded, exact: true, inTok: countTokens(input,'o200k_base'), outTok: countTokens(asg.output,'o200k_base'), preamble: asgDecoderPrompt(), notes: 'Structured JSON rows.' };
      case 'astCode': return { out: ast.output, back: ast.decoded, exact: true, inTok: countTokens(input,'o200k_base'), outTok: countTokens(ast.output,'o200k_base'), preamble: astDecoderPrompt(), notes: 'AST macro aliasing.' };
      case 'noether': return { out: noether.output, back: input, exact: false, inTok: countTokens(input,'o200k_base'), outTok: countTokens(noether.output,'o200k_base'), preamble: noether.decoderPreamble + '\n\nOUTPUT STYLE: Reuse commitment atoms / logical formula abbreviations in replies.', notes: 'Commitment codec.' };
      case 'holographic': return { out: holographic.output, back: holographic.decoded, exact: holographic.exact, inTok: countTokens(input,'o200k_base'), outTok: countTokens(holographic.output,'o200k_base'), preamble: holographic.decoderPrompt + '\n\nOUTPUT CONTRACT: Reuse the same $codes in replies when the aliased terms recur; code verbatim.', notes: 'Boundary aliases.' };
      case 'caveHolo': return { out: caveHolo.output, back: input, exact: false, inTok: countTokens(input,'o200k_base'), outTok: countTokens(caveHolo.output,'o200k_base'), preamble: caveHolo.decoderPrompt + '\n\nOUTPUT CONTRACT: Reuse the same $codes and telegraphic grammar in replies; code verbatim.', notes: 'Two-stage semantic.' };
      case 'ibCaveHolo': return { out: ibCaveHolo.output, back: input, exact: false, inTok: countTokens(input,'o200k_base'), outTok: countTokens(ibCaveHolo.output,'o200k_base'), preamble: ibCaveHolo.decoderPrompt + '\n\nOUTPUT CONTRACT: Reuse the same $codes and omit low-density filler in replies. Protected units stay verbatim; code fences verbatim.', notes: 'Pruned semantic.' };
      default: return { out: advancedPreset.output, back: advancedPreset.roundTrip, exact: false, inTok: countTokens(input,'o200k_base'), outTok: countTokens(advancedPreset.output,'o200k_base'), preamble: advancedPreset.decoderPreamble, notes: PRESETS[codec as keyof typeof PRESETS]?.hint ?? '' };
    }
  }, [codec, input, lossless, omegaXiRes, omegaE8Res, ltpRes, promRes, zetaRes, janusRes, sigmaRes, stencilRes, chronosRes, caRes, nexusRes, mnemeRes, mnemeNexusRes, apexRes, veritasRes, quasarRes, helixRes, meridianRes, plexusRes, pulseRes, anaphoraRes, axiomRes, orbitRes, tesseraRes, strataRes, signetRes, mosaicRes, atlasRes, auroraRes, crownRes, irisRes, kernelRes, cavemanDefault, dragiFull, wenyan, composite, dragiScale, ordos, asg, ast, noether, holographic, caveHolo, ibCaveHolo, advancedPreset, cavemanLevel, mnemeDict]);

  const rows: ParetoRow[] = useMemo(() => {
    const inTok = countTokens(input, 'o200k_base');
    const mk = (key: string, label: string, output: string, exact: boolean, safety: ParetoRow['safety'], notes: string): ParetoRow => {
      const outTok = countTokens(output, 'o200k_base');
      const fid = exact ? 100 : Math.round(semanticFidelity(input, output) * 100);
      return { key, label, exact, inTokens: inTok, outTokens: outTok, savingsPct: inTok ? ((inTok - outTok) / inTok) * 100 : 0, fidelityPct: fid, safety, notes };
    };
    const out: ParetoRow[] = [];
    if (largeTextMode) {
      const addSafe = (key: string, label: string, r: { exact: boolean; inTokens: number; outTokens: number; savingsPct: number; notes: string }) => {
        if (r.exact && r.outTokens <= r.inTokens) {
          out.push({ key, label, exact: true, inTokens: r.inTokens, outTokens: r.outTokens, savingsPct: r.savingsPct, fidelityPct: 100, safety: 'High', notes: r.notes });
        }
      };
      addSafe('ltp', '📐 LTP', ltpRes);
      addSafe('sigma', 'Σ Sigma', sigmaRes);
      addSafe('stencil', '⌘ Stencil', stencilRes);
      addSafe('morph', 'Ϻ Morph', morphRes);
      addSafe('eidolon', '👻 EIDOLON', eidolonRes);
      addSafe('omegaE8', 'Σ₈ E8-Seed', { ...omegaE8Res, notes: `E8 vectors: ${omegaE8Res.vectorBlocks}` });
      out.push({ key: 'identity', label: 'Identity (safe mode)', exact: true, inTokens: inTok, outTokens: inTok, savingsPct: 0, fidelityPct: 100, safety: 'High', notes: 'Heavy codecs skipped over 120k chars.' });
      return out.sort((a, b) => b.savingsPct - a.savingsPct);
    }
    if (apexRes?.exact && apexRes.outTokens <= apexRes.inTokens) out.push({ key:'apex', label:'Λ† APEX', exact:true, inTokens:apexRes.inTokens, outTokens:apexRes.outTokens, savingsPct:apexRes.savingsPct, fidelityPct:100, safety:'High', notes:apexRes.notes });
    if (eidolonRes.exact && eidolonRes.outTokens <= eidolonRes.inTokens) out.push({ key:'eidolon', label:'👻 EIDOLON', exact:true, inTokens:eidolonRes.inTokens, outTokens:eidolonRes.outTokens, savingsPct:eidolonRes.savingsPct, fidelityPct:100, safety:'High', notes:eidolonRes.notes });
    if (nexusRes?.exact && nexusRes.outTokens <= nexusRes.inTokens) out.push({ key:'nexus', label:'★ Ω∞ NEXUS', exact:true, inTokens:nexusRes.inTokens, outTokens:nexusRes.outTokens, savingsPct:nexusRes.savingsPct, fidelityPct:100, safety:'High', notes:nexusRes.notes });
    if (mnemeNexusRes?.exact && mnemeNexusRes.outTokens < mnemeRes.inTokens) out.push({ key:'mneme', label:'Μ Ω-Mneme', exact:true, inTokens:mnemeRes.inTokens, outTokens:mnemeNexusRes.outTokens, savingsPct:((mnemeRes.inTokens-mnemeNexusRes.outTokens)/mnemeRes.inTokens)*100, fidelityPct:100, safety:'High', notes:`${mnemeRes.usedEntries.length} persistent entries used.` });
    if (zetaRes?.exact && zetaRes.outTokens <= zetaRes.inTokens) out.push({ key:'zeta', label:'Ζ Zeta', exact:true, inTokens:zetaRes.inTokens, outTokens:zetaRes.outTokens, savingsPct:zetaRes.savingsPct, fidelityPct:100, safety:'High', notes:zetaRes.notes });
    if (promRes?.exact && promRes.outTokens <= promRes.inTokens) out.push({ key:'prometheus', label:'🔥 Prometheus', exact:true, inTokens:promRes.inTokens, outTokens:promRes.outTokens, savingsPct:promRes.savingsPct, fidelityPct:100, safety:'High', notes:promRes.dictionaryCount + ' dict entries' });
    if (ltpRes.exact && ltpRes.outTokens <= ltpRes.inTokens) out.push({ key:'ltp', label:'📐 LTP', exact:true, inTokens:ltpRes.inTokens, outTokens:ltpRes.outTokens, savingsPct:ltpRes.savingsPct, fidelityPct:100, safety:'High', notes:ltpRes.notes });
    if (sigmaRes.exact && sigmaRes.outTokens <= sigmaRes.inTokens) out.push({ key:'sigma', label:'Σ Sigma', exact:true, inTokens:sigmaRes.inTokens, outTokens:sigmaRes.outTokens, savingsPct:sigmaRes.savingsPct, fidelityPct:100, safety:'High', notes:sigmaRes.notes });
    if (stencilRes.exact && stencilRes.outTokens <= stencilRes.inTokens) out.push({ key:'stencil', label:'⌘ Stencil', exact:true, inTokens:stencilRes.inTokens, outTokens:stencilRes.outTokens, savingsPct:stencilRes.savingsPct, fidelityPct:100, safety:'High', notes:stencilRes.notes });
    if (morphRes.exact && morphRes.outTokens <= morphRes.inTokens) out.push({ key:'morph', label:'Ϻ Morph', exact:true, inTokens:morphRes.inTokens, outTokens:morphRes.outTokens, savingsPct:morphRes.savingsPct, fidelityPct:100, safety:'High', notes:morphRes.notes });
    if (omegaE8Res.exact && omegaE8Res.outTokens <= omegaE8Res.inTokens) out.push({ key:'omegaE8', label:'Σ₈ E8-Seed', exact:true, inTokens:omegaE8Res.inTokens, outTokens:omegaE8Res.outTokens, savingsPct:omegaE8Res.savingsPct, fidelityPct:100, safety:'High', notes:`${omegaE8Res.vectorBlocks} blocks` });
    if (omegaXiRes?.exact && omegaXiRes.outTokens <= omegaXiRes.inTokens) out.push({ key:'omegaXi', label:'⚡ Ω-Ξ Atom', exact:true, inTokens:omegaXiRes.inTokens, outTokens:omegaXiRes.outTokens, savingsPct:omegaXiRes.savingsPct, fidelityPct:100, safety:'Low', notes:omegaXiRes.codecName });
    if (chronosRes?.exact && chronosRes.outTokens <= chronosRes.inTokens) out.push({ key:'chronos', label:'👑 Chronos', exact:true, inTokens:chronosRes.inTokens, outTokens:chronosRes.outTokens, savingsPct:chronosRes.savingsPct, fidelityPct:100, safety:'Moderate', notes:chronosRes.notes });
    if (mosaicRes?.exact && mosaicRes.outTokens <= mosaicRes.inTokens) out.push({ key:'mosaic', label:'▦ MOSAIC', exact:true, inTokens:mosaicRes.inTokens, outTokens:mosaicRes.outTokens, savingsPct:mosaicRes.savingsPct, fidelityPct:100, safety:'High', notes:mosaicRes.notes });
    if (atlasRes?.exact && atlasRes.deliveredTokens <= atlasRes.inTokens) out.push({ key:'atlas', label:'✧ ATLAS (delivered)', exact:true, inTokens:atlasRes.inTokens, outTokens:atlasRes.deliveredTokens, savingsPct:atlasRes.inTokens ? ((atlasRes.inTokens-atlasRes.deliveredTokens)/atlasRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:atlasRes.notes });
    if (auroraRes?.exact && auroraRes.deliveredTokens <= auroraRes.inTokens) out.push({ key:'aurora', label:'◇ AURORA (delivered)', exact:true, inTokens:auroraRes.inTokens, outTokens:auroraRes.deliveredTokens, savingsPct:auroraRes.inTokens ? ((auroraRes.inTokens-auroraRes.deliveredTokens)/auroraRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:auroraRes.notes });
    if (crownRes?.exact && crownRes.deliveredTokens <= crownRes.inTokens) out.push({ key:'crown', label:'♛ CROWN (delivered)', exact:true, inTokens:crownRes.inTokens, outTokens:crownRes.deliveredTokens, savingsPct:crownRes.inTokens ? ((crownRes.inTokens-crownRes.deliveredTokens)/crownRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:crownRes.notes });
    if (irisRes?.exact && irisRes.deliveredTokens <= irisRes.inTokens) out.push({ key:'iris', label:'◇ IRIS (delivered)', exact:true, inTokens:irisRes.inTokens, outTokens:irisRes.deliveredTokens, savingsPct:irisRes.inTokens ? ((irisRes.inTokens-irisRes.deliveredTokens)/irisRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:irisRes.notes });
    if (kernelRes?.exact && kernelRes.deliveredTokens <= kernelRes.inTokens) out.push({ key:'kernel', label:'⊙ KERNEL (delivered)', exact:true, inTokens:kernelRes.inTokens, outTokens:kernelRes.deliveredTokens, savingsPct:kernelRes.inTokens ? ((kernelRes.inTokens-kernelRes.deliveredTokens)/kernelRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:kernelRes.notes });
    if (signetRes?.exact && signetRes.outTokens <= signetRes.inTokens) out.push({ key:'signet', label:'⌗ SIGNET', exact:true, inTokens:signetRes.inTokens, outTokens:signetRes.outTokens, savingsPct:signetRes.savingsPct, fidelityPct:100, safety:'High', notes:signetRes.notes });
    if (strataRes?.exact && strataRes.outTokens <= strataRes.inTokens) out.push({ key:'strata', label:'⨂ STRATA', exact:true, inTokens:strataRes.inTokens, outTokens:strataRes.outTokens, savingsPct:strataRes.savingsPct, fidelityPct:100, safety:'High', notes:strataRes.notes });
    if (tesseraRes?.exact && tesseraRes.outTokens <= tesseraRes.inTokens) out.push({ key:'tessera', label:'⧉ TESSERA', exact:true, inTokens:tesseraRes.inTokens, outTokens:tesseraRes.outTokens, savingsPct:tesseraRes.savingsPct, fidelityPct:100, safety:'High', notes:tesseraRes.notes });
    if (axiomRes?.exact && axiomRes.outTokens <= axiomRes.inTokens) out.push({ key:'axiom', label:'⟦ AXIOM ⟧', exact:true, inTokens:axiomRes.inTokens, outTokens:axiomRes.outTokens, savingsPct:axiomRes.savingsPct, fidelityPct:100, safety:'High', notes:axiomRes.notes });
    if (orbitRes?.exact && orbitRes.outTokens <= orbitRes.inTokens) out.push({ key:'orbit', label:'◎ ORBIT', exact:true, inTokens:orbitRes.inTokens, outTokens:orbitRes.outTokens, savingsPct:orbitRes.savingsPct, fidelityPct:100, safety:'High', notes:orbitRes.notes });
    if (anaphoraRes?.exact && anaphoraRes.outTokens <= anaphoraRes.inTokens) out.push({ key:'anaphora', label:'⟐ ANAPHORA', exact:true, inTokens:anaphoraRes.inTokens, outTokens:anaphoraRes.outTokens, savingsPct:anaphoraRes.savingsPct, fidelityPct:100, safety:'High', notes:anaphoraRes.notes });
    if (pulseRes?.exact && pulseRes.outTokens <= pulseRes.inTokens) out.push({ key:'pulse', label:'⟡ PULSE', exact:true, inTokens:pulseRes.inTokens, outTokens:pulseRes.outTokens, savingsPct:pulseRes.savingsPct, fidelityPct:100, safety:'High', notes:pulseRes.notes });
    if (plexusRes?.exact && plexusRes.outTokens <= plexusRes.inTokens) out.push({ key:'plexus', label:'✺ PLEXUS', exact:true, inTokens:plexusRes.inTokens, outTokens:plexusRes.outTokens, savingsPct:plexusRes.savingsPct, fidelityPct:100, safety:'High', notes:plexusRes.notes });
    if (meridianRes?.exact && meridianRes.outTokens <= meridianRes.inTokens) out.push({ key:'meridian', label:'☉ MERIDIAN', exact:true, inTokens:meridianRes.inTokens, outTokens:meridianRes.outTokens, savingsPct:meridianRes.savingsPct, fidelityPct:100, safety:'High', notes:meridianRes.notes });
    if (quasarRes?.exact && quasarRes.outTokens <= quasarRes.inTokens) out.push({ key:'quasar', label:'✦ QUASAR', exact:true, inTokens:quasarRes.inTokens, outTokens:quasarRes.outTokens, savingsPct:quasarRes.savingsPct, fidelityPct:100, safety:'High', notes:quasarRes.notes });
    if (helixRes?.exact && helixRes.outTokens <= helixRes.inTokens) out.push({ key:'helixAp', label:'⟐ HELIX-AP', exact:true, inTokens:helixRes.inTokens, outTokens:helixRes.outTokens, savingsPct:helixRes.savingsPct, fidelityPct:100, safety:'High', notes:helixRes.notes });
    if (veritasRes?.exact) out.push({ key:'veritasVx', label:'⟁ VERITAS-VX', exact:true, inTokens:veritasRes.inTokens, outTokens:veritasRes.outTokens, savingsPct:veritasRes.savingsPct, fidelityPct:100, safety:'High', notes:veritasRes.notes });
    if (caRes?.exact && caRes.outTokens <= caRes.inTokens) out.push({ key:'chronosArena', label:'🏟 Chronos Arena', exact:true, inTokens:caRes.inTokens, outTokens:caRes.outTokens, savingsPct:caRes.savingsPct, fidelityPct:100, safety:'Moderate', notes:caRes.mode });
    if (janusRes) out.push({ key:'janus', label:'🏛 Janus', exact:true, inTokens:janusRes.inputOriginalTokens, outTokens:janusRes.inputWireTokens + janusRes.contractHeaderTokens, savingsPct:((janusRes.inputOriginalTokens-(janusRes.inputWireTokens+janusRes.contractHeaderTokens))/janusRes.inputOriginalTokens)*100, fidelityPct:100, safety:'Moderate', notes:`${janusRes.entries.length} entries` });
    out.push(mk('dragi', '🐉 DRAGI-FULL', dragiFull.output, false, 'Moderate', dragiFull.notes));
    out.push(mk('caveMan', '🦴 CaveMan', cavemanDefault.output, false, 'Moderate', 'Lossy grammar strip'));
    out.push(mk('wenyan', '文言文 Wenyan', wenyan.output, false, 'Moderate', 'Classical Chinese substitution'));
    out.push(mk('composite', '⚡ CaveMan+DRAGI', composite.output, false, 'Moderate', 'Two-stage semantic'));
    out.push(mk('dragiScale', '📚 DRAGI Multi', dragiScale.output, false, 'Moderate', 'Chunked D12'));
    out.push(mk('ordos', '🔺 Ordos', ordos.output, false, 'High', 'Tri-band'));
    out.push(mk('noether', '⚛ Noether', noether.output, false, 'High', 'Commitments'));
    out.push(mk('holographic', '🌀 Holographic', holographic.output, holographic.exact, 'High', 'Boundary aliases'));
    out.push(mk('caveHolo', '🔥 CaveHolo', caveHolo.output, false, 'Moderate', 'Two-stage semantic'));
    out.push(mk('ibCaveHolo', '🧊 IB-CaveHolo', ibCaveHolo.output, false, 'Moderate', 'Pruned semantic'));
    out.push(mk('asgJson', 'ASG JSON', asg.output, true, 'High', 'Schema rows'));
    out.push(mk('astCode', '💻 AST Code', ast.output, true, 'High', 'AST macro aliasing'));
    out.push(mk('light', 'Light', convertAdvanced(input, PRESETS.light.options, adv).output, false, 'High', PRESETS.light.hint));
    out.push(mk('balanced', 'Balanced', convertAdvanced(input, PRESETS.balanced.options, adv).output, false, 'High', PRESETS.balanced.hint));
    out.push(mk('max', 'Max', convertAdvanced(input, PRESETS.max.options, adv).output, false, 'Moderate', PRESETS.max.hint));
    out.push(mk('extreme', 'Extreme', convertAdvanced(input, PRESETS.extreme.options, adv).output, false, 'Low', PRESETS.extreme.hint));
    return out.sort((a,b) => b.savingsPct - a.savingsPct || b.fidelityPct - a.fidelityPct);
  }, [input, largeTextMode, apexRes, veritasRes, quasarRes, helixRes, meridianRes, plexusRes, pulseRes, anaphoraRes, axiomRes, orbitRes, tesseraRes, strataRes, signetRes, mosaicRes, atlasRes, auroraRes, crownRes, irisRes, kernelRes, eidolonRes, nexusRes, mnemeRes, mnemeNexusRes, zetaRes, promRes, ltpRes, sigmaRes, stencilRes, morphRes, omegaE8Res, omegaXiRes, chronosRes, caRes, janusRes, dragiFull, cavemanDefault, wenyan, composite, dragiScale, ordos, noether, holographic, caveHolo, ibCaveHolo, asg, ast, adv]);

  const selectedRow = rows.find((r) => r.key === codec);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/conversions');
      const data = (await res.json()) as { ok: boolean; rows: HistoryRow[] };
      if (data.ok) setHistory(data.rows);
    } catch {}
  }, []);
  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const learnCurrent = useCallback(() => {
    const next = learnFromText(input, 'o200k_base', mnemeDict);
    setMnemeDict(next);
    savePersistentDict(next);
    setCopied(false);
  }, [input, mnemeDict]);
  const clearMneme = useCallback(() => {
    clearPersistentDict();
    setMnemeDict([]);
  }, []);

  const finalOut = includeDecoder ? selected.preamble + '\n\n' + selected.out : selected.out;
  const finalOutTokens = includeDecoder ? countTokens(finalOut, 'o200k_base') : selected.outTok;

  const save = useCallback(async () => {
    if (!input.trim() || !finalOut.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/conversions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: input,
          output: finalOut,
          preset: codec,
          inChars: input.length,
          outChars: finalOut.length,
          charDeltaPct: input.length ? Math.round(((input.length - finalOut.length) / input.length) * 100) : 0,
        }),
      });
      if (axiomRes?.ledgerAfter?.length) {
        saveAxiomLedger(axiomRes.ledgerAfter);
        setAxiomLedger(axiomRes.ledgerAfter);
      }
      await loadHistory();
    } finally { setSaving(false); }
  }, [input, finalOut, codec, loadHistory, axiomRes]);

  const downloadOut = useCallback(() => {
    const blob = new Blob([finalOut], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${codec}.txt`; a.click();
    URL.revokeObjectURL(url);
  }, [finalOut, codec]);

  const exactLane = ['kernel','iris','crown','aurora','atlas','mosaic','signet','strata','tessera','axiom','orbit','anaphora','pulse','plexus','meridian','quasar','helixAp','veritasVx','apex','eidolon','nexus','mneme','losslessAscii','omegaXi','omegaE8','ltp','prometheus','zeta','janus','sigma','stencil','chronos','chronosArena','asgJson','astCode'].includes(codec);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <img src="/icons/icon-192.png" alt="Neuralese Compiler" className="h-11 w-11 rounded-xl shadow-lg shadow-indigo-900/40" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Neuralese Compiler</h1>
            <p className="text-sm text-slate-400">Production prompt codec workbench · all codecs in one place · real tokenizer counts</p>
          </div>
        </div>
      </header>

      <div className="mb-4 space-y-3">
        {GROUPS.map((g) => (
          <div key={g.label}>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{g.label}</span>
              <span className="text-[10px] text-slate-600">{g.hint}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {g.keys.map((k) => {
                const active = k === codec;
                const cls = active
                  ? k === 'apex' ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white ring-2 ring-amber-400/60'
                    : k === 'nexus' ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white ring-2 ring-emerald-400/50'
                    : k === 'mneme' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white ring-2 ring-indigo-400/50'
                    : k === 'omegaE8' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white ring-2 ring-emerald-400/50'
                    : k === 'omegaXi' ? 'bg-fuchsia-600 text-white'
                    : k === 'prometheus' ? 'bg-orange-600 text-white'
                    : k === 'zeta' ? 'bg-emerald-600 text-white'
                    : k === 'janus' ? 'bg-violet-600 text-white'
                    : k === 'sigma' ? 'bg-blue-600 text-white'
                    : k === 'stencil' ? 'bg-cyan-600 text-white'
                    : k === 'chronos' ? 'bg-yellow-600 text-white'
                    : k === 'chronosArena' ? 'bg-rose-600 text-white'
                    : 'bg-indigo-500 text-white'
                  : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700';
                return <button key={k} onClick={() => setCodec(k)} title={HINT[k] ?? PRESETS[k as keyof typeof PRESETS]?.hint ?? ''} className={`rounded-full px-3 py-1.5 text-sm font-medium transition shadow ${cls}`}>{LABEL[k] ?? PRESETS[k as keyof typeof PRESETS]?.label ?? k}</button>;
              })}
            </div>
          </div>
        ))}
      </div>

      <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{LABEL[codec] ?? codec}</h2>
            <p className="max-w-4xl text-xs leading-relaxed text-slate-500">{selected.notes || HINT[codec] || 'No notes.'}</p>
            {largeTextMode && (
              <div className="mt-2 rounded-lg border border-amber-700/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                <strong>Large-input safe mode active.</strong> Inputs over 120,000 chars skip the heavy async codecs
                (Prometheus, Zeta, Chronos, Chronos-Arena, Ω-Ξ, APEX) to prevent UI stalls or tab crashes.
                Inputs over 300,000 chars hard-disable those lanes entirely. LTP, Sigma, Stencil, EIDOLON,
                DRAGI-FULL, and the semantic codecs remain available.
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {codec === 'mneme' && (
              <>
                <button onClick={learnCurrent} className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500">Learn this text</button>
                <button onClick={clearMneme} className="rounded-md bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700">Clear dictionary</button>
              </>
            )}
            {asyncBusy && <span className="rounded-md bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-300">⏳ computing…</span>}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Source Text</span>
            <span className="font-mono text-slate-500">{input.length} chars · ~{countTokens(input, 'o200k_base')} real BPE tok</span>
          </div>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} className="h-72 w-full resize-y rounded-2xl border border-slate-800 bg-slate-900/60 p-4 font-mono text-sm leading-relaxed text-slate-200 outline-none focus:border-indigo-500" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>{LABEL[codec] ?? codec} Output {asyncBusy && <span className="ml-2 text-amber-400">⏳ computing…</span>}</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] normal-case">
                <input type="checkbox" checked={includeDecoder} onChange={(e) => setIncludeDecoder(e.target.checked)} className="rounded bg-slate-900 border-slate-700 text-indigo-500" />
                Include Decoder
              </label>
              <span className="font-mono text-slate-500">{finalOut.length} chars · ~{finalOutTokens} real BPE tok</span>
              <button onClick={() => {
                navigator.clipboard.writeText(includeDecoder ? selected.preamble + '\n\n' + selected.out : selected.out).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                });
              }} disabled={!selected.out} className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-40">{copied ? 'Copied!' : 'Copy'}</button>
            </div>
          </div>
          <textarea readOnly value={includeDecoder ? selected.preamble + '\n\n' + selected.out : selected.out} className="h-72 w-full resize-y rounded-2xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-sm leading-relaxed text-emerald-300 outline-none" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowPreamble((v) => !v)} className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white">{showPreamble ? 'Hide Decoder Prompt' : 'Show Decoder Prompt'}</button>
          <button onClick={() => setShowRoundTrip((v) => !v)} className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white">{showRoundTrip ? 'Hide Round-Trip' : 'Verify Round-Trip'}</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadOut} disabled={!selected.out} className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white disabled:opacity-40">Download .txt</button>
          <button onClick={save} disabled={!input || !selected.out || saving} className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40">{saving ? 'Saving...' : 'Save to History'}</button>
        </div>
      </div>

      {showPreamble && (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Decoder / Reasoning Prompt</span>
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-300">{selected.preamble}</pre>
        </div>
      )}

      {showRoundTrip && (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Round-Trip Reconstruction {exactLane ? '(exact byte-for-byte)' : '(semantic fidelity)'}</span>
            <span className={selected.exact ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{selected.exact ? 'IDENTICAL' : 'NON-IDENTICAL / PROBABILISTIC'}</span>
          </div>
          <textarea readOnly value={selected.back} className="h-40 w-full resize-y rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-300 outline-none" />
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <Stat label="Real tok (in→out)" value={`${selected.inTok}→${finalOutTokens}`} good={finalOutTokens < selected.inTok} />
        <Stat label="Real tok saved" value={`${Math.max(0, selected.inTok - finalOutTokens)}`} good={finalOutTokens < selected.inTok} />
        <Stat label="Real savings" value={`${selected.inTok ? (((selected.inTok - finalOutTokens) / selected.inTok) * 100).toFixed(1) : '0.0'}%`} good={finalOutTokens < selected.inTok} />
        <Stat label="Fidelity" value={`${selectedRow?.fidelityPct ?? (selected.exact ? 100 : Math.round(semanticFidelity(input, selected.out) * 100))}%`} good={(selectedRow?.fidelityPct ?? 100) >= 95} />
        <Stat label="Mode" value={exactLane ? 'Exact' : 'Semantic'} good={exactLane} />
        <Stat label="Safety" value={selectedRow?.safety ?? (exactLane ? 'High' : 'Moderate')} />
      </div>

      <section className="mt-6 rounded-2xl border border-indigo-900/40 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-300">Pareto Frontier — real gpt-tokenizer counts</h2>
            <p className="text-xs text-slate-500">All wired codecs and semantic presets, sorted by real token savings.</p>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] uppercase text-slate-500">
                <th className="pb-2 font-medium">Preset</th>
                <th className="pb-2 font-medium">Mode</th>
                <th className="pb-2 font-medium">Real BPE Tok</th>
                <th className="pb-2 font-medium">Real Savings</th>
                <th className="pb-2 font-medium">Fidelity</th>
                <th className="pb-2 font-medium">Safety</th>
                <th className="pb-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {rows.map((r) => {
                const active = r.key === codec;
                return (
                  <tr key={r.key} className={active ? 'bg-indigo-950/40 text-white' : 'text-slate-300 hover:bg-slate-800/30'}>
                    <td className="py-2 font-sans font-medium">{r.label}{active && <span className="ml-1.5 rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] text-indigo-300 font-mono">Active</span>}</td>
                    <td className="py-2 text-[11px]">{r.exact ? <span className="text-emerald-300 font-sans">Exact</span> : <span className="text-amber-300/90 font-sans">Semantic</span>}</td>
                    <td className="py-2">{r.inTokens} → {r.outTokens}</td>
                    <td className="py-2"><span className={r.savingsPct > 0 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>{r.savingsPct > 0 ? `+${r.savingsPct.toFixed(1)}%` : `${r.savingsPct.toFixed(1)}%`}</span></td>
                    <td className="py-2">{r.fidelityPct}%</td>
                    <td className="py-2 font-sans text-[11px]">{r.safety === 'High' ? '🟢 High' : r.safety === 'Moderate' ? '🟡 Moderate' : '🔴 Low'}</td>
                    <td className="py-2 font-sans">{!active && <button onClick={() => setCodec(r.key as CodecKey)} className="rounded bg-slate-800 px-2 py-1 text-xs text-indigo-300 hover:bg-indigo-600 hover:text-white">Select</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {history.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Recent conversions</h2>
          <ul className="flex flex-col gap-2">
            {history.map((row) => (
              <li key={row.id} className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900/40 p-3 transition hover:border-indigo-700" onClick={() => setInput(row.source)}>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="rounded bg-slate-800 px-2 py-0.5 uppercase">{row.preset}</span>
                  <span className="text-emerald-400">−{row.charDeltaPct}%</span>
                </div>
                <p className="mt-1 truncate font-mono text-sm text-emerald-200">{row.output}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-10 text-center text-xs text-slate-600">All codecs wired to the main input/output boxes · real gpt-tokenizer counts · no hidden activation paths</footer>
    </main>
  );
}
