/**
 * src/lib/omega/registry.ts
 * =============================================================================
 * REAL-BPE AUDIT HARNESS FOR EVERY CODEC SHIPPED IN THIS REPOSITORY
 *
 * The application's own metrics module estimates tokens (estimateTokensBPE /
 * chars-per-4 style heuristics). Both are surfaced here beside the real 
 * tiktoken-equivalent count so the estimation error is visible and quantified.
 *
 * Every run is independently round-trip checked where a decoder exists.
 * Failures are reported, never hidden.
 * =============================================================================
 */

import { PRESETS, type NeuraleseOptions } from '@/lib/neuralese';
import { convertAdvanced, DEFAULT_ADVANCED } from '@/lib/neuralese-advanced';
import { encodeLosslessAscii } from '@/lib/neuralese-lossless';
import { cavemanCompress } from '@/lib/neuralese-caveman';
import { compressDragi } from '@/lib/neuralese-dragi';
import { compressWenyan } from '@/lib/neuralese-wenyan';
import { compressComposite, compressDragiAtScale } from '@/lib/neuralese-composite';
import { compileOrdosTriBand } from '@/lib/neuralese-ordos';
import { encodeAsg } from '@/lib/neuralese-asg';
import { compressAst } from '@/lib/neuralese-ast';
import { compileNoether } from '@/lib/neuralese-noether';
import { compressHolographic } from '@/lib/neuralese-holographic';
import { compressCaveHolo } from '@/lib/neuralese-caveholo';
import { compressIbCaveHolo } from '@/lib/neuralese-ib';

import { countTokens, encodeIds, type EncodingName } from './bpe';
import { omegaXiCompress, omegaXiDecode } from './atom-codec';
import { veritasEncode } from './veritas';
import { quasarEncode } from './quasar';
import { helixEncode } from './helix';
import { meridianEncode } from './meridian';
import { plexusEncode } from './plexus';
import { pulseEncode } from './pulse';
import { anaphoraEncode } from './anaphora';
import { axiomEncode } from './axiom';
import { tesseraEncode } from './tessera';
import { strataEncode } from './strata';
import { signetEncode } from './signet';
import { mosaicEncode } from './mosaic';
import { atlasEncodeCached as atlasEncode } from './atlas';
import { auroraEncodeCached as auroraEncode } from './aurora';
import { crownEncodeCached as crownEncode } from './crown';
import { irisEncode } from './iris';
import { kernelEncode } from './kernel';
import { zenithEncode } from './zenith';
import { eclipseEncode } from './eclipse';
import { rosettaEncode } from './rosetta';
import { harmoniaEncode } from './harmonia';
import { aetherEncode, aetherDecode, aetherDecoderPrompt, AETHER_SYSTEM_PROMPT } from './aether';
import { panaceaEncode, panaceaDecode, panaceaDecoderPrompt, PANACEA_SYSTEM_PROMPT } from './panacea';
import { synapseEncode, synapseDecode, synapseDecoderPrompt, SYNAPSE_SYSTEM_PROMPT } from './synapse';
import { noesisEncode, noesisDecode, noesisDecoderPrompt, NOESIS_SYSTEM_PROMPT } from './noesis';
import { apeironEncode, apeironDecode, apeironDecoderPrompt, APEIRON_SYSTEM_PROMPT } from './apeiron';
import { pantheonEncode, pantheonDecode, pantheonDecoderPrompt, PANTHEON_SYSTEM_PROMPT } from './pantheon';
import { telosEncode, telosDecode, telosDecoderPrompt, TELOS_SYSTEM_PROMPT } from './telos';
import { archeEncode, archeDecode, archeDecoderPrompt, ARCHE_SYSTEM_PROMPT } from './arche';
import { genesisEncode, genesisDecode, genesisDecoderPrompt, GENESIS_SYSTEM_PROMPT } from './genesis';
import { omniEncode, omniDecode, omniDecoderPrompt, OMNI_SYSTEM_PROMPT } from './omni';
import { khorosEncode, khorosDecode, khorosDecoderPrompt, KHOROS_SYSTEM_PROMPT } from './khoros';
import { kairosEncode, kairosDecode, kairosDecoderPrompt, KAIROS_SYSTEM_PROMPT } from './kairos';
import { anankeEncode, anankeDecode, anankeDecoderPrompt } from './ananke';
import { moiraEncode, moiraDecode, moiraDecoderPrompt } from './moira';
import { nemesisEncode, nemesisDecode, nemesisDecoderPrompt } from './nemesis';
import { themisEncode, themisDecode, themisDecoderPrompt } from './themis';
import { dikeEncode } from './dike';
import { eupraxiaEncode } from './eupraxia';
import { metisEncode } from './metis';
import { proteusEncode } from './proteus';
import { logosEncode } from './logos';
import { hermesEncode } from './hermes';
import { chironEncode, KAIROS_WORK_UNITS } from './chiron';
import { tachysEncode } from './tachys';
import { hydraEncode } from './hydra';
import { glossiaEncode } from './glossia';
import { eidosEncode } from './eidos';
import { aionEncode } from './aion';
import { mnemosyneEncode } from './mnemosyne';
import { nyxEncode } from './nyx';
import { echoEncode } from './echo';
import { letheEncode } from './lethe';
import { oracleEncode } from './oracle';
import { stichosEncode, stichosMetatronEncode } from './stichos';
import { periodosEncode } from './periodos';
import { anamnesisEncode } from './anamnesis';
import { ariadneEncode } from './ariadne';
import { sibylEncode } from './sibyl';
import { sequoyahEncode } from './sequoyah';
import { thothEncode } from './thoth';
import { palimpsestEncode } from './palimpsest';
import { daedalusEncode } from './daedalus';
import { grammaEncode } from './gramma';
import { kalligraphosEncode } from './kalligraphos';
import { crasisEncode } from './crasis';
import { anagnorisisEncode } from './anagnorisis';
import { enthymemeEncode } from './enthymeme';
import { epagogeEncode } from './epagoge';
import { elleipsisEncode } from './elleipsis';
import { paradeigmaEncode } from './paradeigma';
import { synartesisEncode } from './synartesis';
import { denEncode } from './dendron';
import { densEncode } from './dendrons';
import { gnomonEncode } from './gnomon';
import { akolouthiaEncode, akolouthiaDecode } from './akolouthia';
import { akolouthia2Encode, akolouthia2Decode } from './akolouthia2';
import { horaEncode, horaDecode } from './hora';
import { hemeraEncode, hemeraDecode } from './hemera';
import { stigmeEncode, stigmeDecode } from './stigme';
import { morpheEncode, morpheDecode } from './morphe';
import { syzeuxisEncode, syzeuxisDecode } from './syzeuxis';
import { lexisEncode, lexisDecode, lexisFold, lexisUnfold } from './lexis';
import { stoichosEncode, stoichosDecode } from './stoichos';
import { psephosEncode, psephosDecode } from './psephos';
import { aetosEncode, aetosDecode } from './aetos';
import { symplokeEncode, symplokeDecode } from './symploke';
import { metathesisEncode, metathesisDecode } from './metathesis';
import { syntomosEncode, syntomosDecode } from './syntomos';
import { synkopeEncode, synkopeDecode } from './synkope';
import { tachosEncode, tachosDecode } from './tachos';
import { heuresisEncode, heuresisDecode } from './heuresis';
import { timemaEncode, timemaDecode } from './timema';
import { oikonomiaEncode, oikonomiaDecode } from './oikonomia';
import { pyknosisEncode, pyknosisDecode } from './pyknosis';
import { syncopeEncode, syncopeDecode } from './syncope';
import { anadiplosisEncode, anadiplosisDecode } from './anadiplosis';
import { euteleiaEncode, euteleiaDecode } from './euteleia';
import { ouraEncode, ouraDecode } from './oura';
import { antistropheEncode, antistropheDecode } from './antistrophe';
import { peritropeEncode, peritropeDecode } from './peritrope';
import { systoleEncode, systoleDecode } from './systole';
import { chironDecode } from './chiron';
import { daedalusDualEncode } from './daedalus-dual';
import { lakonikosEncode } from './lakonikos';
import { lakonikosDualEncode } from './lakonikos-d';
import { tabminEncode } from './tabmin';
import { uuidfoldEncode } from './uuidfold';
import { dirfoldEncode } from './dirfold';
import { dittoEncode } from './ditto';
import { phalanxEncode } from './phalanx';
import { phalanx2Encode } from './phalanx2';
import { phalanx3Encode } from './phalanx3';
import { phalanx4Encode } from './phalanx4';
import { phalanxA1Encode } from './phalanx-a1';
import { phalanxA2Encode } from './phalanx-a2';
import { phalanxA3Encode } from './phalanx-a3';
import { phalanxA4Encode } from './phalanx-a4';
import { phalanxA5Encode } from './phalanx-a5';
import { phalanxA6Encode } from './phalanx-a6';
import { phalanxA7Encode } from './phalanx-a7';
import { phalanxA8Encode } from './phalanx-a8';
import { phalanxA9Encode } from './phalanx-a9';
import { veritasNEncode } from './veritas-n';
import { veritasREncode } from './veritas-r';
import { veritasKEncode } from './veritas-k';
import { veritasMEncode } from './veritas-m';
import { veritasQEncode } from './veritas-q';
import { veritasPEncode } from './veritas-p';
import { phalanxA10Encode } from './phalanx-a10';
import { veritasCEncode } from './veritas-c';
import { veritasUEncode } from './veritas-u';
import { veritasEncodeMulti, withVxLegend, veritasDecodeL } from './veritas-w';
import { amphoraEncode } from './amphora';
import { kanonEncode } from './kanon';
import { icarusEncode } from './icarus';
import { orthosEncode } from './orthos';
import { stentorEncode } from './stentor';
import { abacusEncode } from './abacus';
import { procrustesEncode } from './procrustes';
import { circeEncode } from './circe';
import { chimeraEncode } from './chimera';
import { caesuraEncode } from './caesura';
import { syntagmaEncode } from './syntagma';
import { prosoponEncode } from './prosopon';
import { epistleEncode } from './epistle';
import { arithmosEncode } from './arithmos';
import { kallosEncode } from './kallos';
import { panoptesEncode } from './panoptes';
import { epistemeEncode } from './episteme';
import { metatronEncode } from './metatron';
import { synizesisEncode } from './synizesis';
import { syntomiaEncode } from './syntomia';
import { eustochiaEncode } from './eustochia';
import { akribeiaEncode } from './akribeia';
import { logistikeEncode } from './logistike';
import { polytroposEncode } from './polytropos';
import { kionesEncode } from './kiones';
import { plinthosEncode } from './plinthos';
import { anastropheEncode } from './anastrophe';
import { kappaEncode } from './kappa';
import { phraseEncode } from './phrase';
import { tauEncode } from './tau';
import { valenceEncode } from './valence';
import { astralEncode } from './astral';
import { aeonEncode } from './aeon';
import { phoenixEncode } from './phoenix';
import { valkyrieEncode } from './valkyrie';
import { solarisEncode } from './solaris';
import { hyperionEncode } from './hyperion';
import { polarisEncode } from './polaris';
import { astraeaEncode } from './astraea';
import { chronosEncode } from './chronos';
import { tensorEncode } from './tensor';
import { lumenEncode } from './lumen';
import { hypergraphEncode } from './hypergraph';
import { synergyEncode } from './synergy';
import { kineticEncode } from './kinetic';
import { quantumEncode } from './quantum';
import { nebulaEncode } from './nebula';
import { zeroEncode } from './zero';
import { orionEncode } from './orion';
import { exodusEncode } from './exodus';
import { cadmusEncode } from './cadmus';
export { evaluateAllCodecsDynamically, type SynthesisSummary, type CodecEvaluationRun } from './codec-synthesis';

export type Fidelity = 'exact' | 'lossy' | 'unverified';

export interface CodecRun {
  key: string;
  label: string;
  family: string;
  fidelity: Fidelity;
  output: string;
  outChars: number;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  heuristicSavingsPct: number;
  estimateErrorPts: number;
  exact: boolean | null;
  tokensPerChar: number;
  ms: number;
  error?: string;
  note?: string;
  /** One-chat message cost in o200k tokens (decoder contract + wire, counted once).
   * Codec-reported (r.oneChat); when the output is the input unchanged it is the raw input count;
   * null when the codec reports no message cost (wire-only, inadmissible for ranking). */
  oneChatTokens: number | null;
}

const heuristicTokens = (s: string): number => Math.max(1, Math.round(s.length / 4));

export function makeExactTokenCounter(tokenizer: { name: string; encode: (text: string) => number[] }) {
  return (text: string) => tokenizer.encode(text).length;
}

export function realTokenCounter(enc: EncodingName) {
  return makeExactTokenCounter({
    name: enc,
    encode: (text: string) => encodeIds(text, enc),
  });
}

interface Entry {
  key: string;
  label: string;
  family: string;
  fidelity: Fidelity;
  deep?: boolean;
  run: (text: string, enc: EncodingName) => Promise<{ output: string; decoded?: string | null; note?: string; oneChat?: number }>;
}

function presetEntries(): Entry[] {
  return (Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => ({
    key: `preset_${String(k)}`,
    label: `${PRESETS[k].label}`,
    family: 'neuralese',
    fidelity: 'lossy' as Fidelity,
    run: async (text: string) => {
      const r = convertAdvanced(text, PRESETS[k].options as NeuraleseOptions, DEFAULT_ADVANCED);
      return { output: r.output, decoded: r.roundTrip ?? null };
    },
  }));
}

