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