export function codecEntries(): Entry[] {
  const base: Entry[] = [
    ...presetEntries(),
    {
      key: 'veritasVx',
      label: '⟁ VERITAS-VX',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = veritasEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'exodus',
      label: '🌌 EXODUS-E1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = exodusEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'tensor',
      label: '𔔁 TENSOR-T1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = tensorEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'lumen',
      label: '💡 LUMEN-L1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = lumenEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'hemera', label: '☀ HEMERA (Calendar-day deltas: a date 1–31 days from the previous date is written as ※dN; a same-date ms timestamp as HORA’s ※N; identity unless it pays)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = hemeraEncode(t, enc); const decoded = hemeraDecode(r.wire, r.arm); return { output: r.wire, decoded, oneChat: r.messageTokens, note: `arm=${r.arm}; days=${r.days}; ms=${r.ms}; ${r.notes}` }; },
    },
    {
      key: 'stigme', label: '· ΣΤΙΓΜΗ (Separator elision for tokens whose punctuation the reader recomputes: an ISO date YYYY-MM-DD becomes its 8 digits, THH:MM:SS becomes THHMMSS, and a clock after a date and a space loses its colons; one clause per shape restores them. Every elision is verified by a full restore round trip before it is kept, so a digit run that would be mis-read costs one date, not the whole arm. Wire = the cheapest of LAKONIKOS, LAKONIKOS-D and AKOLOUTHIA-2 on the elided text; identity arm = the cheapest of the three on the original text, so M never exceeds min(LAKONIKOS, LAKONIKOS-D, AKOLOUTHIA-2))', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = stigmeEncode(t, enc); const decoded = stigmeDecode(r.wire, r.clauses, r.sep, r.armTag); return { output: r.wire, decoded, oneChat: r.messageTokens, note: `arm=${r.arm}; clauses=${r.clauses.join('+') || '-'} (${r.clauseTokens} tok); dates=${r.dates}; T-times=${r.times}; after=${r.afters}; dropped=${r.dropped}; wire=${r.armTag}; M=${r.messageTokens} vs identity ${r.identityTokens}` }; },
    },
    {
      key: 'morphe', label: '◈ ΜΟΡΦΗ (Auto-fitted shape-rule layer: instead of three hard-coded clauses, a rule library is fitted to the payload -- decimal precision, dominant timezone offset, integer grouping, URL scheme, UUID dashes, hex colours, XML entities -- and each rule is accepted only if (P1) the payload is uniform under it, (P2) the reader’s rule is total, and (P3) the wire plus clause beats the identity arm. Rule sets are then pruned by backward elimination, because rules interact through the grammar. Wire = cheapest of LAKONIKOS, LAKONIKOS-D, AKOLOUTHIA-2 on the transformed text; identity arm = cheapest on the original.)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = morpheEncode(t, enc); const decoded = morpheDecode(r.wire, { rules: r.rules, sep: r.sep, after: r.after, tag: r.armTag }); return { output: r.wire, decoded, oneChat: r.messageTokens, note: `rules=${r.rules.join('+') || '-'} (${r.clauseTokens} tok); rejected=[${r.rejected.join(',')}]; hits=${JSON.stringify(r.hits)}; wire=${r.armTag}; M=${r.messageTokens} vs identity ${r.identityTokens}` }; },
    },
    {
      key: 'syzeuxis', label: '⋈ ΣΥΖΕΥΞΙΣ (Column-major conjunction: KIONES proved tabular redundancy lives down the columns and MORPHE proved shape rules should fit themselves to the payload, but the two were never combined — KIONES transposes and then runs the pre-MORPHE stack, while MORPHE fits rules in row-major order where a value column is never contiguous. Because MORPHE’s rules carry uniformity preconditions, row-major scope means one stray year vetoes a rule for every value that would have benefited; column-major makes that precondition local. Measured arms: row-morphe, row-eidos, row-aion, col-bare, col-morphe, col-eidos, col-aion; cheapest byte-exact arm wins and every arm is exposed in `armTokens`.)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = syzeuxisEncode(t, enc); const decoded = syzeuxisDecode(r.wire, { arm: r.arm, rules: r.rules, sep: r.sep, after: r.after, tag: r.tag }); return { output: r.wire, decoded, oneChat: r.messageTokens, note: `arm=${r.arm}; rules=[${r.rules.join('+')}]; transpose=${r.transpose.applied ? r.transpose.rows + 'x' + r.transpose.cols : 'no'}; arms=${JSON.stringify(r.armTokens)}; M=${r.messageTokens} vs identity ${r.inTokens}` }; },
    },
    {
      key: 'lexis', label: 'λεξις ΛΕΞΙΣ (Junction refolding: English orthography contains derivable junctions — after a sentence mark in { . , ; : } the next thing is essentially always one space and a new word, so that space carries almost no information and can be deleted, then restored by a stated rule. What makes this a codec rather than a trick is the derivable/danger partition: any occurrence of a sentence mark immediately followed by a non-space character with NO space is NOT derivable, and would be corrupted by the inverse rule, so the encoder detects those and rewrites them with an adaptive single-token sentinel chosen per text from a pool of marks that do not occur in the wire. The fold is tried in BOTH composition orders — outside the parent (fold the parent’s wire) and inside it (fold the text, then let the parent encode) — because folding changes token boundaries and can therefore help or hurt the parent’s span discovery; the same lesson SYZEUXIS taught about row-major vs column-major. Ships only when the round trip is byte exact AND the measured message strictly beats the parent alone.)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => {
        const cut = (r: any) => { const dp: string = r.decoderPrompt; return { wire: String(r.wire), contract: dp.slice(String(r.wire).length + 1) }; };
        const parents = [
          { name: 'identity', run: (x: string) => ({ wire: x, contract: 'Print the text exactly as given.' }), undo: (w: string) => w },
          { name: 'lakonikos', run: (x: string) => cut(lakonikosEncode(x, enc)), undo: (w: string) => chironDecode(w) },
          { name: 'daedalus', run: (x: string) => cut(daedalusEncode(x, enc)), undo: (w: string) => chironDecode(w) },
          { name: 'polytropos', run: (x: string) => cut(polytroposEncode(x, enc)), undo: (w: string) => chironDecode(w) },
        ];
        const r = lexisEncode(t, enc, parents as any);
        const decoded = lexisDecode(r.wire, r.decodeConfig);
        return { output: r.wire, decoded, oneChat: r.messageTokens, note: `parent=${r.parent}; order=${r.order}; folds=${r.folds}; dangers=${r.dangers}; sentinels=[${r.sentinels.join('')}]; M=${r.messageTokens} vs identity ${r.inTokens}; ${r.notes}` };
      },
    },
    {
      key: 'stoichos', label: 'στοιχεῖον ΣΤΟΙΧΟΣ (Derivable-character elimination, generalized from one rule to a searched rule family. LEXIS established one instance — after a sentence mark in { . , ; : } the next thing is essentially always exactly one space, so that space is derivable and can be deleted then restored by a stated rule. STOICHOS keeps that instance and adds the two structural junctions that carry hybrid prose: after a line-initial run of # * + - > (markdown headings, bullets, email quoting), and after a line-initial number plus . or ) (numbered lists). The contribution is the search, not the list: every junction site is either derivable (a space is present, delete it) or danger (no space is present, and the inverse rule would INSERT one that was never there — J. L., / 3.14 / file.ts / #include), and each mark has its own folds-versus-dangers economics, so the two folds are tried separately in both composition orders and the cheaper one ships. Mark dangers are neutralised by REPLACING the mark with a per-mark sentinel, so they cost nothing; structural dangers have no single character to replace and pay one token.)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => {
        const cut = (r: any) => { const dp: string = r.decoderPrompt; return { wire: String(r.wire), contract: dp.slice(String(r.wire).length + 1) }; };
        const parents = [
          { name: 'identity', run: (x: string) => ({ wire: x, contract: 'Print the text exactly as given.' }), undo: (w: string) => w },
          { name: 'lakonikos', run: (x: string) => cut(lakonikosEncode(x, enc)), undo: (w: string) => chironDecode(w) },
          { name: 'daedalus', run: (x: string) => cut(daedalusEncode(x, enc)), undo: (w: string) => chironDecode(w) },
          { name: 'polytropos', run: (x: string) => cut(polytroposEncode(x, enc)), undo: (w: string) => chironDecode(w) },
        ];
        const r = stoichosEncode(t, enc, parents as any);
        const decoded = stoichosDecode(r.wire, r.decodeConfig);
        return { output: r.wire, decoded, oneChat: r.messageTokens, note: `parent=${r.parent}; order=${r.order}; kind=${r.decodeConfig.kind}; folds=${r.folds}; dangers=${r.dangers}; sentinel=${r.sentinel ?? 'none'}; M=${r.messageTokens} vs identity ${r.inTokens}; ${r.notes}` };
      },
    },
    {
      key: 'psephos', label: 'ψῆφος PSEPHOS (Digit-lattice collapse. A BPE tokenizer charges a separate token for the punctuation that lives INSIDE a number, and that punctuation is a pure function of the digits — so it is derivable in exactly the sense LEXIS established for the space after a sentence mark, but worth far more per site because the space LEXIS deletes is usually absorbed into the following word token whereas an intra-number hyphen or colon is a token of its own. Measured on o200k_base: "2026-08-14" costs 6 tokens and "20260814" costs 3; "00:02:05" costs 5 and "000205" costs 2. Two formats ship, chosen because their inverse is a FUNCTION: date8 (YYYY-MM-DD to 8 digits) and time6 (HH:MM:SS to 6 digits). Deliberately excluded as not invertible: thousands separators ("18442" cannot be told from a collapsed "18,442"), dotted quads and semver (a collapsed run cannot be re-split). The contribution is the ambiguity guard, not the two formats. Collapsing is only valid if the reader can distinguish a collapsed number from one that was always bare, and three failure modes are checked mechanically at encode time: MERGE (a candidate whose neighbour is a digit would fuse into a longer run and lose its identifying width, so it is skipped), COLLIDE (the text already contains a bare run of the same width — the fractional part of "77.44539475" is exactly 8 digits — resolved by picking the cheaper of two modes, ESCAPE which marks the few bare runs with a trailing sentinel or MARK which marks the collapsed numbers with a leading sentinel, each sentinel costing one token), and SENTINEL LEAK (the sentinel, or a sentinel-plus-run pair, already occurs where the decoder would read it, resolved by walking a sentinel pool and verifying each candidate; if none is safe the format is skipped entirely rather than risking corruption). Like LEXIS the fold is tried in BOTH composition orders, and the ordering here is forced by measurement: collapsing BEFORE the parent lets the grammar of the parent see collapsed digits and destroys rules it would otherwise have spent tape on, while collapsing AFTER the parent is nearly free of material because the grammar has already replaced the dates with glyphs — collapsing before POLYTROPOS recovered 185 tokens on sp500-200.csv where collapsing after recovered 0. Ships only when the full decode is byte exact.)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => {
        const cut = (r: any) => { const dp: string = r.decoderPrompt; return { wire: String(r.wire), contract: dp.slice(String(r.wire).length + 1) }; };
        const parents = [
          { name: 'identity', run: (x: string) => ({ wire: x, contract: 'Print the text exactly as given.' }), undo: (w: string) => w },
          { name: 'lakonikos', run: (x: string) => cut(lakonikosEncode(x, enc)), undo: (w: string) => chironDecode(w) },
          { name: 'daedalus', run: (x: string) => cut(daedalusEncode(x, enc)), undo: (w: string) => chironDecode(w) },
          { name: 'polytropos', run: (x: string) => cut(polytroposEncode(x, enc)), undo: (w: string) => chironDecode(w) },
        ];
        const r = psephosEncode(t, enc, parents as any);
        const decoded = psephosDecode(r.wire, r.decodeConfig);
        return { output: r.wire, decoded, oneChat: r.messageTokens, note: `parent=${r.parent}; collapsed=${r.stats.totalCollapsed}; bare=${r.stats.totalBare}; modes=[${r.stats.formats.map((f: any) => f.name + ':' + f.mode + (f.sentinel || '')).join(' ')}]; M=${r.messageTokens} vs identity ${r.inTokens}; ${r.notes}` };
      },
    },
    {
      key: 'aetos', label: 'ἀετός AETOS (Learned separator lattice — PSEPHOS generalized from two hard-coded formats to a shape set read off the document. PSEPHOS proved the law: a BPE tokenizer charges a separate token for punctuation living INSIDE a number, even though that punctuation is a pure function of the digits once the format is known ("2026-08-14" 6 tokens vs "20260814" 3; "1.2.3" 5 vs "123" 2). But PSEPHOS shipped exactly two formats, date8 and time6, chosen by hand, and explicitly excluded thousands separators, dotted quads and semver as not invertible. AETOS replaces the hand choice with a LATTICE. Fixed tier: the four timestamp shapes that recur across engineering text (YYYY-MM-DD, HH:MM:SS, ISO-T datetime, space-separated datetime). Learned tier: every shape of the form "k digit groups joined by one separator", for k in 2..5 and separator in { . , : - / _ space }. A learned shape is admitted only if EVERY match in the document has the SAME digit-group width vector. Constant width is exactly the condition under which the inverse is statable in one clause ("expand 4 digits to d.dd.d"); a document mixing 1.2.3 with 10.20.30 has no fixed-width inverse and is rejected. That single predicate converts PSEPHOS two hand-picked exceptions into a general rule, and it is why AETOS can collapse dotted quads and semver safely where PSEPHOS could not. A fourth invariant, WIDTH-UNIQ, joins PSEPHOS three: two enabled shapes may never share a digit width or the decoder cannot tell which template to apply, so the best-scoring shape per width survives. PSEPHOS other guards carry over unchanged and are re-verified on every emitted wire — MERGE (a candidate touching a digit outside itself would fuse and lose its width), COLLIDE (a bare run of the same width already exists; resolved by the cheaper of ESCAPE and MARK with a sentinel, and the shape is DISABLED if no sentinel is safe), SENTINEL LEAK. The second change is that the shape subset is chosen by a GREEDY SEARCH scored on the real objective, countTokens(wire) + countTokens(contract), rather than being a constant: a shape saving three tokens is a net loss if it is the only reason the "Numbers: expand ..." sentence exists, and with a learned shape set that trade-off can no longer be decided once at design time. Both composition orders are tried against all four parents. Ships only when the full decode is byte exact.)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => {
        const r2 = aetosEncode(t, enc);
        const decoded2 = aetosDecode(r2.wire, { stats: r2.stats, order: r2.order, undo: r2.parent === 'identity' ? (w: string) => w : chironDecode });
        return { output: r2.wire, decoded: decoded2, oneChat: r2.messageTokens, note: `parent=${r2.parent}; order=${r2.order}; shapes=[${r2.shapes.join(' ')}]; collapsed=${r2.stats.totalCollapsed}; bare=${r2.stats.totalBare}; M=${r2.messageTokens} vs identity ${r2.inTokens}; ${r2.notes}` };
      },
    },
    {
      key: 'symploke', label: 'συμπλοκή SYMPLOKE (Braided contract — X26. Every codec in this stack paid for each new rule with a WHOLE NEW SENTENCE. AETOS shipped a grammar sentence plus a "Numbers: expand N digits to P." sentence plus one more per sentinel, and each of those sentences re-paid the same fixed toll: a capital, a subject, a verb, a period. Meanwhile X26 closed the wire-side search space entirely — an unbounded phrase-grammar oracle LOSES to POLYTROPOS on all four prose lanes, a 25s/60s/150s budget returns the identical wire, token-level RePair loses by 26-75 tokens/lane, character-level RePair selects zero rules, line permutation gains at most 16 tokens against a 17-401 token permutation cost, second-level grammar merging gains exactly 0 on all 26 lanes, and tape reordering is worth 1-2 tokens because the boundary tax is already negative. So the only surface left was the one place every codec had been overpaying without measuring: the contract. SYMPLOKE\'s observation is that the parent sentence already establishes everything a second sentence needs — the ¶ landmark, the direction of reading, the verb "expand", the output discipline — so every further rule is braided into it as a CONJUNCT and pays only its marginal words. Measured on o200k_base against the 25-token parent clause: a shorter-but-complete base wording is -5, inlining the digit rule instead of appending it is -2, inlining the sentinel rule is -5. A lane shipping both digit shapes and a sentinel saves 10 tokens; EVERY lane saves at least 5, because the base wording alone is shorter. That generality is the point — contract cost is a fixed tax paid by every message, so it is the one lever that pays on prose, where every wire-side mechanism measured this turn returned exactly zero. The cost model is the same greedy search as AETOS, scored on countTokens(wire) + countTokens(contract), but with the empty shape set as the incumbent so it can never regress, and with the contract actually emitted re-derived per trial rather than inherited from the parent. Three correctness guards were forced by measurement. (1) EVERY shape must restate its own width; an early draft let later shapes ride on the first one\'s verb and produced "8 digits become YYYY-MM-DD, dd:dd" — 2 tokens cheaper and silently undecodable, because the reader is never told that FOUR digits become dd:dd. The TypeScript round trip could not see this, since symplokeUncollapse reads its shape table from stats rather than from the contract; only the independent from-spec decoder in bench/x26/selfdecode.py, which is handed nothing but the message, catches it, and it now rejects any conjunct with leftover tokens. (2) No tape means no grammar sentence: with the identity parent the wire carries no glyph tape, and emitting the 19-token grammar clause anyway turned git-log-fuller from a 143-token passthrough into a 162-token regression. (3) Nesting is detected, not assumed — if no rule\'s expansion references an earlier glyph the contract says "expand" rather than "expand repeatedly", saving one more token; when undetectable it over-claims recursion, since an extra pass over a flat tape is a no-op while under-claiming corrupts a nested one. All six load-bearing facts are still stated: names, tape position, entry delimiter, expansion scope, recursion, output.)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => {
        const r3 = symplokeEncode(t, enc);
        const decoded3 = symplokeDecode(r3.wire, { stats: r3.stats, order: r3.order, undo: r3.parent === 'identity' ? (w: string) => w : chironDecode });
        return { output: r3.wire, decoded: decoded3, oneChat: r3.messageTokens, note: `parent=${r3.parent}; order=${r3.order}; shapes=[${r3.shapes.join(' ')}]; wire=${r3.messageTokens - (r3.contract ? 1 : 0)}; contract=${r3.contract.length ? r3.contract : '(none)'}` };
      },
    },
    {
      key: 'metathesis', label: 'μετάθεσις METATHESIS (Glyph-alphabet relayout — X27. Every prior codec in this stack priced a glyph at a flat ~0.801 tokens per body occurrence. That figure is the MEAN OF A BIMODAL DISTRIBUTION, and the bimodality is the entire opportunity this codec exploits. Measured on the real wire: a run of three adjacent glyphs costs ONE token, a run of two costs ONE token, and a single glyph costs ONE token. A run of k adjacent glyphs costs about what one glyph costs, because o200k_base carries vocabulary entries for word-like sequences inside a script. So the real unit of cost is the RUN, not the glyph. Which pool character stands for which phrase decides which glyphs end up adjacent, and therefore how many runs the tokenizer can swallow. METATHESIS changes nothing else: it adds, removes and alters no rule, it changes only the bijection from rules to pool characters, and it does so AFTER the wire is final, scoring the real emitted wire with the real tokenizer. This is provably semantics-preserving: for any injective map A from the parent glyphs to distinct same-script characters absent from the payload, the relabelled wire parses to exactly the rules A(g) -> A(raw) and expansion commutes with A, so decode(relabel(w)) equals decode(w) for EVERY such A. Correctness is therefore independent of the search, and a search bug can only cost tokens, never corrupt a message. Empirically the X26 independent from-spec decoder runs against these wires UNCHANGED, which is the observable form of that lemma. The magnitude is large: on kb-article the parent assignment gives 612, the best of 300 random permutations gives 665, and a contiguous prefix of the pool gives 682, so the assignment itself is worth 53 to 77 tokens. The parent already captures most of that; what remains is found by a move class the parent inner loop does not use, namely PAIRWISE SWAPS, because once every good character is taken the only improving move is an EXCHANGE between two rules. A reassign-to-free-character search cannot express that and measures 0 on readme. The gain scales with rule count: openstack -18, git-numstat -13, find-listing -8, dump.sql -6, but only -1 on kb-article and 0 on readme. I report that distribution rather than averaging it away, because this is an ops-leaning gain and not the prose gain the mandate prefers. Two properties are load-bearing. First, DETERMINISM: the repo freezes now() at 0 under det mode because non-deterministic deadlines once produced different wires for the same input, so a wall-clock budget can never fire here; the search is bounded by a count of tokenizer EVALUATIONS instead, and restart randomness comes from a seeded mulberry32 PRNG keyed on the wire rather than Math.random. Three consecutive runs are byte-identical. Second, NO REGRESSION: if the search finds nothing better than the parent wire it returns that wire unchanged, so the codec is monotone against SYMPLOKE by construction. The contract is carried through untouched, because the braided SYMPLOKE contract names no glyph.)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => {
        const r4 = metathesisEncode(t, enc);
        const decoded4 = metathesisDecode(r4.wire, { stats: r4.stats, order: r4.order, undo: r4.parent === 'identity' ? (w: string) => w : chironDecode });
        return { output: r4.wire, decoded: decoded4, oneChat: r4.messageTokens, note: `parent=${r4.parent}; order=${r4.order}; rules=${r4.rules}; wire ${r4.parentWireTokens}->${r4.wireTokens} (search ${r4.searchMs}ms); shapes=[${r4.shapes.join(' ')}]` };
      },
    },
    {
      key: 'syntomos', label: 'σύντομος SYNTOMOS (Feature-matched minimal instruction — X28. Every codec in this stack ships one fixed English contract, and on 20 of the 28 holdout lanes that contract is a constant 20 tokens: 12 percent of a short message and 3 percent of a long one. X28 measured every other lever and found it exhausted, which is what forced the attention onto the overhead. The coverage probe enumerated every repeated substring of kb-article and found ZERO with positive net profit. The relayout search was given 50 times the evaluation budget and returned a byte-identical wire. Tape-side factoring found zero profitable shared substrings. Reverting any single substituted occurrence never helped. Composing repeated glyph sequences found zero candidates. So the remaining slack is not in the dictionary at all, it is in the instruction, and the instruction is not a constant: it is a function of which features a given wire actually needs. SYNTOMOS therefore ships a LADDER of contract heads and selects the cheapest that covers the features present. The load-bearing feature is REPEAT. Expansion must be iterated to a fixed point if and only if some tape rule references another rule, and that is exactly detectable by counting glyph characters inside rule bodies, so SYNTOMOS detects it and drops the clause when it is absent. It also runs a DE-NESTING arm that flattens the tape when flattening costs no more than it retires, which turns a fixed-point expansion into a single pass; that is worth having independently of tokens, because transformers are known to degrade under deep in-context recursion. The head is spliced as a strict PREFIX REWRITE in front of the parent contract, never a reconstruction. An earlier draft re-synthesised the shape clause with a regex and silently DELETED the entire digit rule from dump.sql while still reporting a 28 token gain; the TypeScript round trip could not see it because the uncollapser reads its shape table from stats rather than from the contract text. Only the independent from-spec decoder, which is handed nothing but the message, catches that class of bug, and it is the reason the prefix rewrite is now the only permitted transformation. If the parent wording ever changes the code fails safe and keeps the parent contract intact. Result: a flat 3 tokens better than METATHESIS on every lane that has a tape, byte-exact, and monotone against METATHESIS by construction because the parent arm is always retained as a candidate in the tournament. Decode is unchanged SYMPLOKE, so no new syntax is introduced.)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => {
        const r5 = syntomosEncode(t, enc);
        const decoded5 = syntomosDecode(r5.wire, { stats: r5.stats, order: r5.order, undo: r5.parent === 'identity' ? (w: string) => w : chironDecode });
        return { output: r5.wire, decoded: decoded5, oneChat: r5.messageTokens, note: `parent=${r5.parent}; rung=${r5.rung}; nested=${r5.nested}; denested=${r5.denested}; rules=${r5.rules}; msg ${r5.altMessageTokens}->${r5.messageTokens}` };
      },
    },
    {
      key: 'synkope', label: 'συγκοπή SYNKOPE (Overhead is the binding term, and the shape clause is the only part of it the tokenizer charges for — X29. X29 opened by attacking the one-token barrier five separate ways and every one of them came back empty: inter-glyph gap rules found 135 distinct gaps with a single repeat and a best delta of plus 2; injecting candidate rules scored against the true tokenizer found zero improving candidates on any lane; format-native references that lean on pretraining gravity, the Makefile and LaTeX idea, cost plus 1.00 token for every wrapper and blow a 3-glyph run up from about 1.75 tokens to 6.00; glyph-script choice turned out to be driven by pool size rather than by script, since Hebrew only wins because it has 22 characters and not 212; and glyph reassignment hill-climbing over 2862 swaps bought exactly 1 token. The wire is therefore exhausted and the only term left is the contract, which is paid once per message and decides whether a short message can be compressed at all. That is not a figure of speech: with the contract removed a naive extractor gets git-log-fuller from 143 to 130 and meeting-transcript from 472 to 385, which beats the full stack, and with the contract restored every one of those gains is eaten and the lane reverts to identity. The fixed cost is the binding constraint, not the grammar. The obvious move is then to shorten the instruction, and that is where the second negative lives: seven different contract heads measured against the four real tails the parent emits all cost the same number of tokens, because BPE merges put the instruct wording on a flat plateau. Rephrasing buys nothing. The one place that is NOT on that plateau is the shape clause, since it is the only stretch built from low-frequency material such as digit templates and the sentinel rule, and compressing it is worth 2 tokens on dump.sql. A cheaper 8-token variant exists and is deliberately NOT shipped, because it drops the fact that only caret-marked digit runs are reformatted, which is precisely the bug class that made X28 forbid re-synthesising the clause. SYNKOPE therefore applies literal substring rewrites one at a time, keeps each only if it strictly lowers the whole message, and fails safe by skipping any rung whose target text is absent. Decode is unchanged SYMPLOKE and the wire is byte-identical to SYNTOMOS, so the change is monotone against SYNTOMOS by construction and introduces no new syntax.)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => {
        const r6 = synkopeEncode(t, enc);
        const decoded6 = synkopeDecode(r6.wire, { stats: r6.stats, order: r6.order, undo: r6.parent === 'identity' ? (w: string) => w : chironDecode });
        return { output: r6.wire, decoded: decoded6, oneChat: r6.messageTokens, note: `parent=${r6.parent}; rungs=[${r6.rungs.join(' ')}]; rules=${r6.rules}; contract ${r6.parentContractTokens}->${r6.messageTokens - r6.wireTokens} tok; msg ${r6.metathesisMessageTokens}->${r6.messageTokens}` };
      },
    },
    {
      key: 'tachos', label: 'τάχος TACHOS (Speed is the missing metric, and the fixed-cost threshold fallacy is the missing selection rule — X30. Two independent contributions. FIRST, speed. Instrumenting the tokenizer on a 3.4 KB prose encode showed 2,240,610 countTokens calls of which 2,190,308 were for strings under 24 characters and therefore took the early return that bypasses the chunk cache entirely; those short calls were 14.8 s of a 28.8 s encode, and only 98,806 of them were distinct, so the fast path was 95.5 percent redundant work. An exact memo keyed by the full string plus the encoding, which can only change timing and never a number, takes countTokens from 18.9 s to 5.6 s and the whole encode from 25.6 s to 13.8 s with a byte-identical message. A 25 second encode is not usable in everyday work and a 14 second one is merely slow, so this is the part of X30 that is a large win for a real user. SECOND, selection. The contract is a fixed tax of about 17 tokens paid once per message no matter how many rules the tape holds, so a greedy that tests each candidate against the current total demands that the FIRST rule alone retire the whole tax, and if the best single rule saves 5 tokens while five rules would save 25 it rejects rule one and never reaches the rest. This is measured, not hypothetical: on two fresh out-of-sample prose samples the priced greedy accepts zero rules and ships identity at 100 percent retention, while the same search with the tax waived finds 10 and 8 rules and 15 to 19 tokens of real redundancy. TACHOS therefore runs a second arm under a different objective, accepting any rule whose marginal wire gain is positive and only pricing the finished message at the end, and keeps whichever message is shortest. The arm is built from raw text with its own flat shape-free contract, because the parent contract describes the parent digit-shaped wire and borrowing it would state digit rules that do not apply, which is the same failure class as the X28 shape-clause deletion. Identity and the parent are both retained as candidates so TACHOS is monotone against SYNKOPE by construction. Verified byte-exact on all 12 fresh prose samples and it converts the two zero-compression lanes from no compression to some, which is the honest size of the win: the compression is small and the speed is the headline.)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => {
        const r7 = tachosEncode(t, enc);
        const decoded7 = tachosDecode(r7.wire, { stats: r7.stats, order: r7.order, undo: r7.parent === 'identity' ? (w: string) => w : chironDecode });
        return { output: r7.wire, decoded: decoded7, oneChat: r7.messageTokens, note: `parent=${r7.parent}; winner=${r7.winner}; rules=${r7.rules}; bootstrapRules=${r7.bootstrapRules}; arms=${r7.arms.map(a => a.id + ':' + a.tokens).join(' ')}` };
      },
    },
    {
      key: 'heuresis', label: 'εὕρεσις HEURESIS (Discovery — X31. A search-budget codec, and the only X31 lever out of five that survived. SYNTOMOS builds its glyph alphabet by merging character pairs, and any set of disjoint merge pairs can be realised by many different pair-to-glyph assignments; the assignment is not cosmetic because it decides which substrings become glyph strings and therefore the whole tape. renderBest cannot try them all, so it ranks scripts by merge-edge count and keeps the top scriptTries, and sibyl.ts hardcodes that budget at 3, 2 and 3 across its three call sites — a constant nobody had ever tuned. Widening it is safe by construction because those sites keep a running best across the candidates they do try, so a wider budget cannot lose a candidate already found, only add one. The obvious prior is that the budget is irrelevant because edge count is a good proxy; measured, the gain does saturate almost immediately, with tries 3, 4, 6, 8, 12 and 16 giving identical wires on most lanes — but saturation is not zero, and on some lanes the densest scripts are the wrong ones. Eleven lanes measured, all byte-exact: find-listing 1281 to 1272, readme 655 to 652, prose-01 745 to 743, and eight lanes unchanged. Three improved, none regressed. Critically, higher is NOT better: at tries=8 ls-full-iso goes 373 to 374, because extra renders eat the shared search budget and starve the rule search downstream, so the script gain is more than cancelled. tries=4 is the measured saturation point, where the script search is complete but has not yet started to crowd out its neighbours. Cost is 5 to 25 percent more encode time on a search that already runs for tens of seconds. Four other levers were measured and rejected this turn and are recorded as negative space: memoizing the glyph-assignment evaluation, which is 27 to 70 percent of encode but whose true hit rate is only 0.6 to 2.5 percent so the memo is pure overhead and was reverted; raising the time budget to 20 s or 60 s, which changes nothing; widening the word and phrase rule grids, which reproduce the default exactly; and ungating the X30 bootstrap arm, which never wins outside its gate and costs 20 to 50 percent runtime. Greedy: no — it widens the candidate set of an existing greedy search rather than replacing the objective. Honest size of the win: small on tokens and concentrated on ops lanes, but free, general, regression-free and it costs the user nothing to adopt.)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => {
        const r8 = heuresisEncode(t, enc);
        const decoded8 = heuresisDecode(r8.wire, { stats: r8.stats, order: r8.order, undo: r8.parent === 'identity' ? (w: string) => w : chironDecode });
        return { output: r8.wire, decoded: decoded8, oneChat: r8.messageTokens, note: `parent=${r8.parent}; winner=${r8.winner}; scriptTries=${r8.scriptTries}; rules=${r8.rules}; arms=${r8.arms.map(a => a.id + ':' + a.tokens).join(' ')}` };
      },
    },
    {
      key: 'timema', label: 'τίμημα TIMEMA (The price paid — X32. The contract is a token string and every prior turn priced it in English prose; this codec reprices it in notation. X29 measured seven rewordings of the contract head against the four real SYMPLOKE tails and found a flat plateau at 17 tokens for all of them, concluding that paraphrasing the head buys nothing because BPE merges put the instruct wording on a plateau. That result is real but it is a plateau of ENGLISH: all seven candidates were grammatical sentences, and a sentence needs a subject, a verb and an object to say what three characters can say. The head carries exactly one fact, that the item before the delimiter is a key and the item after it is its value, and notation says that as k=v, which is a single BPE token because it occurs constantly in source code, config files and URLs. So the move is not paraphrase but a change of register, prose to notation, and it is the one direction off the plateau X29 did not sample: 17 tokens becomes 12, and a second rung on the output clause, print result only to print only, takes it to 11. DECODABILITY IS VERIFIED, NOT ASSUMED. X28 left the compact rung disabled with the note that no live model could be run from the sandbox to check a reader still locates the glossary, and X32 ran the reader: a 192-token ops log was encoded to a 13-rule wire and the resulting message was then decoded by hand from the message text alone, reproducing the source byte for byte, recovering exactly the rule set the encoder installed. Measured on ten lanes across prose, ops, tables, SQL, CSV and non-English text: minus 6 tokens on ten of ten, zero regressions, every wire byte-exact, and no change to encode time. The lower fixed tax also moves the compression threshold for short prose from roughly 2000 characters down to roughly 1500. Three further levers were measured and rejected: repricing the rule-search tax, where the search pays a 38 to 40 token CHIRON prompt while the shipped SYNTOMOS contract costs 17, and correcting that gap in EITHER direction makes things worse, because the conservative tax acts as a regularizer that prefers fewer higher-value rules; notation for the digit shape clauses, worth 6 tokens on dump.sql but refused because X29 established that this clause is exactly where dropping a fact silently corrupts the bytes; and rule pruning, where dropping the 22 single-token phrase rules makes prose-01 sixteen tokens worse. Greedy: no, the rungs are kept only when they strictly lower the whole message, and the final arm choice remains an exact minimum over scored candidates. Time and CPU bound: yes, this codec costs zero extra search, it rewrites a string that already exists. Honest size: 6 tokens per message is small, but it is universal, free and regression-free, and it retires the last fixed cost that every prior turn had treated as a constant of nature.)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => {
        const r9 = timemaEncode(t, enc);
        const decoded9 = timemaDecode(r9.wire, { stats: r9.stats, order: r9.order, undo: r9.parent === 'identity' ? (w: string) => w : chironDecode });
        return { output: r9.wire, decoded: decoded9, oneChat: r9.messageTokens, note: `parent=${r9.parent}; winner=${r9.winner}; rules=${r9.rules}; contractRungs=[${r9.contractRungs.join(',')}]; contract ${r9.parentContractTokens}->${r9.messageTokens - r9.wireTokens} tok` };
      },
    },
    {
      key: 'oikonomia', label: 'οἰκονομία OIKONOMIA (The allocation — X33. Prior turns optimised what the wire says and treated the cost of finding it as somebody else\'s problem; this codec makes the cost the object. Three measurements came first. A CPU profile of a single prose encode showed countTokens at 32 percent of runtime, and instrumenting it showed why: 65,364 calls on strings of 24 characters or more, averaging 1,738 characters each, pushing 113 million characters through a pretokenise regex on a 3,370-character input, of which only 3,312 distinct strings — 94.9 percent redundant. X30 had memoised the short-string side of the same split and never measured the long side, because by call count the long side is three orders of magnitude smaller and therefore invisible. Second, syntomosEncode called metathesisEncode with no options object, and metathesis called symploke with none, so budgetMs, maxEvals, restarts, wordGrid and capGrid had been passed by callers since X28 into a void; the X28 and X31 budget nulls and the X32 grid null were measured with a knob wired to nothing. Re-run with a knob that reaches the code, the search budget is confirmed slack — sibyl at 300 ms and at 12,000 ms give identical output — but the configuration count is load-bearing and was never the thing under test. Third, and largest: timing SYMPLOKE\'s parents shows polytropos running four times on prose-01, 18.5 seconds of a 22.3 second encode, 83 percent of the total, where a reader of the code would expect one. The cause is the \'in\' shape order, which collapses shapes before the grammar runs and therefore owes a full parent re-run to every trial: the trials hand the parent genuinely different inputs, so they cannot be cached. X24 fixed that trial cap at 4 and nobody measured it. Measured across 33 lanes, capping at 1 trial is 2.09 times faster overall and loses 52 tokens out of 24,726, and the five lanes that lose are exactly the five lanes where \'in\' wins — a perfect correlation in both directions, which says the only question worth asking is whether to buy \'in\' trials at all. Prediction was tried and failed: the total shape-collapse count does not separate the classes, since find-listing collapses 240 items and needs \'in\' while aapl-2014.csv collapses 240 items and must not have it. So instead of predicting, OIKONOMIA buys one trial at a time and purchases the next only when the previous one paid, which is the right shape here because the trials are greedy and ranked by hit frequency: if the most frequent shape in the document will not pay for its own parent run, the rarer ones are being asked to pay the same price for less. One trial already reaches the four-trial answer on six of the eight lanes where the question arises, and the gate stays open on dump.sql, whose first trial does improve, all the way to 662. On the 33-lane measurement OIKONOMIA matches TIMEMA\'s tokens on 28 lanes and trails it by 2 to 24 on five, while running 2 to 4 times faster; it is pareto superior on time and equal-or-slightly-worse on tokens, and it says so rather than hiding the five. Decodability is unchanged and needs no new argument: the wire, glossary, tape and contract come from the same code paths as TIMEMA\'s, and any wire OIKONOMIA emits is a wire TIMEMA could have emitted — only the number of times the encoder is willing to re-run its own search differs. Greedy: no, every trial is scored against the real objective and kept only when it strictly lowers the whole message, and the final arm choice is still an exact minimum over scored candidates. Time and CPU bound: yes, bounding encoder effort is the entire content of this codec. Honest size: this is a speed win, not a compression win, and a user who needs the last 24 tokens on dump.sql should use TIMEMA.)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => {
        const r = oikonomiaEncode(t, enc);
        const decoded = oikonomiaDecode(r.wire, { stats: r.stats, order: r.order, undo: r.parent === 'identity' ? (w: string) => w : chironDecode });
        return { output: r.wire, decoded, oneChat: r.messageTokens, note: `parent=${r.parent}; winner=${r.winner}; rules=${r.rules}; inCap=${r.inCap}; inGate=${r.inGate}; contractRungs=[${r.contractRungs.join(',')}]` };
      },
    },
    {
      key: 'pyknosis',
      label: 'πύκνωσις PYKNOSIS (The condensation — X34. Every codec before this one compressed the same resource: the fact that some span of the text occurs more than once. This one compresses a different resource, and it is the one thing left once the repetition is gone — the decoder tokenizer charges different prices for different characters, and that price list can be arbitraged. Two measurements opened it. Splitting a full-stack wire shows the tape running at 2.20 to 2.50 characters per token against roughly 4.3 for English prose, and re-encoding the tape gains exactly nothing: 648 to 648, 509 to 509, 1511 to 1511. The residual repeat coverage is 0.0 percent on openstack and 0.4 percent on git-numstat, down from 76.3 and 61.5 in the raw text, so the dictionary has extracted every drop of exact repetition there is and the remaining 2.2 to 2.5 is the price of the alphabet, not of the search. Scanning for spans below 3.0 characters per token locates the badly priced material: hexadecimal payloads at 1.68 on openstack and 2.02 on dump.sql, versus nothing at all in kb-article or prose. o200k_base spends its long tokens on common English fragments and charges about one token per character for anything else, and random hex is the anything else at 1.740. The same random information spelled with the sixteen most mergeable letters is cheaper, because those are exactly the letters BPE has long tokens for: 2.201 on random hex and 2.40 on corpus hex, a 21 to 28 percent saving with nothing lost and nothing guessed, since a fixed sixteen-character substitution is information-preserving. The wire is shorter only because the vocabulary charges less for letters it knows. This is orthogonal to the other codecs because it works on content with zero repetition, which is precisely the content no dictionary rule can ever fire on twice. The alphabet was selected by hill-climbing over all 26-letter assignments, scored two ways that disagree — random hex prefers keaoinstrldcumzp at 2.460, real corpus hex prefers nothing stable — and settled by end to end measurement, where etaoinsrhldcumyp wins both lanes, minus 54 on dump.sql and minus 17 on openstack against minus 52 and minus 14. The lesson generalises: an alphabet that makes the run shortest is not always the alphabet that makes the message shortest. Two conditions are verified per run at encode time, never assumed. The run must be self-delimiting, and a closing delimiter would cost about one token per run, 176 tokens against a 398 token saving at 88 runs, so instead the encoder verifies that every run it re-spells is followed by a character outside the target alphabet — measured, all 88 on openstack are, including space times 62 and slash times 15, and all 26 on dump.sql are a quote — so consuming letters until a non-letter is exactly the true end. The marker must not occur in the source, so a free one is chosen from a candidate list. Both conditions reject the run and fall back to the parent untouched. The obvious refinement, re-spelling only the runs that individually pay, was measured and is wrong: dump.sql is minus 44 uniform and plus 37 selective, because selective remapping leaves the document half in one alphabet and half in another and destroys the regularity the grammar search depends on, so a uniformly re-spelled document lets the search find better rules and the whole is worth more than the sum of its parts. The per-run estimate is therefore used only as a weak gate to skip the second encode on documents with no hex at all, and the real decision is a measured end to end comparison that never ships a regression. Digit-only runs are explicitly not re-spelled, because bare digits already tokenize at 2.16 to 2.80, at or above what the letter alphabet achieves, and remapping them loses 49 tokens on find-listing and 164 on vix-daily. Measured end to end against OIKONOMIA on the full lane set, PYKNOSIS is minus 54 on dump.sql and minus 17 on openstack with every lane byte exact, and it is a no-op everywhere else at the cost of one regex scan. Greedy: no, the transform is accepted only when the measured full message is strictly smaller than the parent is, and the alphabet was searched against the real objective. Time and CPU bound: yes, the cheap gate bounds the second encode to documents carrying at least 150 re-spellable characters. Honest size: this pays on documents that carry hexadecimal payloads and does nothing on prose and digit-only tables, and it says so rather than claiming a general win.)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = pyknosisEncode(t, enc);
        const decoded = pyknosisDecode(r.wire, { stats: r.stats, order: r.order, undo: r.parent === 'identity' ? (w: string) => w : chironDecode }, { alphabet: r.alphabet, marker: r.marker });
        return { output: r.wire, decoded, oneChat: r.messageTokens, note: `parent=${r.parent}; winner=${r.winner}; rules=${r.rules}; pyknosis=${r.pyknosis}; hexRuns=${r.hexRuns}; hexChars=${r.hexChars}; est=${r.estimatedSaving}` };
      },
    },
    {
      key: 'syncope',
      label: 'συγκοπή SYNCOPE (The cutting short — X35. PYKNOSIS established that the decoder tokenizer can be arbitraged by re-spelling hexadecimal into the sixteen most mergeable letters, but it deliberately preserves the punctuation inside a run, because in general the encoder cannot know whether a dash belongs to the identifier or to the surrounding text. SYNCOPE measures what that caution costs and reclaims it where the caution is unnecessary. On the 36 request UUIDs of openstack-loghub-26.log, bench/x35/syn3.ts prices the same 32 hex digits two ways: 663 tokens with the dashes kept and 546 with them removed, a 117 token saving. The dashes cost twice over. Directly, each one is its own pretoken under the o200k pretokenizer, four tokens per identifier. Indirectly and worse, they fragment the re-spelled run, so instead of one 32-letter run that BPE can merge across, the encoder faces five runs of 8, 4, 4, 4 and 12 letters, and short runs merge badly. A dash inside a hexadecimal identifier is not information but format: the 8-4-4-4-12 grouping is fixed by convention, so the 32 payload characters determine the four dash positions exactly, and restoring them is a positional operation the reader performs by counting, with no base conversion and no carries. The obvious generalisation, eliding separators from any dashed token, is wrong, and the census in bench/x35/syn2.ts shows why. Scanning every lane for dashes inside hex-like runs, only openstack scores genuinely hexadecimal: 36 UUIDs contain at least one of a-f, while every date in dump.sql, find-listing and vix-daily-1990.csv and every page range in bibliography.txt scores zero. Those separators are not elidable, because TIMEMA and the shape system already compress dates far better than any re-spelling could and deleting their dashes would destroy that, so the transform requires a real hex letter before it will touch a run. That restriction is what keeps it honest rather than benchmaxxed: the rule is not dashes are free on this corpus, it is dashes inside a hexadecimal identifier carry no information, which is true of UUIDs, trace ids and content hashes in text this encoder has never seen. Disambiguation is by a dedicated second marker rather than by payload length, because the obvious length rule fails in practice — openstack carries 32-character request UUIDs alongside 32-character un-separated tenant ids, and a reader could not tell them apart — so elided payloads get their own marker and the reader never has to count to decide. Soundness mirrors PYKNOSIS: the marker must be absent from the source, and every elided payload must be followed by a character outside the target alphabet so that consuming letters until a non-letter lands exactly on the true end. The gate is the same honest measured one, the full message is encoded both ways and the shorter ships, so if the grammar reacts badly to the shortened runs the wire is byte-identical to the parent. Measured end to end, SYNCOPE takes openstack from 945 under OIKONOMIA and 928 under PYKNOSIS to 898, which is minus 47 against the pre-X34 frontier and minus 30 against PYKNOSIS, byte exact, while remaining a no-op on every other lane including dump.sql where PYKNOSIS still delivers its minus 54. Greedy: no, the shape is chosen by maximising measured saving over all candidate groupings and the transform is accepted only when the measured full message is strictly smaller. Time and CPU bound: yes, the transform runs after the cheap PYKNOSIS character gate, so the extra scan is bounded to documents that already carry at least 150 re-spellable characters. Honest size: this fires only on documents carrying grouped hexadecimal identifiers and does nothing on prose, dates or digit-only tables, and it says so.)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = syncopeEncode(t, enc);
        const decoded = syncopeDecode(r.wire, { stats: r.stats, order: r.order, undo: r.parent === 'identity' ? (w: string) => w : chironDecode }, { alphabet: r.alphabet, marker: r.marker, marker2: r.marker2, group: r.syncopeGroup });
        return { output: r.wire, decoded, oneChat: r.messageTokens, note: `parent=${r.parent}; winner=${r.winner}; rules=${r.rules}; pyknosis=${r.pyknosis}; syncope=${r.syncope}; syncopeRuns=${r.syncopeRuns}; syncopeSeps=${r.syncopeSeps}` };
      },
    },
    {
      key: 'anadiplosis',
      label: 'ἀναδίπλωσις ANADIPLOSIS (The doubling back — X36. Every dictionary codec in this stack compresses the same resource, that some span of the text occurs more than once, and all of them are indifferent to WHERE the second occurrence sits. That indifference is their strength and also what they pay for: every rule must be defined in a glossary before it can be used, and the definition is charged against the saving. This codec compresses the resource the dictionary is worst at, a span that repeats immediately, because such a span needs no glossary entry at all, only a count. Where the dictionary writes a definition plus four uses, this writes ⟦4⇤17.240000,⟧ — one copy of the unit and a count of three characters. The mechanism is run-length coding applied at the span level rather than the character level, which is what makes it pay on text where no single character ever repeats. The measurement: scanning every lane for runs of identical adjacent fields finds 126 runs and 2520 characters on vix-daily-1990.csv and nothing anywhere else, and generalising the scan from fields to any adjacent repeated span and measuring end to end gives 1195 to 579 on vix, a 51.6 percent cut, and 940 to 925 on npm-ls, with every other lane unmoved. Orthogonality is arithmetic, not assertion: with u the token cost of the unit and k the number of adjacent copies, a dictionary rule replaces k times u tokens with u plus k, while a run-length span replaces them with u plus a small framing cost, so the two are equal at k equal to the framing cost plus one, and for any unit worth naming the run-length form wins whenever the copy is short-lived — a phrase that appears four times in a row and never again is exactly the case where a glossary entry is pure overhead. The dictionary pays a definition to buy reuse, and here there is no reuse to buy. This is confirmed by the parent, which has already run its full dictionary search, leaving the four copies of the price field standing in the tape: it is not that the search failed to notice them, it is that noticing them through a glossary is the wrong instrument. One implementation detail carries real weight and is recorded because it produced a genuine failure: the first version wrote the count after the unit and round-tripped on toy input, then blew up on real text with RangeError Invalid string length, because in a numeric corpus the digits of the count run into the digits that follow and the parser reads 12345 where 12 was meant. The shipped form puts the count first and the unit last, so the parser reads a bounded digit run to the first separator and then takes everything to the closing bracket as the unit, and the encoder guarantees no unit can contain a framing character by always slicing from the original text rather than from a string it has already rewritten. Selection is likewise the product of a measured failure: the first rule accepted any span whose elision exceeded six characters, which is a character-space estimate of a token-space cost, and it accepted two-character units that cost more to frame than they saved, giving plus 73 on dump.sql, plus 35 on find-listing and plus 24 on npm-ls. Scoring in tokens instead, and refusing any unit that costs a single token, turns all three to exactly zero while keeping the npm-ls gain. Decodability: the transform sits under the dictionary like the PYKNOSIS re-spelling and the SYNCOPE separator elision, so the wire is expanded first and the spans are undone last as a flat textual operation, and the entire obligation of the reader is one sentence appended to the contract — bracket N separator X bracket means X written N times. Expanding a span is a copy with a stated count, no arithmetic and no alphabet table. Greedy: no, spans are scored against the true objective, chosen greedily by best gain among non-overlapping candidates, and the whole transform is accepted only when the measured full message is strictly smaller than the parent is. Time and CPU bound: yes, the period is capped at 64 characters, the document at 60000, and the span count at 4096, so the scan is bounded work per character. Honest size: two of twenty measured lanes move, and the large one is a file whose OPEN, HIGH, LOW and CLOSE columns are identical on every row — a property of that synthetic export rather than of financial data generally, which is why the sibling lane aapl-2014.csv with genuinely distinct values is untouched. The mechanism is general and npm-ls shows it firing on ordinary material, but the headline number on vix should not be read as a claim about real market data. No lane regresses.)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = anadiplosisEncode(t, enc);
        const decoded = anadiplosisDecode(r.wire, { stats: r.stats, order: r.order, undo: r.parent === 'identity' ? (w: string) => w : chironDecode }, { alphabet: r.alphabet, marker: r.marker, marker2: r.marker2, group: r.syncopeGroup, framing: r.framing });
        return { output: r.wire, decoded, oneChat: r.messageTokens, note: `parent=${r.parent}; winner=${r.winner}; rules=${r.rules}; pyknosis=${r.pyknosis}; syncope=${r.syncope}; anadiplosis=${r.anadiplosis}; spans=${r.anadiplosisSpans}; chars=${r.anadiplosisChars}` };
      },
    },
    {
      key: 'euteleia',
      label: 'εὐτέλεια EUTELEIA (The cheapness — X37. Every codec in this stack injects symbols into the wire that carry no information from the source, and every one of them was chosen once, at authoring time, by a COLLISION argument: pick something that cannot occur in real text so the reader can never mistake it for payload. That argument is sound and it is about safety, but the symbols were then priced as though choosing them were free, and they are not. The decoder tokenizer is byte-level BPE, so a code point that never earned a merge falls back to its raw UTF-8 bytes and costs roughly one token per byte. Measured on o200k_base in this repository, ASCII framing (N~X) costs 3.0 tokens, [N~X] costs 3.3, {N~X} costs 3.8, and the X36 choice ⟦N⇤X⟧ costs 8.8, because ⟦ ⟧ and ⇤ are three bytes each with no merges. The rarity that buys the collision guarantee is exactly the property the tokenizer charges for, and the two were never compared. EUTELEIA replaces convention with measurement in two places. The framing auction tries every collision-free framing, tokenizes the wire each one actually produces, and keeps the cheapest, so safety is preserved exactly and only the price changes. The clause auction observes that the contract clause is spliced in front of a sentence that already exists, so its price is the price of the junction and not of the clause alone; measured, the X36 clause is 10 tokens and an equivalent wording is 7, and every wording is scored by measuring the exact contract string it produces. Both auctions are gated on the real full message, so this codec can never be worse than ANADIPLOSIS, of which it is a strict superset: ANADIPLOSIS is EUTELEIA with the auctions disabled. Measured on vix-daily-1990.csv, the lane that carries 126 run-length spans, the message falls from 594 tokens under ANADIPLOSIS to 579, minus 12 from the framing auction and minus 3 from the clause auction, with the wire byte-exact and every other lane unmoved; encode time is unchanged or better, 165 seconds against roughly 200 for the parent alone, because only the winning framing is carried through the dictionary search. The obvious generalisation, repricing every control symbol in the stack, was run and is a null result, recorded here so nobody reruns it: substituting cheaper candidates for the tape markers section sign and pilcrow across ten lanes gives 0 on eight of them and 1 token on two, because those two characters are already single tokens in o200k_base and were chosen well, and substituting each tape glyph for sixty unused pool glyphs leaves the whole-wire token count invariant, so the one-token-per-glyph claim holds and there is nothing to win by reassigning them. The overcharge was real but local to genuinely rare multi-byte symbols, and the shipped stack contained exactly one. The byte-fallback floor this exploits is standard and documented in the Hugging Face tokenizer summary and named the encoding floor by arXiv 2610.01984 (October 2026), which measures underrepresented spans sitting at three tokens per character even at 64K vocabulary; the application, that a lossless encoder must auction its own control symbols against that floor rather than choose them by a collision argument, is original to this repository. Greedy: no, every framing is scored on the real wire it produces and every clause on the real contract it produces, and the transform ships only when the measured message is strictly smaller. Time and CPU bound: yes, the framing auction costs one extra scan plus one token count per candidate and only the winner is carried through the expensive dictionary search. Honest size: a small, universal, regression-free reduction on the lanes where ANADIPLOSIS fires and exactly zero everywhere else; it does not move prose and does not claim to.)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = euteleiaEncode(t, enc);
        const decoded = euteleiaDecode(r.wire, { stats: r.stats, order: r.order, undo: r.parent === 'identity' ? (w: string) => w : chironDecode }, { alphabet: r.alphabet, marker: r.marker, marker2: r.marker2, group: r.syncopeGroup, framing: r.framing });
        return { output: r.wire, decoded, oneChat: r.messageTokens, note: `parent=${r.parent}; winner=${r.winner}; rules=${r.rules}; pyknosis=${r.pyknosis}; syncope=${r.syncope}; anadiplosis=${r.anadiplosis}; euteleia=${r.euteleia}; framing=${(r.framing||[]).join('')}; clauses=${r.euteleiaFramings}; spans=${r.anadiplosisSpans}; chars=${r.anadiplosisChars}` };
      },
    },
    {
      key: 'oura',
      label: 'οὐρά OURA (The tail — X38. Every numeric shape in this stack, the four fixed ones and the whole learned lattice, rests on one hypothesis: that the digit groups of a pattern have a CONSTANT width vector. SYMPLOKE scans for digit groups joined by a separator and rejects the shape outright the moment two matches disagree on any width. That rejection is what makes the collapse self-identifying, because a collapse is recognised by the length of its digit run, and a constant vector makes the collapsed length a constant, so a run of exactly eight digits is a date needs no per-run marker. The hypothesis is also false for a large and completely ordinary family of real numbers. A semantic version has three groups whose widths vary: 1.0.0, 22.1.1, 0.35.4, 4.1.17. Two of the three groups are one digit in some matches and not in others, so every shape is rejected and every dot is paid for at full price. The same is true of fixed-precision decimals with a varying integer part, of times carrying fractional seconds, and of any field where the trailing precision is fixed by convention and only the head grows. What is constant in all of them is not the vector but the TAIL. OURA relaxes the hypothesis from the whole width vector is constant to the width vector excluding the first group is constant, and pays for the relaxation by reading from the right: collapse 1.0.0 to 100, restore by taking the last one digit, then the last one digit before it, then everything that remains, and joining with a dot. Splitting from the tail is exact and total, because the suffix widths consume a fixed number of digits from the right, so whatever survives at the left is the head whatever its length; there is no carry, no base conversion and no arithmetic, and the reader counts characters off the right-hand end, which is the easiest direction to count in precisely because the suffix is fixed. The relaxation has a price. A constant-width collapse is recognised by length and needs no marker; a tail-anchored one has a variable collapsed length, so length alone no longer identifies it. OURA closes the ambiguity two ways and measures both: MARK puts a sentinel immediately before each collapsed run, costing one token per run, and PLAIN ships no marker and instead proves that no digit run anywhere outside the collapsed spans is long enough to be mistaken for one. Two guards keep the layer below safe: a candidate is only considered where the constant-width learner has already refused, so if the head width is constant SYMPLOKE owns the pattern and OURA keeps its hands off and the two never claim the same span; and no match may overlap a fixed-tier shape, which would otherwise be cut in half. Soundness is checked before anything is measured, the rewrite must be exactly invertible on its own, and the whole transform ships only when the measured full message is strictly smaller than the parent. Greedy: no, every candidate shape and both modes are scored on the real token count of the message they produce. Time and CPU bound: yes, the scan is linear per separator and k over seven separators and k in two to five, the same order as the lattice it extends, and only the winning shape is applied. Honest size: this fires only on documents carrying numeric fields whose trailing precision is fixed while the leading part varies, version strings above all, then fixed-precision decimals and sub-second times, and it does nothing on prose, on dates, or on uniform-width numeric tables, all of which SYMPLOKE already owns, and it says so rather than pretending otherwise.)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = ouraEncode(t, enc);
        const decoded = ouraDecode(r.wire, { stats: r.stats, order: r.order, undo: r.parent === 'identity' ? (w: string) => w : chironDecode }, { alphabet: r.alphabet, marker: r.marker, marker2: r.marker2, group: r.syncopeGroup, framing: r.framing, ouraShape: r.ouraShape, ouraMode: r.ouraMode, ouraSentinel: r.ouraSentinel });
        return { output: r.wire, decoded, oneChat: r.messageTokens, note: `parent=${r.parent}; winner=${r.winner}; rules=${r.rules}; anadiplosis=${r.anadiplosis}; euteleia=${r.euteleia}; oura=${r.oura}; mode=${r.oura ? r.ouraMode : '-'}; matches=${r.ouraMatches}; seps=${r.ouraSeps}` };
      },
    },
    {
      key: 'antistrophe',
      label: 'ἀντιστροφή ANTISTROPHE (The turning back — X39. Every codec in this stack harvests REDUNDANCY: a dictionary amortises a glossary entry over many occurrences, a run-length rule amortises a count over many repeats, a shape rule amortises a clause over many matches. All of them share one precondition, that the thing compressed must occur more than once, because the only way to pay for a rule is to reuse it. X38 measured what that leaves behind: on four prose lanes the wire body is 74 to 88 percent distinct words, 254 of 319 word types on kb-article occur exactly once, and not one hapax is within a single-character edit of any word occurring three or more times. That mass is unreachable by every mechanism above. But occurring once is not the same as costing what it must. Measured on o200k_base, the path src/omega/anadiplosis.ts costs 8 tokens and the same path with the slashes written as spaces costs 7; bench/holdout-ops/git-numstat.txt costs 10 and the spaced form costs 9. Same information, same length, a bijection of one another, and one is consistently cheaper by roughly one token per separator. The reason is not compression, it is the MERGE TABLE: byte-level BPE learned a merge for a space followed by an ordinary word, because that is the commonest bigram shape in English, and it never learned one for a slash followed by an ordinary word, because paths are a small fraction of English text. A space therefore merges forward into the next token and disappears, while a slash stands alone and is charged for. A slash is a structural character in the document and a rare one in the training distribution, so every path pays a token per segment boundary plus a token for the slash. That is tokenization waste, orthogonal to redundancy, invisible to a dictionary because the path occurs once so no glossary entry can ever pay for itself. ANTISTROPHE exchanges two characters of the source before the stack sees it and asks the reader to exchange them back afterwards: the wire is the stack applied to the swapped text, and the original is the swap applied to the stack inverse of the wire. A swap is an involution and a bijection on the character set, so it is exactly invertible with no sentinel and no absence requirement. That is what makes it usable where substitution is not: mapping a frequent delimiter onto a character absent from the document is also unambiguous, but it loses on every lane, because the rarity that guarantees the decoder can tell the two apart is the same rarity that stops BPE having learned any merge for it, and git-numstat pays plus 370 tokens for the absent-target substitution that the swap delivers at minus 408. The pair is not chosen by intuition; every pair in a structure-preserving pool is applied, the resulting text is tokenized, and the cheapest wins, and it ships only when the measured full message including the clause is strictly smaller than the parents. It is a strict superset of OURA, which is ANTISTROPHE with the auction disabled. The unconstrained search finds much larger numbers and two whole classes are refused: swapping with newline prices at minus 503 on git-numstat and is the best pair on most lanes, but it destroys line structure and therefore every downstream structural codec, and it makes the tape unreadable, costing the reader the language prior it needs to place the glossary glyphs; and swapping a digit for punctuation prices at minus 442 on vix and turns every number into garbage. Both are lossless and both are refused, because the binding constraint is that a bare language model decodes the message from a single chat box, so the pool is punctuation, symbols, space and tab, whose exchange leaves every word, every number and every line break exactly where it was. The winning pair on every lane that fires is space and slash, and the cheapest clause that emits the characters literally is four tokens, Then swap blank and slash, in which one of the two characters to exchange is an invisible space; a reader looking at a single chat message cannot see the character it is being asked to swap, so that wording is refused and the space is NAMED instead, Then swap space and slash, at five tokens. A saving the reader cannot act on is not a saving. Measured, all byte-exact against an independent reference decoder in the same process: git-numstat falls from 1992 to 1923, find-listing from 1279 to 1242, ls-full-iso from 367 to 366, and every other lane is unmoved. The clause is scored as the junction it creates rather than as a standalone sentence, EUTELEIA lesson, and costs four tokens: expand repeatedly; then swap underscore and slash; print only. External context including the part that cuts against this: repricing a serialization for a tokenizer is a known move, TOON claims 30 to 60 percent fewer tokens than JSON and arXiv 2603.03306 benchmarks it, but a 9,649-experiment study by Damon McMillan across 11 models and four formats in February 2026 found TOON costing 38 percent MORE tokens at the schemas tested with no statistically significant effect of format on aggregate accuracy, chi-squared 2.45 and p equal to 0.484, attributed to the tokenizer merge tables and model fluency, so format-level savings measured on fixed datasets are exactly the kind of result that reverses under distribution shift; the distinction is that ANTISTROPHE holds no fixed opinion about which serialization is cheaper and ships nothing when the measurement says no. A second caution is specific to the mechanism: R-BPE, EMNLP 2025, observes that BPE produces non-deterministic and thus impractical behavior with arbitrary token substitutions, which is a fair description of what this relies on and is why every decision here measures the tokenized result instead of predicting it. Related work on the same substrate: arXiv 2608.00582 on the merge-ordering problem and ill-tokenization, arXiv 2504.00178 measuring Renyi efficiency falling 9 percent from train to held-out corpora, arXiv 2608.02376 on frequency-ordering BPE ids, and arXiv 2608.00837 on pruned BPE. Greedy: no, every pair is scored on the real token count of the text it produces and every clause on the real contract it splices into, and the transform ships only when the measured full message is strictly smaller. Time and CPU bound: yes, the auction costs one tokenization per candidate pair, measured at 2 seconds on the 46 kilobyte git-numstat lane, and only the winning pair is carried through the stack, though note the auction doubles or triples encode time on lanes it fires on and adds pressure to the stacks per-encoding memo caches, so a multi-lane sweep must be chunked across processes. Honest size: a real 3.5 percent reduction on git-numstat and 2.9 percent on find-listing, one token on ls-full-iso, and exactly zero on the other fourteen lanes; it does not move prose and says so. Decodability was checked by hand: the first six lines of the ls-full-iso message were decoded from the message text alone, with no system prompt and no tools, and reproduce the source byte for byte, identical md5.)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = antistropheEncode(t, enc);
        const decoded = antistropheDecode(r.wire, { stats: r.stats, order: r.order, undo: r.parent === 'identity' ? (w: string) => w : chironDecode }, { alphabet: r.alphabet, marker: r.marker, marker2: r.marker2, group: r.syncopeGroup, framing: r.framing, ouraShape: r.ouraShape, ouraMode: r.ouraMode, ouraSentinel: r.ouraSentinel, antistrophePair: r.antistrophePair });
        return { output: r.wire, decoded, oneChat: r.messageTokens, note: `parent=${r.parent}; antistrophe=${r.antistrophe}; pair=${r.antistrophePair ? r.antistrophePair.join('') : '-'}; gain=${r.antistropheGain}; pairs=${r.antistrophePairs}` };
      },
    },
    {
      key: 'peritrope',
      label: 'περιτροπή PERITROPE (The turning round — X40. ANTISTROPHE asks what two characters are worth if you exchange them, and answers one pair at a time. The next question is whether a second pair is worth anything once the first is applied, and X40 measured that before building anything: on git-numstat the first exchange prices at minus 408, the second at minus 421 and the third at minus 425, and on pom.xml at minus 18, then minus 32, then minus 33, where the third exchange alone beats the first two combined. Returns are not diminishing, so stopping at one pair leaves most of the mechanism unharvested. The generalisation is not to run the auction twice, because two exchanges collide: swapping space with slash and then slash with dot sends the spaces to the dots, and the reader must then know the order. PERITROPE therefore searches over SETS of pairwise-disjoint exchanges, where no character appears in more than one pair. Disjointness restores what a single swap had for free, that the order of application does not matter, so the reader is handed a list rather than a program. X40 measured what the constraint costs: on twelve of eighteen lanes the best disjoint set scores identically to the best unconstrained one, and the only lane where disjointness really binds is find-listing, minus 181 against minus 264. That is the whole price of a clause a reader can execute without a stack. The search can be neither greedy nor exhaustive. Not exhaustive, because the pool of punctuation, symbols, space and tab is 33 characters, so even at depth three there are 5,984 ordered triples and each costs one tokenization of the whole document. Not greedy, because the best first pair is not the best first move: the beam keeps eight partial permutations per depth, expands each to its ten cheapest extensions, re-ranks, and keeps the best eight, and on find-listing that reaches minus 238 where taking the single best pair and then the best remaining one reaches minus 181. The depth is not chosen by encoding every prefix, which would cost a full stack encode per candidate, but by adding the measured raw delta at each depth to the measured clause cost and shipping the minimum, since a pair that saves three tokens raw may cost two to state. One implementation detail is worth recording because it was a bug that cost most of the gain: the pool was originally filtered by a minimum count of twenty inherited from ANTISTROPHE, and on the same beam that turns git-numstat from two pairs at minus 421 into one pair at minus 408, and npm-ls from five pairs at minus 229 into one pair at minus 11. A character that occurs eleven times can still be the expensive half of a very cheap pair, so the filter is now presence plus a cap on pool size. Two further mechanisms were refuted and are worth naming. The first is delta encoding: the longest monotone run of integers in any of these documents is between four and seven values, seven on dump.sql and five on openstack, and the gain is zero on every lane, so there is nothing to delta. The second is the assumption that an exchange has a cost you can look up: it does not, because a swap changes the neighbouring bigrams of every other character, so the only honest price is the tokenized text itself. What shipped is a strict superset of ANTISTROPHE. It runs the same single-pair auction to establish the parent, then layers the beam on top, disables the inner single-pair pass so that it owns the whole permutation and the exchanges it ships are disjoint by construction, and ships only when the measured full message including the clause is strictly smaller than ANTISTROPHE on the same stack. Measured, all byte-exact against an independent reference decoder in the same process: find-listing falls from 1242 to 1218 with the two exchanges space hyphen and dot slash, and git-numstat from 1923 to 1906 with slash space and hyphen paren. Note the honest gap between probe and codec: three more lanes price well in isolation, pom.xml at minus 30, chart.svg at minus 36 and ls-full-iso at minus 36, and none survives the stack, because the clause and the interaction with the parent grammar eat the raw delta. That is roughly 1.9 percent on each of the two lanes that move, and zero on the other sixteen measured so far. The mechanism has a substantial external literature running in the opposite direction, and it is the closest thing to prior art I have found for this whole family. SilverSpeak, arXiv 2406.11239, reports that substituting just 10 percent of characters with homoglyphs causes 70 percent of resulting tokens to differ in the OpenAI BPE tokenizer, because BPE is trained on natural text and a Cyrillic а where an a belongs has no learned merge and fragments to byte level; arXiv 2508.14070, over 2,800 attack instances and seven models, finds cross-script homoglyph substitution the most effective technique at 58.7 percent guardrail bypass, ranging from 10 percent on GPT-OSS 20B to 92 percent on Mistral 7B. A 2026 replication at paultendo.github.io across 130 API calls, eight attack types, four models and three document types found that GPT-5.2 and Claude Sonnet 4.6 correctly interpreted every substitution in every run, with zero meaning flips and zero clause omissions even at 57 percent of characters replaced, while that same 57 percent took a 95-line contract from 881 tokens to 4,567, a factor of 5.2. Their summary is exact: the comprehension attack fails and the billing attack succeeds. arXiv 2610.03110 finds homoglyph substitution evading a RoBERTa detector in 41 percent of cases, and arXiv 2604.10271 finds a word-level replacement rate near 37.5 percent sufficient to break authorship verification. Read as evidence about my own mechanism this cuts two ways, and both are load-bearing. In its favour, it is the strongest independent confirmation available that swapping characters is transparent to a frontier reader while being extremely expensive to the tokenizer, which is the entire premise ANTISTROPHE and PERITROPE rest on. Against it, homoglyph work substitutes TOWARD rare multi-byte characters to inflate, and PERITROPE substitutes toward cheap ones to deflate, and both are riding the same cliff edge; the only difference is that PERITROPE never ships a direction it has not measured on the actual document, whereas a fixed format convention like TOON does, and McMillan measured that class of claim reversing to 38 percent MORE tokens across 11 models and 9,649 experiments in February 2026 with no accuracy effect at all, chi-squared 2.45 and p 0.484. There is also a hard deployment caveat that the same literature supplies: a preprocessing layer that maps confusables back to their Latin skeletons before tokenization neutralises the inflation to a baseline of 1.0x. Any pipeline that normalises confusables at ingest would undo this transform. Here the exchange is applied by the encoder and read by the model rather than passed through a sanitizer, so it does not apply, but it is a real boundary and not a theoretical one. Adjacent work on the same substrate, none of which this stack can use: arXiv 2601.13260 surveys tokenizer design and concludes that retokenization, vocabulary expansion and merge refinement are offline interventions that typically repay their cost with shorter sequences; arXiv 2512.03989, EACL 2026, shows continued BPE training beating naive extension by up to 9.6 percent tokenization efficiency on average with 72.9 to 100 percent of 70 languages improving, and leaf-based pruning removing up to 62.5 percent of vocabulary tokens, 80,000 of 128,000, without noticeable downstream deterioration; TokEval, arXiv 2608.18062 at COLM 2026, proposes evaluation metrics beyond fertility and compression rate. Every one of those requires changing the tokenizer, and this stack cannot, because the decoder is whatever language model the reader pastes the message into and its tokenizer is frozen. PERITROPE is that same offline intervention achieved by rewriting the text instead of the tokenizer. On the mathematics side, and returning to the proofs called out in earlier turns with the status now tracked further. The Jacobian conjecture counterexample, announced 19 to 20 July 2026 by Levent Alpoge crediting Claude Fable 5 with the question from Akhil Mathew, is a 216-character polynomial map in three variables whose Jacobian determinant is identically minus 2 and which sends the three rational points (0,0,-1/4), (1,-3/2,13/2) and (-1,3/2,13/2) to the same image, so the conjecture is false in every dimension at least three while the two-dimensional case stays open. The verification is now unusually well layered and is worth separating: the algebra is a few lines anyone can check in a CAS and was checked within a day; Paul Lezeau formalized it in Lean the same day as pull request 4474 to Google DeepMind Formal Conjectures, whose CI passed in 1 hour 39 minutes and which is approved but still unmerged as of the sources I read; Zenodo 21514514 by Pablo Nogueira Grossi is a second, independently written Lean 4 formalization that builds 3,003 of 3,003 jobs with zero sorry, and it deliberately re-derives the determinant with MvPolynomial.pderiv over the rationals and direct substitution at the three witness points rather than reusing the projective-coordinate reduction to a binary cubic, which is the right kind of independence; and the Isabelle/HOL entry Jacobian_Counterexample in the Archive of Formal Proofs is now a third verification in a different proof assistant, additionally proving that the formal Jacobian entries are the complex analytic partial derivatives and not merely formal ones. Tao published a geometric reconstruction on 21 July, and arXiv 2608.00222 records Gallagher giving a uniform one-variable construction for every degree at least three the next day, with Speyer following on 23 July. Still missing is what matters most and arrives last: no peer-reviewed paper, Tao himself tracking it as pending peer review rather than verified, and Wikipedia noting that how the counterexample was found has not been revealed. Alpoge has since announced a counterexample to the Caratheodory conjecture on 19 August 2026 and, four days later, a positive answer to the Hopf problem on a complex structure on the six-sphere. The Navier-Stokes claim is the instructive contrast. OpenAI announced on 8 September 2026 that about 10,000 agents produced a 166-page analytic proof plus a Lean formalization that an initially smooth fluid at rest develops a finite-time singularity, establishing Fefferman alternatives C and D, after an 88-hour run begun on 1 September with a further 17 hours for Lean via GPT-6 Astra, at 4.9 million messages and roughly 300 billion output tokens overall and 2.7 million messages and 130 billion tokens on this problem alone. But Tristan Buckmaster and Alpoge posted a related result about twelve hours earlier and allege OpenAI pursued the problem after becoming aware of their method, which OpenAI denies and which now has a Wikipedia page on the priority controversy; Clay said on 11 September that the problem has apparently been settled while stressing a deliberately unhurried process, and lists the status as active rather than solved, with OpenAI saying it will not claim the million dollars. Several sources I read report that there is still no preprint, no arXiv number and no public Lean repository from OpenAI, that the repository review status is self-assessed, and that nobody outside OpenAI has seen the proof. The inversion is the most useful thing found this turn: a 166-page artifact nobody outside has read is being graded as a solved Millennium Problem, while a 216-character counterexample anyone can verify in a CAS in a minute is graded as pending peer review. That is an argument about verification economics rather than about AI, namely that a checkable artifact is cheap to trust and slow to certify while an uncheckable one is expensive to trust and quick to announce, and it is why every result in this repository is required to be byte-exact against an independent reference decoder in the same process. The best-verified of the three remains the Erdos unit-distance disproof, OpenAI on 20 May 2026, where nine outside mathematicians including Noga Alon, Avrim Blum, Timothy Gowers and Melanie Wood published a verified and SIMPLIFIED version as arXiv 2605.20695, still a preprint but a human-written companion rather than a self-assessment. And the calibration number I would carry into every future claim in this space is the one from Google DeepMind in January 2026: of 700 open Erdos problems surveyed, 13 were addressed, of which 5 were seemingly new solutions and 8 were already solved in the literature. Eight rediscoveries out of thirteen. Greedy: no, every candidate pair is scored on the real token count of the text it produces, the beam keeps eight competing partial permutations so that a locally best pair cannot lock out a better set, the depth is chosen by measured raw delta plus measured clause cost, and the transform ships only when the full message including the clause is strictly smaller than the parent. Time and CPU bound: yes, the beam costs one tokenization per candidate pair per node, bounded by 22 pool characters times 8 beam states times 10 extensions times 5 depths, measured at 165 seconds for find-listing and 305 seconds for git-numstat, roughly double the ANTISTROPHE cost, with the pool cap and the pair budget as the hard stops. Honest size: 24 tokens on find-listing and 17 on git-numstat, about 1.9 percent each, and zero on the sixteen other lanes measured, and it still does not move prose — X40 tested that directly by widening the pool to twenty-seven typographic Unicode characters including curly apostrophes, em dashes and ellipses, on the theory that published English earns merges for them that plain-text documents never use, and the wider pool improved exactly zero of the eighteen lanes, so the typographic-substitution route to prose is refuted as well.)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = peritropeEncode(t, enc);
        const decoded = peritropeDecode(r.wire, { stats: r.stats, order: r.order, undo: r.parent === 'identity' ? (w: string) => w : chironDecode }, { alphabet: r.alphabet, marker: r.marker, marker2: r.marker2, group: r.syncopeGroup, framing: r.framing, ouraShape: r.ouraShape, ouraMode: r.ouraMode, ouraSentinel: r.ouraSentinel, antistrophePair: r.antistrophePair, peritropePairs: r.peritropePairs });
        return { output: r.wire, decoded, oneChat: r.messageTokens, note: `parent=${r.parent}; peritrope=${r.peritrope}; k=${r.peritropePairs.length}; pairs=${r.peritropePairs.map((p) => p.join('')).join(',')}; gain=${r.peritropeGain}; anti=${r.antistrophe}` };
      },
    },
    {
      key: 'systole',
      label: "\u03c3\u03c5\u03c3\u03c4\u03bf\u03bb\u03ae SYSTOLE (The contraction \u2014 X41. Eight turns of this project harvested REDUNDANCY, and every mechanism in the stack shares one precondition: the thing removed must occur more than once, because repetition is the only way a rule has so far been able to pay for itself. X41 removes something that does not repeat at all. It removes the separators inside structured numbers, and it pays for each removal individually, because the position of a separator is not stored anywhere; it is implied by the shape of the number. The measurement that motivated it came from a pre-tokenizer accounting rather than from intuition: on the two CSV lanes, 37 to 38 percent of all raw tokens live inside digit runs longer than three digits, and BPE merges buy nothing there, vix having 3,408 pre-tokens and 3,412 tokens, one token per pre-token. That is the signature of a hard floor rather than of a modelling failure, and the floor is the o200k_base pre-tokenizer rule \\p{N}{1,3}, which cuts every digit run every three characters. BPE merges never cross a pre-token boundary, so the year 2026 is irreducibly two tokens no matter how often it occurs, and every separator inside a structured number buys a pre-token of its own on top. The timestamp 2026-09-30T07:59:52.6403938810 takes seventeen pre-tokens; the same value with the separators deleted takes ten. Most of those seven are not the five removed characters, they are the digit runs regrouping, because the three-digit cut lands differently once the barriers are gone. Nothing is lost: the position of each separator is a function of the shape, the shape is stated once in the clause, and every digit is still there. This is not the elision the repository already had. ELLEIPSIS removes a constant, a literal repeated substring at a fixed field position, and can only fire where a value repeats; SYSTOLE removes a separator from numbers that may never repeat at all, and on aapl every single price is unique while 240 of them still each give one up. The two are orthogonal and compose. Two limits shape the design and both are chosen for the reader rather than for the ratio. First, a width cap: templates wider than fourteen digits are refused, because restoring a separator means counting to a position inside a digit string, and arXiv 2605.02028 measured why that matters, querying 126 leading model variants with a stable counting assay and finding that every one of them has a finite counting capacity far below its nominal context length, with failures clustering on round numbers; context access does not imply procedural state maintenance. Second, one template per digit count, because the reader identifies which template to apply by the length of the digit run it is looking at. On vix, dates and prices both strip to eight digits and only one can ship, so the prices go at 504 occurrences against 126 and the 378 the dates would have paid is forgone: paying 378 to keep an instruction unambiguous is the entire point, since a saving the reader cannot act on is not a saving. A third guard is enforced mechanically. After stripping, every maximal digit run whose length equals a shipped template digit count must be one this transform produced, and the round trip must be exact. Both guards earned their place by catching real failures: find-listing has a six-digit size column, so a naive restore turns 113525 into 11:35:25, and dump.sql has an eight-digit hex field inside a decode literal, which a naive restore turns into 0000-00-00. Neither ships. Template selection needed two corrections, both found by watching a naive version lose most of the gain. Ambiguity is not monotone in the template set, so a single best-first pass is wrong: on aapl the date template is ambiguous on its own, because the decimal part of 77.44539475 then survives as a native eight-digit run, but it is perfectly readable once the price template ships too and that same run becomes part of a ten-digit one, and a single pass keeps 201 of 915 available raw tokens where the fixed point keeps all 915. And a weak template must not claim a slot a stronger one is still reaching for, or a six-token template takes the eight-digit slot while the 720-token date waits for its second chance. Composition: SYSTOLE is applied INSIDE PERITROPE, so the text is contracted first and PERITROPE prices its exchanges against the contracted text, and decoding undoes PERITROPE first and restores the separators afterwards; the other order does not work, because if PERITROPE moves the hyphen somewhere else first the contraction rule no longer matches anything. Measured, byte-exact against an independent reference decoder in the same process: aapl falls from 1450 to 1407 with three templates, vix from 579 to 550 with one, bibliography from 671 to 667 with two, and meeting-transcript from 385 to 384 with one, all four byte-exact. The honest gap between probe and codec is severe and is the main thing to take from this turn: aapl priced at 915 raw tokens in isolation and delivered 43, vix priced at 504 and delivered 29, and twelve further lanes with measurable raw separators delivered nothing at all, because the dictionary and shape rules already in the stack capture almost all of the separator structure wherever the numbers repeat. The residual that survives is exactly the high-entropy case, columns whose values are unique, which is why this lands on the two financial CSV lanes and nowhere else. It does not move prose, and the diagnostic says why with a number: kb-article contains one structured numeric run in the whole file and prose-01 contains two, together worth three tokens. External context, including the part that cuts against this. The rule it exploits is documented outside this repository and in the opposite direction: a 2026 analysis at dev.to by ji_ai confirms the \\p{N}{1,3} clause in cl100k_base and o200k_base and shows that chunking runs LEFT TO RIGHT, so token boundaries depend on a number total length rather than on place value, and that a thousands separator is a hard token boundary which forces right-to-left power-of-1000-aligned chunks; Singh and Strouse, arXiv 2402.14903, showed the same alignment effect on arithmetic, with left-to-right tokenization collapsing to 8.25 percent accuracy under length mismatch. Both are arguments for ADDING separators to help the model compute. SYSTOLE removes them, because the objective here is the token count of the message and not the arithmetic the model might later perform on it, and those two objectives genuinely conflict; a wire produced by this codec is a worse substrate for downstream mental arithmetic than the original, and that is a real cost that the token count does not see. Arcee Trinity Large, arXiv 2602.17004 section 2.1.1, adopted place-aligned chunking following Singh and Strouse and reported that the natural zero-width lookahead regex suffers catastrophic backtracking on long digit strings, spiking tokenization to minutes, which is a caution about the same regex machinery this codec relies on and is why the run scanner here trims and resumes rather than using nested lookarounds. CharBench, arXiv 2508.02591, measured the tradeoff this whole stack lives on from the other side: for tasks requiring a model to locate specific characters, accuracy declines as the length of the token containing the target grows, which it describes as a tradeoff between token-level compression and the ability to reason about character-level structure. That is a measured bound on how far any character-level transform of this kind can be pushed, and it is the reason SYSTOLE refuses wide templates rather than shipping them. arXiv 2601.14658 shows that modern subword tokenizers produce non-unique encodings, multiple token id sequences detokenizing to the same surface string, which is a standing caution for a stack whose entire accounting is done in tokens. On the mathematics side, and going deeper into the results called out in prior turns. Levent Alpoge has now produced three AI-assisted results in five weeks, and the verification profile differs sharply between them. The Jacobian counterexample of 19 July 2026, credited to Claude Fable 5 with the question from Akhil Mathew, is a 216-character map with Jacobian determinant identically minus 2 sending three rational points to one image, and it now carries three independent machine verifications: the Lean pull request 4474 to Google DeepMind Formal Conjectures by Paul Lezeau, approved with CI passing in 1 hour 39 minutes but still unmerged; Zenodo 21514514 by Pablo Nogueira Grossi, an independently written Lean 4 build of 3,003 jobs with zero sorries that re-derives the determinant by MvPolynomial.pderiv over the rationals rather than reusing the projective reduction; and an Isabelle/HOL entry in the Archive of Formal Proofs. On 19 August 2026 he announced a smooth counterexample to the Caratheodory conjecture, checked with John-Paul Smith and Anthropic Claude, and on 23 August 2026 a positive answer to the 1947 Hopf problem on a complex structure on the six-sphere, posted as a 100-page document, with formalizations proposed by Dean Cureton and by Boris Alexeev and expository notes by Philip Engel. That third one is the instructive case: Robert Bryant of Duke is quoted as saying there is an emerging consensus that the construction is plausible, plausible rather than verified, and Scientific American and Spektrum both describe the result as unverified. The pattern across all of 2026 is that verification completeness tracks artifact size and reproducibility, not importance. The 216-character counterexample has three independent formalizations. The 100-page Hopf document has a claimed Lean formalization and the word plausible. The 166-page Navier-Stokes announcement of 8 September 2026 has, per several sources I read, no preprint, no arXiv number and no public Lean repository from OpenAI, a self-assessed repository review status, and nobody outside OpenAI who has seen the proof, while the Clay Institute lists the problem as active and OpenAI says it will not claim the prize; Tristan Buckmaster and Alpoge posted a related result about twelve hours earlier and allege OpenAI pursued it after learning of their method, which OpenAI denies. On 6 October 2026 OpenAI published 722 manuscripts in 372 result families from roughly 4,000 attempted problems, about three hours of compute each and largely from one prompt to one agent, including claims on a quasi-Riemann hypothesis, the Unique Games Conjecture and the Hodge conjecture for CM abelian varieties; three manuscripts were withdrawn the next day over a SIGN ERROR and fourteen more revised, roughly 42 percent carry Lean formalizations leaving about 58 percent resting on unchecked natural language, and the Advisory Group on Mathematics and AI hosted at the Institute for Advanced Study recommended on 29 September that labs disclose the model, the prompts and the compute, while the repository publishes average compute and no prompts and the model itself is unreleased, so nobody can rerun any of it. Google DeepMind is the one lab with a genuinely completed review: AlphaProof Nexus solved nine of 353 open Erdos problems, two of them open for 56 years, and that work was peer reviewed in Science in October 2026. OpenAI GPT-6 Astra released ten problems on 2 August 2026 as Lean 4 proofs with a sorry count of zero for about 2,000 dollars of compute, which anyone can mechanically re-run, though peer review had not completed six weeks later. The Erd\u0151s unit distance disproof of May 2026 remains the best-verified single result of the year, with nine outside mathematicians including Noga Alon, Avrim Blum, Timothy Gowers and Melanie Wood publishing a verified and simplified companion, arXiv 2605.20695. And the calibration number worth carrying forward is still the January 2026 DeepMind survey: of 700 open Erdos problems, 13 were addressed, 5 seemingly new and 8 already in the literature. Three of 722 manuscripts withdrawn inside a day over a sign error is the strongest argument I have found for the rule this repository already follows, that every codec must round trip byte-exact against an independent reference decoder in the same process and that nothing is graded by the thing that produced it. Greedy: no for template selection, because every template is priced on the real token count of the text it produces and every surviving set is re-verified for exact invertibility and for reader-unambiguity, and no for the parent gate, because the full message is encoded twice and the worse one discarded; it is a greedy set cover in one respect, that templates are considered in order of measured saving and the fixed point is reached by repeated passes rather than by search over all subsets. Time and CPU bound: yes, template detection is a single regex pass with one tokenization per candidate shape, but the parent gate needs a second full PERITROPE encode of the contracted text, so encode time roughly doubles where the transform looks viable, measured at 289 seconds for aapl and 705 seconds for vix; a raw-saving pre-filter skips the second encode entirely wherever it cannot possibly pay, which is most lanes. Honest size: 43 tokens on aapl, 29 on vix, 4 on bibliography and 1 on meeting-transcript, about 3.0, 5.0, 0.6 and 0.3 percent, and zero on the thirteen other lanes measured, with the caveat that it is a narrow mechanism aimed at high-entropy numeric columns. It barely touches prose: bibliography and meeting-transcript are the only two prose-adjacent lanes that move at all, by four tokens and one, and the diagnostic says why, since kb-article contains one structured numeric run in the whole file and prose-01 contains two.)",
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = systoleEncode(t, enc);
        const decoded = systoleDecode(r.wire, { stats: r.stats, order: r.order, undo: r.parent === 'identity' ? (w: string) => w : chironDecode }, { alphabet: r.alphabet, marker: r.marker, marker2: r.marker2, group: r.syncopeGroup, framing: r.framing, ouraShape: r.ouraShape, ouraMode: r.ouraMode, ouraSentinel: r.ouraSentinel, antistrophePair: r.antistrophePair, peritropePairs: r.peritropePairs, systoleTemplates: r.systoleTemplates });
        return { output: r.wire, decoded, oneChat: r.messageTokens, note: `parent=${r.parent}; systole=${r.systole}; templates=${(r.systoleTemplates || []).map((x) => x.digits + ':' + x.shape).join(' ') || '-'}; gain=${r.systoleGain}; raw=${r.systoleRawSave}; anti=${r.antistrophe}; peri=${r.peritrope}` };
      },
    },
    {
      key: 'chronos',
      label: '⏳ CHRONOS-Ω',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = chronosEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'astraea',
      label: '🌌 ASTRAEA-A2',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = astraeaEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'polaris',
      label: '🌌 POLARIS-P1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = polarisEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'valence',
      label: '⨂ VALENCE-V1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = valenceEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'astral',
      label: '🌌 ASTRAL-A1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = astralEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'aeon',
      label: '♾ AEON-A1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = aeonEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'phoenix',
      label: '𓅂 PHOENIX-P1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = phoenixEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'valkyrie',
      label: '🛡️ VALKYRIE-V1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = valkyrieEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'solaris',
      label: '☀ SOLARIS-S1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = solarisEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'orion',
      label: '🌌 ORION-O10',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = orionEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'zero',
      label: '⚡ ZERO-Z10',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = zeroEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'nebula',
      label: '🌌 NEBULA-N9',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = nebulaEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'quantum',
      label: '⚛️ QUANTUM-Q9',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = quantumEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'kinetic',
      label: '⚡ KINETIC-K8',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = kineticEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'synergy',
      label: '🌀 SYNERGY-S2',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = synergyEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'hypergraph',
      label: '🕸️ HYPERGRAPH-H2',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = hypergraphEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'hyperion',
      label: '☀ HYPERION-H1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = hyperionEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'quasar',
      label: '✦ QUASAR',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = quasarEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'helixAp',
      label: '⟐ HELIX-AP',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = helixEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'meridian',
      label: '☉ MERIDIAN',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = meridianEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'plexus',
      label: '✺ PLEXUS-PX',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = plexusEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'mosaic',
      label: '▦ MOSAIC-M1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = mosaicEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'atlas',
      label: '✧ ATLAS-A1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = atlasEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'aurora',
      label: '◇ AURORA-A1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = auroraEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'kernel',
      label: '⊙ KERNEL-K1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await kernelEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'zenith',
      label: '☀ ZENITH-Z1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await zenithEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'eclipse',
      label: '◐ ECLIPSE-E1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await eclipseEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'iris',
      label: '◇ IRIS-I1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await irisEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'crown',
      label: '♛ CROWN-C1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await crownEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'signet',
      label: '⌗ SIGNET-G1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = signetEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'strata',
      label: '⨂ STRATA-S1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = strataEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'tessera',
      label: '⧉ TESSERA-T1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = tesseraEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'axiom',
      label: '⟦ AXIOM-A1 ⟧',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = axiomEncode(t, enc, []);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'anaphora',
      label: '⟐ Ω-ANAPHORA',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = anaphoraEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'pulse',
      label: '⟡ PULSE-R1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = pulseEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'kappa',
      label: 'κ KAPPA-κ1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = kappaEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'phrase',
      label: 'φ PHRASEBOOK-φ1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = phraseEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'tau',
      label: 'τ TAU-τ1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = tauEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'cadmus', label: '⚔ CADMUS-Ω (Audited Portfolio)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await cadmusEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'proteus', label: '⬥ PROTEUS-Ω (Adaptive Grammar Frontier)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await proteusEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'logos', label: 'Ω LOGOS-Ω (Self-Referential Lexicon Frontier)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await logosEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'hermes', label: '信 HERMES-Ω (Self-Carried Single-Message Codec)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await hermesEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'icarus', label: '翼 ICARUS (Deterministic Latency Lane)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = icarusEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'daedalus', label: '⧗ DAEDALUS (Predicted-Arm Portfolio)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = daedalusEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'gramma', label: '⟐ GRAMMA-Ω (Notation-Dialect Menu: the layout is not shipped, it is regenerated from the reader\'s own formatting priors — JSON.stringify(v,null,N) re-print or bracket-depth re-indent; every dialect gated byte-exact on the text AND through the library CHIRON reader; plain DAEDALUS is a candidate, so it cannot lose on M)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = grammaEncode(t, enc); return { output: r.decoderPrompt, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; exact=${r.exact}; in=${r.inTokens}` }; },
    },
    {
      key: 'daedalus-dual', label: '⧗ DAEDALUS-D (DAEDALUS wire with a dual-tokenizer glyph pool: every glyph is one token under o200k_base AND cl100k_base; same decoder; decode-gated, identity fallback)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = daedalusDualEncode(t, enc); return { output: r.wire, decoded: r.exact ? t : r.wire, oneChat: r.messageTokens[enc === 'cl100k_base' ? 'cl100k_base' : 'o200k_base'], note: `mode=${r.mode}; arm=${r.winningArm}; o200k=${r.messageTokens.o200k_base}; cl100k=${r.messageTokens.cl100k_base} (raw o200k=${r.inTokens.o200k_base}, cl100k=${r.inTokens.cl100k_base})` }; },
    },
    {
      key: 'lakonikos-d', label: '⟡ LAKONIKOS-D (DAEDALUS-D wire with the terse decoder contract: same dual-tokenizer wire and decoder as DAEDALUS-D, the rules sentence shortened; identity unless the chironDecode round trip is exact)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = lakonikosDualEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens[enc === 'cl100k_base' ? 'cl100k_base' : 'o200k_base'], note: `mode=${r.mode}; arm=${r.winningArm}; o200k=${r.messageTokens.o200k_base} (DAEDALUS-D ${r.messageTokensDualOld.o200k_base}); cl100k=${r.messageTokens.cl100k_base}` }; },
    },
    {
      key: 'lakonikos', label: '⟡ LAKONIKOS (DAEDALUS wire, terse decoder contract: same wire and decoder, fewer contract tokens)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = lakonikosEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok (DAEDALUS ${r.messageTokensOld}) vs identity ${r.inTokens}` }; },
    },
    {
      key: 'kalligraphos', label: '✅ KALLIGRAPHOS (Unicode mathematical-alphabet restoration: styled decorative prose -> ASCII + style opcode; otherwise DAEDALUS unchanged; exact)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = kalligraphosEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `applied=${r.kalligraphosApplied}; spans=${r.kalligraphosSpans}; one-chat=${r.messageTokens} tok (contract counted)` }; },
    },
    {
      key: 'crasis', label: 'κ CRASIS (Punctuation-boundary fusion pre-pass: the single space after . ! ? , and before ( " is removed where the live tokenizer shows a compound token, then DAEDALUS; one-line context contract; per-message gated, identity-guarded; exact)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = crasisEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `applied=${r.crasisApplied}; rules=${r.crasisRules.join('') || '-'}${r.crasisFenced ? '/fenced' : ''}; fusion=${r.crasisGain}; plainM=${r.plainMessageTokens}; one-chat=${r.messageTokens} tok (contract counted)` }; },
    },
    {
      key: 'anagnorisis', label: 'ἀ ANAGNORISIS (Public-canon recognition pre-pass: standard open-source license texts and per-file notices (GitHub/choosealicense templates, versioned catalogue) are recognised byte-exactly — any per-line comment prefix, re-wrap width, url scheme, indentation — and replaced by 【SPDX-ID; layout…: blanks】 references the reader already knows; then DAEDALUS; one-line contract compiled from the features used; exact, identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = anagnorisisEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `applied=${r.canonApplied}; refs=${r.canonRefs.map(x => x.replace(/\n/g, '⏎')).join(' ') || '-'}; tiers=${r.canonTiers.join(',') || '-'}; regions=${r.canonRegionTokens}->${r.canonRefTokens} tok; plainM=${r.plainMessageTokens}; one-chat=${r.messageTokens} tok (contract counted)` }; },
    },
    {
      key: 'paradeigma', label: '≡ PARADEIGMA (Template entailment for JSON records: a field whose value is, in every object of a shape, the same concatenation of constants and sibling values — "followers_url" = <url>/followers, "avatar_url" = https://…/u/<id>?v=4, "full_name" = nodejs/<name>, "site_admin" = false — is removed from those objects and restored by the reader from one template line per shape ("objects having \"login\": after \"node_id\": …"); templates are induced from the document, verified on every object, chained in field order; the clause is compressed with the JSON; then DAEDALUS; exact, identity-guarded. Measured: GitHub API lists −7…−15 %, user lists −14 %)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = paradeigmaEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `applied=${r.applied}; templates=${r.templates} in ${r.templateBlocks.length} block(s); elidedLines=${r.elidedLines}; clause=${r.clauseTokens} tok; plainM=${r.plainMessageTokens}; one-chat=${r.messageTokens} tok (contract counted)` }; },
    },
    {
      key: 'synartesis', label: '⊢ SYNARTESIS (Entailment from an enclosing key: in an npm lockfile the "resolved" URL of an entry (key node_modules/NAME, version V) is the registry tarball URL built from NAME and V — a function the dictionary cannot see, because its name and version recur inside it. The entry\'s "resolved" line is removed where the rule rebuilds it exactly, one 72-token sentence states the convention and the insertion point, and the reduced JSON is coded by PARADEIGMA (its clause and DAEDALUS). Guards: PARADEIGMA result when the reduced arm does not pay or fails the round trip, so M ≤ PARADEIGMA ≤ DAEDALUS; escape line for payloads that begin with the rule prefix. Measured: 117 of 117 resolved lines in the repository lockfile)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = synartesisEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `reducedArm=${r.reducedArm}; elidedResolved=${r.elidedResolved}; paradeigmaM=${r.paradeigmaM}; reducedM=${r.reducedM ?? '-'}; one-chat=${r.messageTokens} tok (contract counted); ${r.synNotes}` }; },
    },
    {
      key: 'dendron', label: '⊢ ΔΕΝΔΡΟΝ (Brace-tree notation for path and URL lists: a run of lines that share a first segment is written once as a bash brace group, `dir/{a,b/{c,d}}`, which the reader expands in order; the tree wire is used only when it is strictly cheaper than the DAEDALUS frontier, and the dispatch line is escaped for payloads that carry it. Measured: git ls-files (400 files) −102 (−6.5%), markdown paths −19 (−1.7%), 160-line git listing −13; everything else, including timestamped listings, prose and JSON, ties the frontier)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = denEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `applied=${r.applied}; frontierM=${r.frontierM}; treeM=${r.treeM ?? '-'}; treeLines=${r.treeLines}; one-chat=${r.messageTokens} tok (contract counted); ${r.notes}` }; },
    },
    {
      key: 'dendrons', label: '⊢ ΔΕΝΔΡΟΝ-Σ (DENDRON-S: the brace tree on any separator. The encoder factors dotted identifiers on "." or paths on "/", whichever is cheaper by one-chat M; lines with { } , or a leading ! are written verbatim behind a "!" marker instead of refusing the whole list; the reader needs no separator; tree arm only when strictly cheaper and round-trip exact; frontier otherwise)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = densEncode(t, enc, {}); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `applied=${r.applied}; sep=${JSON.stringify(r.sep)}; frontierM=${r.frontierM}; treeM=${JSON.stringify(r.treeM)}; treeLines=${r.treeLines}; one-chat=${r.messageTokens} tok (contract counted); ${r.notes}` }; },
    },
    {
      key: 'gnomon', label: '∴ ΓΝΩΜΩΝ (GNOMON: fields a public convention fixes from their siblings are not sent. REST link fields (`*_url`) of one JSON object are the object url plus "/"+key stem, or a prefix of an earlier link plus a remainder; npm lockfile `resolved` values are the registry tarball URL of the entry name and version. The reader gets one sentence per rule used, then DAEDALUS; exact, guarded by the plain arm, so never above the frontier)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = gnomonEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `rules=${r.rules.join('+') || 'plain'}; fields rest=${r.fields.rest} npm=${r.fields.npm}; frontierM=${r.frontierM}; one-chat=${r.messageTokens} tok (contract counted)` }; },
    },
    {
      key: 'hora', label: '⏱ HORA (Timestamp deltas: a full YYYY-MM-DD HH:MM:SS.mmm that follows a same-date timestamp is written as ※N, N = milliseconds from the previous one; the reader adds N back; identity unless it pays)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = horaEncode(t, enc); const decoded = horaDecode(r.wire, r.arm); return { output: r.wire, decoded, oneChat: r.messageTokens, note: `arm=${r.arm}; marks=${r.marks}; ${r.notes}` }; },
    },
    {
      key: 'akolouthia2', label: '⁺ AKOLOUTHIA-2 (Arithmetic-progression elision, two-term eligibility: a number that continues the number at the same position in the line above, by the step between the two lines above, is written as one marker; the reader computes it; identity unless it pays)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = akolouthia2Encode(t, enc); const decoded = akolouthia2Decode(r.wire, r.arm); return { output: r.wire, decoded, oneChat: r.messageTokens, note: `arm=${r.arm}; marks=${r.marks}; ${r.notes}` }; },
    },
    {
      key: 'akolouthia', label: '⁺ AKOLOUTHIA (Arithmetic-progression elision: a number that continues the number at the same position in the line above, by the same step as the line two above, is written as one marker; the reader computes it)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = akolouthiaEncode(t, enc); const decoded = akolouthiaDecode(r.wire, r.arm); return { output: r.wire, decoded, oneChat: r.messageTokens, note: `arm=${r.arm}; marks=${r.marks}; ${r.notes}` }; },
    },
    {
      key: 'elleipsis', label: '○ ELLEIPSIS (Positional ellipsis: a constant that sits at a fixed field position in every record of a stated class — a shared path prefix on the last field of a listing, a constant column — is removed with no marker and restored by one sentence naming the position, the constant and the lines that keep it literally; then DAEDALUS; exact, identity-guarded. Measured: constants already folded by the dictionary are free (newline/padding/",," residue), so only prefix-before-word removals pay)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = elleipsisEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `applied=${r.applied}; rules=${r.rules.map(x => `${x.form}@${x.k}[${x.form === 'cells' ? (x.pairs ?? []).map(p => p.column ?? p.k).join('/') : JSON.stringify(x.value)}]`).join('+') || '-'}; elidedLines=${r.elidedLines}; sentence=${r.clauseTokens} tok; plainM=${r.plainMessageTokens}; one-chat=${r.messageTokens} tok (contract counted)` }; },
    },
    {
      key: 'epagoge', label: '∴ EPAGOGE (Induced entailment: rule schemas with free parameters — which source-file extensions a trace uses (Java + Kotlin at once, Kotlin file facades), which heading-slug flavour a document uses, which compare-URL stem and tag prefix a changelog uses — are instantiated from the document, verified on every candidate field, stated in one sentence, and the fields are removed; inter-record "zipper" rules included; then DAEDALUS; exact, identity-guarded; ties ENTHYMEME where its fixed rules apply)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = epagogeEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `applied=${r.applied}; schemas=${r.schemas.map((s, i) => `${s}[${r.params[i]}]`).join('+') || '-'}; elided=${r.elided} fields (${r.elidedTokens} raw tok); sentence=${r.clauseTokens} tok; plainM=${r.plainMessageTokens}; one-chat=${r.messageTokens} tok (contract counted)` }; },
    },
    {
      key: 'enthymeme', label: '∴ ENTHYMEME (Entailment elision: fields fixed by a public convention given their neighbours — the source file of a JVM stack frame, the GitHub slug of a Markdown heading link — are removed and restored by the reader from a one-sentence rule; then DAEDALUS; exact, identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = enthymemeEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `applied=${r.applied}; rules=${r.rules.join('+') || '-'}; elided=${r.elided} fields (${r.elidedTokens} raw tok); rule=${r.clauseTokens} tok; plainM=${r.plainMessageTokens}; one-chat=${r.messageTokens} tok (contract counted)` }; },
    },
    {
      key: 'anamnesis', label: 'ἀ ANAMNESIS (deterministic maximal-repeat core: no wall clock, work-bounded, CHIRON wire; single message, contract in band)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = anamnesisEncode(t, enc, { gate: false }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'anamnesis-gated', label: 'ἀ ANAMNESIS-G (same core, plus a one-call gate against the shipped frontier encoder so it cannot lose on token count)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = anamnesisEncode(t, enc, { gate: true }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.delegated ? 'frontier arm kept' : 'core kept'}; ${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'dirfold', label: '▤ DIRFOLD (same-directory path folding: ↑ = the directory of the line above; one-line rule; identity unless it pays)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = dirfoldEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `${r.mode}; folded=${r.folded} lines; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx', label: '▥ PHALANX (ASCII-only fixed pipeline: UUIDFOLD -> DIRFOLD-A -> DITTO -> VERITAS-VX; each stage gated; identity unless exact and cheaper)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `${r.mode}; stages=${r.stageTokens.join('/')}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx2', label: '▥ PHALANX-P2 (ASCII-only fixed pipeline: UUIDFOLD -> DIRFOLD-A -> DITTO -> KOINE-K1 (gated on the VERITAS output) -> VERITAS-VX; identity unless exact and cheaper)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanx2Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `${r.mode}; koine=${r.koineKept ? 'kept' : 'off'}; stages=${r.stageTokens.join('/')}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx3', label: '▥ PHALANX-P3 (ASCII-only fixed pipeline: UUIDFOLD -> DIRFOLD-A -> DITTO -> KOINE-K1 -> RECALL-R1 (both gated on VERITAS) -> VERITAS-VX; identity unless exact and cheaper)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanx3Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `${r.mode}; koine=${r.koineKept ? 'kept' : 'off'}; recall=${r.recallKept ? 'kept' : 'off'}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx4', label: '▦ PHALANX-P4 (KOINE and RECALL headers folded into one legend line; DITTO, DIRFOLD-A, UUIDFOLD inline; identity unless exact and cheaper)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanx4Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `${r.mode}; stages=[${r.applied.join(',')}]; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx-a1', label: '▣ PHALANX-A1 (PHALANX-P4 with VERITAS-A: one-token alias characters for VX references; all stages named in the in-message legend; identity unless exact and cheaper)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxA1Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `${r.mode}; vx=${r.vxKept}; stages=[${r.applied.join(',')}]; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx-a2', label: '▣ PHALANX-A2 (PHALANX-A1 with a shorter VXA legend and the per-file minimum over VX window W in {3,2,4}; decoder unchanged; identity unless exact and cheaper)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxA2Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `${r.mode}; vx=${r.vxKept}; stages=[${r.applied.join(',')}]; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx-a3', label: '▣ PHALANX-A3 (PHALANX-A2 plus a canonical-JSON layer: a document that is exactly JSON.stringify(v, null, N) is carried minified and re-indented by the decoder; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxA3Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `layer=${r.layer}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx-a4', label: '▣ PHALANX-A4 (PHALANX-A3 plus a gated log-template stage: tabular text with repeated line shapes is carried as templates plus variables; identity-guarded against A3)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxA4Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `layer=${r.layer}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx-a5', label: '▣ PHALANX-A5 (PHALANX-A4 plus a gated lossless hard-wrap layer: paragraphs that are exactly greedy-wrapped prose are carried unwrapped and re-wrapped by the decoder; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxA5Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `layer=${r.layer} width=${r.width}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx-a6', label: '▣ PHALANX-A6 (PHALANX-A5 plus a gated lossless table layer: column-aligned ops tables (ps, ls -l, df) are carried space-separated and re-padded by the decoder; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxA6Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `layer=${r.layer}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx-a7', label: '▣ PHALANX-A7 (PHALANX-A5 plus a gated lossless column layer: PADTAB2 fixed-cell rows with a verbatim free tail, so ls -l rows with symlink targets stay in one block; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxA7Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `layer=${r.layer}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'veritas-u', label: '⟁ VERITAS-U single-pass union dictionary (VXA wire and decoder; candidates of windows 2,3,4 in one greedy pass, no window tournament; exact whole-wire gate; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = veritasUEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `mode=${r.mode}; entries=${r.entries.length}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx-a10', label: '▣ PHALANX-A10 (PHALANX-A7 with VERITAS-C: token-window and character-substring dictionary, nested equals-free header, one greedy pass; same A7 layers; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxA10Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `layer=${r.layer}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'veritas-c', label: '⟁ VERITAS-C dictionary (token-window and character-substring candidates; nested equals-free header; VXC wire; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = veritasCEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `mode=${r.mode}; entries=${r.entries.length}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx-a9', label: '▣ PHALANX-A9 (PHALANX-A7 with VERITAS-N: the VERITAS-U dictionary whose header phrases may use shorter entries\' aliases; same A7 layers; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxA9Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `layer=${r.layer}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'veritas-n', label: '⟁ VERITAS-N nested-header dictionary (VERITAS-U selection; header phrases may refer to shorter entries; VXN wire; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = veritasNEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `mode=${r.mode}; entries=${r.entries.length}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'veritas-r', label: '⟁ VERITAS-R (VXR: greedy phrase dictionary with exact-count key reassignment and pruning; standard search budget; VXR wire; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = veritasREncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `entries=${r.entries}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'veritas-k', label: '⟁ VERITAS-K (VERITAS-R with wide greedy search for inputs up to 16000 chars; same VXR wire and decoder; standard budget above 16000 chars; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = veritasKEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `mode=${r.mode}; entries=${r.entries}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'veritas-m', label: '⟁ VERITAS-M (VERITAS-R with look-past, Cyrillic key pool and decode-gated key-swap hill-climb; full search up to 10000 chars; same VXR wire and decoder; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = veritasMEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `mode=${r.mode}; entries=${r.entries}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx-a8', label: '▣ PHALANX-A8 (PHALANX-A7 with the VERITAS-U single-pass union dictionary as its VX stage; same wire and decoder as A7; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxA8Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `layer=${r.layer}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'veritas-q', label: '⟁ VERITAS-Q (VERITAS-M search; legend carries the decode instruction: minimal legend without escapes, escape legend with them; decoder unchanged; identity-guarded; NOT Pareto-superior on the 151-file corpus)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = veritasQEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `legend=${r.legend}; entries=${r.entries}; one-chat=${r.outTokens} tok (instruction counted) vs identity ${r.inTokens}` }; },
    },
    {
      key: 'veritas-p', label: '⟁ VERITAS-P (VERITAS-R wire with the VERITAS-Q legend; line-level exact-delta search with look-past, exact whole-wire acceptance in refinement; decode-gated; identity-guarded; NOT Pareto-superior on the 151-file corpus: +8.6% vs DAEDALUS/A10 frontier, -0.4% vs VERITAS-Q)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = veritasPEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `legend=${r.legend}; entries=${r.entries}; trials=${r.trials}; one-chat=${r.outTokens} tok (instruction counted) vs identity ${r.inTokens}` }; },
    },
    {
      key: 'veritas-vx-multi', label: '⟁ VERITAS-VX multi-window (trigram+bigram candidates, real-token gate; same VX1 wire and decoder)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = veritasEncodeMulti(t, enc); const w = withVxLegend(r.wire); return { output: w, decoded: veritasDecodeL(w), oneChat: countTokens(w, enc), note: `${r.mode}; ${r.entries.length} entries; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'ditto', label: '⋮ DITTO (per-field same-as-above marks ^, ASCII-only wire; one-line rule; identity unless it pays)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = dittoEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `${r.mode}; marked=${r.marked} fields; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'uuidfold', label: '▦ UUIDFOLD (canonical lowercase UUIDs as 32 uppercase digits, one-line restore rule; identity unless it pays)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = uuidfoldEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `${r.mode}; uuids=${r.uuids}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'tabmin', label: '▦ TABMIN (rectangular tables: row arm or column-major arm, whichever is cheaper; column arm carries a one-line reader note)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = tabminEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.arm} arm; ${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'amphora', label: '⚱ AMPHORA (DAEDALUS ∥ CHIRON exact-gated minimum: adds the full-span CHIRON arm where DAEDALUS falls back to identity on long prose; two-arm tournament)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = amphoraEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'kanon', label: '⚖ KANON (HYLE table-fold gate → DAEDALUS on the folded body; AMPHORA otherwise: generated-column + aligned-table folds, no indentation folds, fixed arm)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = kanonEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}; gate=${r.gate}` }; },
    },
    {
      key: 'orthos', label: '♦ ORTHOS (Typographic Canonicalization Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = orthosEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'stentor', label: '《 STENTOR (Case-Canonicalization Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = stentorEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'abacus', label: '〒 ABACUS (Numeric/Unicode-Form Canonicalization Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = abacusEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'procrustes', label: '★ PROCRUSTES (Kerning/Fullwidth Canonicalization Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = procrustesEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'circe', label: '▶ CIRCE (Encoded/Injected-Artifact Restoration Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = circeEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'chimera', label: '▪ CHIMERA (Composed-Canonicalization Portfolio)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = chimeraEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'caesura', label: '═ CAESURA (Whitespace-Convention Canonicalization Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = caesuraEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'syntagma', label: '➡ SYNTAGMA (Hangul Canonical-Decomposition Restoration Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = syntagmaEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'prosopon', label: '₪ PROSOPON (Mojibake Wrong-Codepage Restoration Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = prosoponEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'epistle', label: '℃ EPISTLE (Quoted-Printable MIME Restoration Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = epistleEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'arithmos', label: '∞ ARITHMOS (Native-Script Numeral Restoration Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = arithmosEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'kallos', label: '✔ KALLOS (Styled Typography & Math Font Restoration Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = kallosEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'panoptes', label: '▬ PANOPTES (Universal Composed-Canonicalization Meta-Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = panoptesEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'episteme', label: '◈ EPISTEME (Universal Morphological Transduction & Dual-Lattice Lossless Codec)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = epistemeEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'anastrophe', label: '↻ ANASTROPHE (Gated Permutation Family + Closure Result)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = anastropheEncode(t, enc, { maxConfigs: 3, configBudgetMs: 55, armBudgetMs: 3000 }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'plinthos', label: '▥ PLINTHOS (Multi-Block Column-Major Transpose)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = plinthosEncode(t, enc, { maxConfigs: 3, configBudgetMs: 55 }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'kiones', label: '▦ KIONES (Column-Major Block Transpose + Stack)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = kionesEncode(t, enc, { maxConfigs: 4, configBudgetMs: 60 }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'polytropos', label: '⟡ POLYTROPOS (Exact-Priced Engine Configuration Space)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = polytroposEncode(t, enc, { maxConfigs: 5, configBudgetMs: 70 }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'logistike', label: '⊿ LOGISTIKE (Exact Chunk-Additive Cost Algebra + Wide Portfolio)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = logistikeEncode(t, enc, { maxArms: 4, armBudgetMs: 80 }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'akribeia', label: '∴ AKRIBEIA (Exact-Measurement Portfolio + Drop-Polish)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = akribeiaEncode(t, enc, { maxArms: 3, armBudgetMs: 80 }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'eustochia', label: '◎ EUSTOCHIA (Aimed Arm Portfolio + Minimal Contract)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = eustochiaEncode(t, enc, { maxArms: 2, armBudgetMs: 80 }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'syntomia', label: '⌁ SYNTOMIA (Minimal-Sufficient Decode Contract + Gate Re-Run)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = syntomiaEncode(t, enc, { budgetMs: 1500 }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'synizesis', label: '⇒ SYNIZESIS (Pre-Tokenizer Boundary Collapse by Shape-Template Factoring)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = synizesisEncode(t, enc, { budgetMs: 1500 }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'metatron', label: '⟁ METATRON (Sovereign Morphological, Structural & Dual-Lattice Lossless Codec)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = metatronEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'palimpsest', label: '⎈ PALIMPSEST (Configuration Portfolio)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = palimpsestEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'thoth', label: '𓅜 THOTH (Suffix-Automaton Mining, Clock-Free)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = thothEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'sequoyah', label: '𐌔 SEQUOYAH (Clock-Free Deterministic Assignment)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = sequoyahEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'sibyl', label: '☘ SIBYL (Single-Token Rules + Pooled Alphabet)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = sibylEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'ariadne', label: '⟁ ARIADNE (Symbol-Space Optimal Parse + Glyph Assignment)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = ariadneEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'kairos', label: '⟐ KAIROS (CHIRON search, deterministic work-unit budget: same wire and decoder, reproducible output)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = chironEncode(t, enc, { workUnits: KAIROS_WORK_UNITS }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok (contract ${r.contractTokens} + wire ${r.outTokens}) vs identity ${r.inTokens}` }; },
    },
    {
      key: 'chiron', label: '⟐ CHIRON (Two-Part-MDL Text Program)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = chironEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok (contract ${r.contractTokens} + wire ${r.outTokens}) vs identity ${r.inTokens}` }; },
    },
    {
      key: 'tachys', label: '⚡ TACHYS (Incompressibility-Certified Latency Lane)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = tachysEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'hydra', label: '🐉 HYDRA (Portfolio-Frontier Closure: TACHYS × KIONES)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = hydraEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'glossia', label: '👅 GLOSSIA (Grammar-Aware Fold: HYDRA × MOSAIC)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = glossiaEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'eidos', label: '⬣ EIDOS (Temporal-Delta Fold: GLOSSIA × Δ)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = eidosEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'aion', label: '♾ AION (Invariant-Delta Fold: EIDOS × Constant-Date)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = aionEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'mnemosyne', label: '🧠 MNEMOSYNE (Abstraction-Drain Fold: EIDOS × Template-*)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = mnemosyneEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'nyx', label: '🌑 NYX (Terminal-Program Fold: AION×MNEMOSYNE×OPT-BPE)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = nyxEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'echo', label: '🔊 ECHO (Causal-Thread Fold: quote-recursive ∇ + CHIRON)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = echoEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'lethe', label: '🌊 LETHE (Forgetfulness Fold: ECHO ∪ punct-stego ∇ + accents)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = letheEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'oracle', label: '🔮 ORACLE (Knowledge Fold: firstAuthorYear → parametric memory ∇ pages)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = oracleEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'stichos', label: '📜 STICHOS (Verse-Line Fold: greedy-refill layout ∇ + CHIRON stack)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = stichosEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'periodos', label: '¶ PERIODOS (per-paragraph measure: greedy-refill layout ∇ + CHIRON stack; reader must count columns — LLM decode unverified)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = periodosEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'stichos-metatron', label: '📜⟁ STICHOS∘METATRON (verse-line layout under METATRON)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = stichosMetatronEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'metis', label: '⬤ METIS-Ω (Polymorphic Grammar Frontier)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await metisEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'eupraxia', label: '⬣ EUPRAXIA-Ω (Boundary-Superoptimized Frontier)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await eupraxiaEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'dike', label: '⬢ DIKE-Ω (Escape-Free Frontier)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await dikeEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'themis', label: '⬡ THEMIS-Ω (Succinct SLP Frontier)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await themisEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'nemesis', label: '◆ NEMESIS-Ω (Grammar-of-Grammar Frontier)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await nemesisEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'moira', label: '◇ MOIRA-Ω (Constituent Lattice Frontier)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await moiraEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'ananke', label: '◊ ANANKE-Ω (Residual Grammar Frontier)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await anankeEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'khoros',
      label: '⟁ KHOROS-Ω (Terminal Sovereign Leader)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await khorosEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'omni',
      label: '⟁ OMNI-Ω (Terminal Sovereign)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await omniEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'genesis',
      label: '⟁ GENESIS-Ω (Terminal Sovereign)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await genesisEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'arche',
      label: '⟁ ARCHE-Ω (Terminal Sovereign)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await archeEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'telos',
      label: '⟁ TELOS-Ω (Terminal Sovereign)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await telosEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'pantheon',
      label: '⟁ PANTHEON-Ω (Terminal Sovereign Non-Rosetta Leader)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await pantheonEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'apeiron',
      label: '⟁ APEIRON-Ω (Terminal Boundless Non-Rosetta Leader)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await apeironEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'noesis',
      label: '⟁ NOESIS-Ω (Terminal Non-Rosetta Absolute Leader)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await noesisEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'synapse',
      label: '⟁ SYNAPSE-Ω (Terminal Non-Rosetta Leader)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await synapseEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'panacea',
      label: '⟁ PANACEA-Ω (Terminal Codec)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await panaceaEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'aether',
      label: '⟁ AETHER-A1 (General Prose Leader)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await aetherEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'harmonia',
      label: '⧢ HARMONIA-H1 (Pareto Leader)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await harmoniaEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'rosetta',
      label: '𓋹 ROSETTA-R5.6',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await rosettaEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'losslessAscii',
      label: 'Lossless ASCII',
      family: 'exact',
      fidelity: 'exact',
      run: async (t) => {
        const r = encodeLosslessAscii(t);
        return { output: r.output, decoded: r.decoded };
      },
    },
    { key: 'holographic', label: '🌀 Holographic', family: 'exact', fidelity: 'exact', run: async (t) => { const r = compressHolographic(t); return { output: r.output, decoded: r.decoded }; } },
    { key: 'asgJson', label: 'ASG JSON Rows', family: 'exact', fidelity: 'exact', run: async (t) => { const r = encodeAsg(t); return { output: r.output, decoded: r.decoded }; } },
    { key: 'astCode', label: '💻 True AST Code', family: 'exact', fidelity: 'exact', run: async (t) => { const r = compressAst(t); return { output: r.output, decoded: r.decoded }; } },
    { key: 'caveHolo', label: '🔥 CaveHolo', family: 'semantic', fidelity: 'lossy', run: async (t) => ({ output: compressCaveHolo(t).output }) },
    { key: 'ibCaveHolo', label: '🧊 IB-CaveHolo', family: 'semantic', fidelity: 'lossy', run: async (t) => ({ output: compressIbCaveHolo(t).output }) },
    { key: 'caveMan', label: '🦴 CaveMan (full)', family: 'semantic', fidelity: 'lossy', run: async (t) => ({ output: cavemanCompress(t, 'full').output }) },
    { key: 'caveManUltra', label: '🦴 CaveMan (ultra)', family: 'semantic', fidelity: 'lossy', run: async (t) => ({ output: cavemanCompress(t, 'ultra').output }) },
    { key: 'dragi', label: '🐉 DRAGI D12', family: 'semantic', fidelity: 'lossy', run: async (t) => ({ output: compressDragi(t).output }) },
    { key: 'wenyan', label: '文言文 Wenyan', family: 'semantic', fidelity: 'lossy', run: async (t) => ({ output: compressWenyan(t, 'lite').output }) },
    { key: 'composite', label: '⚡ CaveMan+DRAGI', family: 'semantic', fidelity: 'lossy', run: async (t) => ({ output: compressComposite(t).output }) },
    { key: 'dragiScale', label: '📚 DRAGI Multi', family: 'semantic', fidelity: 'lossy', run: async (t) => ({ output: compressDragiAtScale(t, 3).output }) },
    { key: 'ordos', label: '🔺 Ordos Tri-Band', family: 'semantic', fidelity: 'lossy', run: async (t) => ({ output: compileOrdosTriBand(t).output }) },
    { key: 'noether', label: '⚛ Noether CCL', family: 'semantic', fidelity: 'lossy', run: async (t) => ({ output: compileNoether(t).output }) },
    {
      key: 'hilbert',
      label: '🌌 Hilbert wave projection',
      family: 'semantic',
      fidelity: 'lossy',
      run: async (t) => {
        const m = (await import('@/lib/neuralese-hilbert')) as Record<string, unknown>;
        const fn = m.projectHilbertWave as ((s: string, k?: number) => { output: string }) | undefined;
        if (!fn) throw new Error('projectHilbertWave not exported');
        return { output: fn(t, 12).output };
      },
    }
  ];

  return base;
}

export async function measure(e: Entry, text: string, enc: EncodingName, inTokens: number): Promise<CodecRun> {
  const t0 = performance.now();
  const base: CodecRun = {
    key: e.key,
    label: e.label,
    family: e.family,
    fidelity: e.fidelity,
    output: '',
    outChars: 0,
    inTokens,
    outTokens: 0,
    savingsPct: 0,
    heuristicSavingsPct: 0,
    estimateErrorPts: 0,
    exact: null,
    tokensPerChar: 0,
    ms: 0,
    oneChatTokens: null,
  };
  try {
    const r = await e.run(text, enc);
    const outTokens = countTokens(r.output, enc);
    const hIn = heuristicTokens(text);
    const hOut = heuristicTokens(r.output);
    const real = inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0;
    const heur = hIn ? ((hIn - hOut) / hIn) * 100 : 0;
    return {
      ...base,
      output: r.output,
      outChars: r.output.length,
      outTokens,
      savingsPct: real,
      heuristicSavingsPct: heur,
      estimateErrorPts: heur - real,
      exact: r.decoded == null ? null : r.decoded === text,
      tokensPerChar: r.output.length ? outTokens / r.output.length : 0,
      ms: performance.now() - t0,
      note: r.note,
      oneChatTokens: r.oneChat ?? (r.output === text ? inTokens : null),
    };
  } catch (err) {
    return { ...base, ms: performance.now() - t0, error: (err as Error).message };
  }
}

export async function runCodecAudit(
  text: string,
  enc: EncodingName,
  deep: boolean,
  onProgress?: (done: number, total: number, label: string) => void,
): Promise<CodecRun[]> {
  const inTokens = countTokens(text, enc);
  const entries = codecEntries().filter((e) => deep || !e.deep);
  const out: CodecRun[] = [];

  const t0 = performance.now();
  try {
    const xi = await omegaXiCompress(text, enc);
    const back = await omegaXiDecode(xi.output, enc);
    const hIn = heuristicTokens(text);
    const hOut = heuristicTokens(xi.output);
    out.push({
      key: 'omega_xi',
      label: 'Ω-Ξ ATOM (this build)',
      family: 'omega-xi',
      fidelity: 'exact',
      oneChatTokens: null,
      output: xi.output,
      outChars: xi.output.length,
      inTokens,
      outTokens: xi.outTokens,
      savingsPct: xi.savingsPct,
      heuristicSavingsPct: hIn ? ((hIn - hOut) / hIn) * 100 : 0,
      estimateErrorPts: (hIn ? ((hIn - hOut) / hIn) * 100 : 0) - xi.savingsPct,
      exact: back === text,
      tokensPerChar: xi.output.length ? xi.outTokens / xi.output.length : 0,
      ms: performance.now() - t0,
      note: `${xi.codecName} · ${xi.bitsPerAtom} bit/atom · 1 tok/atom=${xi.invariantHolds}`,
    });
  } catch (err) {
    out.push({
      key: 'omega_xi',
      label: 'Ω-Ξ ATOM (this build)',
      family: 'omega-xi',
      fidelity: 'exact',
      oneChatTokens: null,
      output: '',
      outChars: 0,
      inTokens,
      outTokens: 0,
      savingsPct: 0,
      heuristicSavingsPct: 0,
      estimateErrorPts: 0,
      exact: false,
      tokensPerChar: 0,
      ms: performance.now() - t0,
      error: (err as Error).message,
    });
  }
  onProgress?.(1, entries.length + 1, 'Ω-Ξ ATOM');

  let i = 1;
  for (const e of entries) {
    out.push(await measure(e, text, enc, inTokens));
    i++;
    onProgress?.(i, entries.length + 1, e.label);
    await new Promise((r) => setTimeout(r, 0));
  }
  return out;
}