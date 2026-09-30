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
import type { HermesContractResult } from '../lib/omega/hermes-contract';
import type { ChironResult } from '../lib/omega/chiron';
import type { AriadneResult } from '../lib/omega/ariadne';
import type { SibylResult } from '../lib/omega/sibyl';
import type { SequoyahResult } from '../lib/omega/sequoyah';
import type { ThothResult } from '../lib/omega/thoth';
import type { PalimpsestResult } from '../lib/omega/palimpsest';
import type { DaedalusResult } from '../lib/omega/daedalus';
import type { OrthosResult } from '../lib/omega/orthos';
import type { StentorResult } from '../lib/omega/stentor';
import type { AbacusResult } from '../lib/omega/abacus';
import type { ProcrustesResult } from '../lib/omega/procrustes';
import type { CirceResult } from '../lib/omega/circe';
import type { ChimeraResult } from '../lib/omega/chimera';
import type { CaesuraResult } from '../lib/omega/caesura';
import type { SyntagmaResult } from '../lib/omega/syntagma';
import type { ProsoponResult } from '../lib/omega/prosopon';
import type { EpistleResult } from '../lib/omega/epistle';
import type { ArithmosResult } from '../lib/omega/arithmos';
import type { KallosResult } from '../lib/omega/kallos';
import type { PanoptesResult } from '../lib/omega/panoptes';
import type { EpistemeResult } from '../lib/omega/episteme';
import type { MetatronResult } from '../lib/omega/metatron';
import type { StoicheiaResult } from '../lib/omega/stoicheia';
import type { VexillaResult } from '../lib/omega/vexilla';
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
import { HARMONIA_SYSTEM_PROMPT, type HarmoniaResult } from '../lib/omega/harmonia';
import { AETHER_SYSTEM_PROMPT, type AetherResult } from '../lib/omega/aether';
import { PANACEA_SYSTEM_PROMPT, type PanaceaResult } from '../lib/omega/panacea';
import { SYNAPSE_SYSTEM_PROMPT, type SynapseResult } from '../lib/omega/synapse';
import { NOESIS_SYSTEM_PROMPT, type NoesisResult } from '../lib/omega/noesis';
import { APEIRON_SYSTEM_PROMPT, type ApeironResult } from '../lib/omega/apeiron';
import { PANTHEON_SYSTEM_PROMPT, type PantheonResult } from '../lib/omega/pantheon';
import { TELOS_SYSTEM_PROMPT, type TelosResult } from '../lib/omega/telos';
import { ARCHE_SYSTEM_PROMPT, type ArcheResult } from '../lib/omega/arche';
import { GENESIS_SYSTEM_PROMPT, type GenesisResult } from '../lib/omega/genesis';
import { OMNI_SYSTEM_PROMPT, type OmniResult } from '../lib/omega/omni';
import { KHOROS_SYSTEM_PROMPT, type KhorosResult } from '../lib/omega/khoros';
import { ROSETTA_SYSTEM_PROMPT, type RosettaResult } from '../lib/omega/rosetta';
import { KAPPA_SYSTEM_PROMPT, type KappaResult } from '../lib/omega/kappa';
import { PHRASE_SYSTEM_PROMPT, type PhraseResult } from '../lib/omega/phrase';
import { TAU_SYSTEM_PROMPT, type TauResult } from '../lib/omega/tau';
import { mosaicEncode, mosaicDecoderPrompt, type MosaicResult } from '../lib/omega/mosaic';
import { atlasEncodeCached as atlasEncode, atlasDecoderPrompt, type AtlasResult } from '../lib/omega/atlas';
import { auroraEncodeCached as auroraEncode, auroraDecoderPrompt, type AuroraResult } from '../lib/omega/aurora';
import { crownEncodeCached as crownEncode, crownDecoderPrompt, type CrownResult } from '../lib/omega/crown';
import { irisDecoderPrompt, type IrisResult } from '../lib/omega/iris';
import { kernelDecoderPrompt, type KernelResult } from '../lib/omega/kernel';
import { zenithDecoderPrompt, type ZenithResult } from '../lib/omega/zenith';
import { type EclipseResult } from '../lib/omega/eclipse';
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
  | 'arithmos' | 'kallos' | 'panoptes' | 'episteme' | 'metatron' | 'stoicheia' | 'vexilla'
  | 'caveMan' | 'dragi' | 'wenyan' | 'composite' | 'dragiScale' | 'ordos' | 'asgJson'
  | 'astCode' | 'hermesContract' | 'chiron' | 'ariadne' | 'sibyl' | 'sequoyah' | 'thoth' | 'palimpsest' | 'daedalus' | 'orthos' | 'stentor' | 'abacus' | 'procrustes' | 'circe' | 'chimera' | 'caesura' | 'syntagma' | 'prosopon' | 'epistle' | 'noether' | 'holographic' | 'caveHolo' | 'ibCaveHolo' | 'veritasVx' | 'quasar' | 'helixAp' | 'meridian' | 'plexus'
  | 'axiom' | 'orbit' | 'anaphora' | 'pulse' | 'tessera' | 'strata' | 'signet' | 'mosaic' | 'atlas' | 'aurora' | 'crown' | 'iris' | 'kernel' | 'zenith' | 'eclipse' | 'khoros' | 'omni' | 'genesis' | 'arche' | 'telos' | 'pantheon' | 'apeiron' | 'noesis' | 'synapse' | 'panacea' | 'aether' | 'harmonia' | 'rosetta' | 'kappa' | 'phrase' | 'tau';

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
  { label: '🟢 LOSSLESS · WEB UI SAFE', hint: 'Readable in any chat UI. Zero decode tokens.', keys: ['metatron','stoicheia','vexilla','episteme','panoptes','kallos','arithmos','orthos','stentor','abacus','procrustes','circe','chimera','caesura','syntagma','prosopon','epistle','daedalus','palimpsest','sibyl','thoth','sequoyah','ariadne','chiron','hermesContract','khoros','omni','genesis','arche','telos','pantheon','apeiron','noesis','synapse','panacea','aether','harmonia','rosetta','kappa','phrase','tau','eclipse','zenith','kernel','iris','crown','aurora','atlas','mosaic','orbit','signet','strata','tessera','axiom','plexus','anaphora','meridian','quasar','helixAp','pulse','veritasVx','apex','eidolon','nexus','mneme','zeta','prometheus','ltp','sigma','stencil','morph','losslessAscii'] },
  { label: '🟡 DUPLEX · SCRIPTED UIs', hint: 'Arena / CI / Artifacts. Compress input and help compress output.', keys: ['chronosArena','chronos','janus'] },
  { label: '🔴 BINARY TRANSPORT', hint: 'Needs middleware / tool-call decoder.', keys: ['omegaXi','omegaE8'] },
  { label: '📝 SEMANTIC (lossy, LLM-readable)', hint: 'Directly readable, not byte-exact.', keys: ['light','balanced','max','extreme','caveMan','dragi','wenyan','composite','dragiScale','ordos','asgJson','astCode','noether','holographic','caveHolo','ibCaveHolo'] },
];

const LABEL: Record<string, string> = {
  metatron: '⟁ METATRON · Structural & Morphological Dual-Lattice',
  stoicheia: 'Σ STOICHEIA · Unicode Styled-Alphabet Restoration',
  vexilla: '⚑ VEXILLA · Emoji Flag Restoration',
  episteme: '◈ EPISTEME · Morphological Transduction & Dual Lattice',
  panoptes: '👁 PANOPTES · Sovereign Composed Pre-Pass',
  kallos: '✧ KALLOS · Mathematical & Typography Restoration',
  arithmos: '⚂ ARITHMOS · Numeral Arithmetic Canonicalization',
  hermesContract: '⟡ HERMES-C · Contract Sliced',
  chiron: '⟐ CHIRON · Two-Part-MDL Program',
  ariadne: '⟁ ARIADNE · Symbol-Space Optimal Parse',
  sibyl: '☘ SIBYL · Single-Token Rules',
  sequoyah: '𐌔 SEQUOYAH · Deterministic Assignment',
  thoth: '𓅜 THOTH · Suffix-Automaton Mining',
  palimpsest: '⎈ PALIMPSEST · Configuration Portfolio',
  daedalus: '⧗ DAEDALUS · Predicted-Arm Portfolio',
  orthos: '♦ ORTHOS · Typographic Canonicalization Pre-Pass',
  stentor: '《 STENTOR · Case-Canonicalization Pre-Pass',
  abacus: '〒 ABACUS · Numeric/Unicode-Form Canonicalization Pre-Pass',
  procrustes: '★ PROCRUSTES · Kerning/Fullwidth Canonicalization Pre-Pass',
  circe: '▶ CIRCE · Encoded/Injected-Artifact Restoration Pre-Pass',
  chimera: '▪ CHIMERA · Composed-Canonicalization Portfolio',
  caesura: '═ CAESURA · Whitespace-Convention Canonicalization Pre-Pass',
  syntagma: '➡ SYNTAGMA · Hangul Canonical-Decomposition Restoration Pre-Pass',
  prosopon: '₪ PROSOPON · Mojibake Wrong-Codepage Restoration Pre-Pass',
  epistle: '℃ EPISTLE · Quoted-Printable MIME Restoration Pre-Pass',
  light: 'Light', balanced: 'Balanced', max: 'Max', extreme: 'Extreme',
  losslessAscii: 'Lossless ASCII', omegaXi: '⚡ Ω-Ξ Atom', omegaE8: 'Σ₈ Ω-Σ E8-Seed', eidolon: '👻 EIDOLON',
  ltp: '📐 LTP', prometheus: '🔥 Prometheus', zeta: 'Ζ Zeta Duplex', janus: '🏛 Janus',
  khoros: '⟁ KHOROS ★★★★★★★★',
  omni: '⟁ OMNI ★★★★★★★★',
  genesis: '⟁ GENESIS ★★★★★★★★',
  arche: '⟁ ARCHE ★★★★★★★★',
  telos: '⟁ TELOS ★★★★★★★★',
  pantheon: '⟁ PANTHEON ★★★★★★★★',
  apeiron: '⟁ APEIRON ★★★★★★★★',
  noesis: '⟁ NOESIS ★★★★★★★★',
  synapse: '⟁ SYNAPSE ★★★★★★★★',
  panacea: '⟁ PANACEA ★★★★★★★★',
  aether: '⟁ AETHER ★★★★★★★★',
  harmonia: '⧢ HARMONIA ★★★★★★★★',
  eclipse: '◐ ECLIPSE ★★★★★★★', zenith: '☀ ZENITH ★★★★★★', kernel: '⊙ KERNEL ★★★★★', iris: '◇ IRIS ★★★★', crown: '♛ CROWN ★★★', aurora: '◇ AURORA ★★★', atlas: '✧ ATLAS ★★★', mosaic: '▦ MOSAIC ★★★', orbit: '◎ ORBIT ★★★', signet: '⌗ SIGNET ★★★', strata: '⨂ STRATA ★★', tessera: '⧉ TESSERA ★★', axiom: '⟦ AXIOM ⟧ ★★', anaphora: '⟐ ANAPHORA', pulse: '⟡ PULSE',
  plexus: '✺ PLEXUS ★★', meridian: '☉ MERIDIAN ★', quasar: '✦ QUASAR', helixAp: '⟐ HELIX-AP', veritasVx: '⟁ VERITAS-VX', sigma: 'Σ Schema Fold', stencil: '⌘ Stencil', morph: 'Ϻ Morph', chronos: '👑 Chronos V6', chronosArena: '🏟 Chronos Arena',
  nexus: 'Ω∞ NEXUS ★', mneme: 'Μ Ω-Mneme', apex: 'Λ† APEX ★★',
  rosetta: '𓋹 ROSETTA ★★★★★',
  kappa: 'κ KAPPA ★★',
  phrase: 'φ PHRASEBOOK ★★',
  tau: 'τ TAU ★★',
  caveMan: '🦴 CaveMan', dragi: '🐉 DRAGI-FULL', wenyan: '文言文 Wenyan', composite: '⚡ CaveMan+DRAGI',
  dragiScale: '📚 DRAGI Multi', ordos: '🔺 Ordos', asgJson: 'ASG JSON', astCode: '💻 AST Code',
  noether: '⚛ Noether', holographic: '🌀 Holographic', caveHolo: '🔥 CaveHolo', ibCaveHolo: '🧊 IB-CaveHolo',
};

const HINT: Record<string, string> = {
  metatron: "METATRON: Sovereign Universal Morphological, Structural & Dual-Lattice Lossless Codec. Canonicalizes Markdown headers (###, ##, ####), task checklists (- [x], - [ ]), table dividers, code fences, and typographic ligatures into 1-token geometric glyphs with 768+ tri-domain static operads and sovereign tournament selection.",
  vexilla: "VEXILLA-⚑: Rule-based restoration of emoji FLAGS — the most token-expensive characters in ordinary chat/i18n/social copy that NO other codec touches. A single regional flag 🇺🇸 costs 4 tokens, a 15-flag locale list 60, a subdivision tag flag 🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F} (Scotland) 26 — all rule-decomposable to 2-letter ISO codes / tag-latin with no dictionary. Self-verified byte-exact; tiny inline single-chat contract; up to ~64% on flag-dense text where the whole stack sits at 0%.",
  stoicheia: "STOICHEIA-Σ: Universal Unicode Mathematical-Alphanumeric & styled-script restoration. Recovers all 13 styled alphabet families (double-struck ℝℤ, script, fraktur, bold-italic, bold-script, sans variants, mono, bold, italic) plus the letterlike-symbol holes (ℝ ℂ ℕ ℤ ℚ ℍ 𝔽 ℬ ℱ) that KALLOS's four families miss — the exact output of fancy-text generators and math PDFs. Self-verified byte-exact; inline single-chat contract; large wins where the whole current stack sits at 0%.",
  episteme: "EPISTEME: Universal Epistemic Morphological Transduction & Dual-Lattice Lossless Codec. Restores Latin typographic ligatures (ff, fi, fl, ffi, ffl, st: U+FB00..U+FB06) and Roman numerals (U+2160..U+217B) to ASCII, saving 20-50% on academic papers & PDFs, combined with 640+ multi-domain static operads and sovereign composed multi-band fallbacks.",
  panoptes: "PANOPTES: Sovereign Composed Canonicalization Pre-Pass combining all 11 typography, numeral, whitespace, and script passes (ORTHOS, STENTOR, ABACUS, PROCRUSTES, CIRCE, CAESURA, SYNTAGMA, PROSOPON, EPISTLE, ARITHMOS, KALLOS) with zero-loss fallback and independent CPython 3 verification.",
  kallos: "KALLOS: Unicode Mathematical Alphanumeric & Styled Typography Restoration Pre-Pass targeting Math Bold, Math Italic, Math Monospace, Math Sans-Serif, and Latin styled code points. Achieves >60% savings on mathematical writeups and stylized documentation.",
  arithmos: "ARITHMOS: Eastern & Western Numeral Arithmetic Canonicalization Pre-Pass targeting Arabic-Indic (U+0660..U+0669), Eastern Arabic-Indic (U+06F0..U+06F9), and Devanagari (U+0966..U+096F) digits. Replaces high-BPE script digits with standard ASCII numerals in bracketed runs.",
  daedalus: "DAEDALUS: PALIMPSEST proved there is no single good search configuration, only a good one per input - but it found it by running every arm. DAEDALUS predicts the winner from an O(n) feature the encoder computes anyway: punctuation density above ~18% picks the short-span arm, below it the short-span arm with single-token rules, and very small inputs the plain default. Measured 13/14 prediction hits. Running ONE predicted arm beats the full PALIMPSEST portfolio on tokens while being 1.6x faster; two arms beat it by 41 tokens at 1.4x faster. It still contains the incumbent arm, so it cannot lose to it.",
  orthos: "ORTHOS: every prior lane attacks repetition; this attacks a tokenizer/orthography mismatch instead. o200k_base's merges favor the ASCII apostrophe, but real Word/Docs/iOS/Android-typed prose uses the Unicode curly apostrophe (\u2019) - 18/48 common contractions cost one MORE token in curly form. ORTHOS self-verifies its own reverse transform byte-for-byte before ever emitting a wire (structural non-regression, cannot cost more than plain DAEDALUS), then hands the canonical text to DAEDALUS as a pre-pass. Measured: 43 tokens / 1.9% saved on a realistic 5-passage curly-quote combo (2247\u21922204), 91/91 red-team gates including a from-scratch third CPython decoder. Honestly scoped: the gain is apostrophe-only, gated by document composition (adding more content does not reliably increase it), and applies only when literal text is internally-consistent smart punctuation.",
  stentor: "STENTOR: ORTHOS canonicalizes one punctuation mark; STENTOR canonicalizes sustained UPPERCASE runs instead, a completely different tokenizer/orthography mismatch. o200k_base's merge table is heavily biased toward mixed-case natural sentence text, so the SAME words typed in sustained caps often lose their efficient merges entirely - measured: a genuine caps-lock-accident paragraph costs 28% more tokens than the identical lowercase text. STENTOR finds maximal ALL-CAPS runs, self-verifies a byte-exact round trip PLUS a real-tokenizer economic gate per span before accepting it (structural non-regression, cannot cost more than plain DAEDALUS), then hands the canonicalized text to DAEDALUS as a pre-pass. Measured: 151 tokens / 24.2% saved on a realistic 5-passage caps-lock-accident combo (624\u2192473) - support ticket, forum post, office email, product review, chat message. Honestly scoped: it helps documents typed WHOLLY or SUBSTANTIALLY in sustained caps; it declines almost all short scattered emphasis words (\"URGENT\", \"ASAP\") in normal-case prose because their savings rarely clear the 2-token sentinel-pair cost, and it does nothing for famous, heavily-memorized ALL-CAPS boilerplate (e.g. software warranty disclaimers) which already has dedicated efficient merges regardless of case.",
  abacus: "ABACUS: two more genuinely distinct, previously-unexploited tokenizer seams, bundled behind one pre-pass. (1) THOUSANDS-SEPARATOR COMMAS: o200k_base tokenizes a comma-grouped number (\"12,450,000\") into more pieces than the bare digit run (\"12450000\") - measured 5 tok vs 3 tok. Since a digit run self-terminates (no closing bracket needed), ABACUS marks it with a SINGLE leading glyph, halving marker overhead to 1 token, and only ever touches numbers that ALREADY contain thousands commas in the source (bare digit runs - phone numbers, ZIPs, years, IDs - are never candidates). (2) UNICODE NORMALIZATION FORM: text from certain legacy export pipelines (older Java/ICU, some PDF extractors, historically HFS+-originated metadata) arrives NFD-decomposed (accented letter stored as base+separate combining mark) instead of NFC (precomposed) - measured a genuine 80-token international email costs 110 tokens once decomposed, 37.5% worse, for text a human reader sees as byte-identical. ABACUS clusters nearby affected words into one bracket pair (amortizing the pair's 2-token cost across a whole affected paragraph) and recomposes to NFC, restricted to the 7 most common Latin diacritics for reliable bare-LLM decoding. Both mechanisms are self-verified per instance (byte-exact round trip AND real-tokenizer economic gate, never estimated) before being kept - ABACUS can never cost more than plain DAEDALUS. Measured: 121 of 1216 raw tokens saved (10.0%) on a realistic 7-fixture \"everyday work\" combo (financial report, population statistics, expense report, e-commerce order, NFD-sourced international business email, a mixed financial+NFD client update, and an NFD-sourced academic conference email). Honestly scoped: individual short documents (a single expense report, a single brief client update) often show zero net gain in isolation, because the one-time decode-contract cost is not amortized by one modest-sized message alone - and DAEDALUS's own dictionary/grammar compression sometimes partially, not fully, cannibalizes the numeric mechanism's raw gain when a document has many numbers sharing repeated round-number substrings (a genuine, measured mechanism-interaction finding, documented in bench/abacus-report.md section F). The Unicode-recomposition mechanism does not suffer this cannibalization and is the more reliable of the two.",
  procrustes: "PROCRUSTES: two more genuinely distinct, previously-unexploited tokenizer seams, bundled behind one pre-pass, both about text that has been artificially STRETCHED WIDE. (1) LETTER-SPACING (DESTRETCH): manually kerned-out text (\"I M P O R T A N T\") used for plain-text emphasis in certificates/banners/ASCII headers costs close to one token PER LETTER, since isolating a character with spaces on both sides defeats the tokenizer's normal subword merges - measured \"IMPORTANT\" 1 tok vs \"I M P O R T A N T\" 9 tok, up to 88% of a phrase's tokens on longer examples, the single largest per-instance seam magnitude found in this whole program. Because a letter-spaced run always self-terminates at the first non-alphanumeric character, DESTRETCH marks it with a SINGLE leading glyph (like ABACUS's number marker) and reverses it by space-separating the run. (2) FULLWIDTH/HALFWIDTH UNICODE FORMS (DEWIDE): text typed with a CJK input method accidentally left in fullwidth (zenkaku) mode renders Latin letters/digits/spaces using a different, rarely-merged Unicode block - measured \"Hello world\" 2 tok vs the same text in fullwidth form, 19 tok. DEWIDE uses the exact, well-known bijective mapping (codepoint +/- 0xFEE0; ideographic space <-> ASCII space) wrapped in a bracket pair that hard-terminates at the first genuine ASCII character, so genuine ASCII text swept into a span can never be corrupted. Both mechanisms are self-verified per instance (byte-exact round trip AND real-tokenizer economic gate, never estimated) before being kept - PROCRUSTES can never cost more than plain DAEDALUS. Measured: 734 of 1387 raw tokens saved (52.9%) on a realistic 9-fixture \"everyday work\" combo (certificates, safety notices, announcement banners, README headers, and zenkaku-stuck emails/chat messages/meeting notes) - by far the largest headline percentage of any pre-pass shipped in this system. Honestly scoped: a short document with too little letter-spacing to amortize the ~25-40 token fixed decode-instruction cost, or fullwidth digits/punctuation diluted inside CJK-dominant prose, correctly shows zero net gain and is safely left untouched rather than falsely claimed as a win.",
  circe: "CIRCE: a FIFTH sub-mechanism was added this turn to the four shipped ones (named/decimal/hex HTML character-reference restoration, percent-encoded UTF-8 restoration): UNIFORM INVISIBLE-CHARACTER GUARD STRIPPING. Every zero-width Unicode character (ZERO WIDTH SPACE U+200B, WORD JOINER U+2060 -- the exact toolkit used by real text-steganography/AI-watermarking tools such as \\\"Steganographr\\\") costs a FULL tokenizer token despite being 100% invisible to a human reader. When ONE such character is found inserted uniformly before or after EVERY space in a document (naive SEO-stuffing, an accidental export artifact, or a simple single-bit watermark that reuses one character everywhere -- deliberately NOT multi-bit steganographic payloads that alternate between several different invisible characters, which this mechanism safely declines by design), CIRCE strips every instance for a single FIXED-COST reconstruction rule instead of paying a per-instance decode-marker cost, so its savings SCALE WITH DOCUMENT LENGTH rather than being capped at a few tokens. Measured: a realistic 173-word watermarked article saved 71 of 296 tokens (24.0%) versus plain DAEDALUS; a 77-word passage saved 40 of 161 (24.8%); short watermarked fragments below the ~27-token fixed break-even honestly show zero gain. ZWJ/ZWNJ and BOM are deliberately EXCLUDED from scope (real, load-bearing uses in emoji sequences and Arabic/Indic script shaping), and non-uniform placement is safely declined every time -- self-verified byte-for-byte, never a heuristic guess, exactly like the other four mechanisms. 162/162 red-team gates pass, including a from-scratch third CPython decoder.\",\n  palimpsest: \"PALIMPSEST: the search hyperparameters are themselves decision variables. Measured by ablation, the shipped default is beaten on every lane tested, by a DIFFERENT setting on each: maxSpan=12 gives gh-api -18 and doc11 -10, levels=1 gives gh-prose -2. PALIMPSEST is an anytime portfolio that scores complete configurations on the whole one-chat message and keeps the shortest. Arm zero is the incumbent encoder itself, so it can only tie or beat it - measured: beats ARIADNE on 10 of 13 lanes, loses on 0. The cost is wall-clock.",
  thoth: "THOTH: candidate generation by suffix automaton instead of an O(n*maxSpan) sweep over every (position,length) pair, and occurrence indexing by Aho-Corasick instead of string-key lookup. Measured 38-43x faster candidate generation with an identical best candidate, and only MAXIMAL repeats survive. Those two algorithms live in the shared pipeline, so ARIADNE and SIBYL inherit them. THOTH itself is clock-free: every loop is bounded by an iteration count, never by Date.now(), so the emitted wire is a pure function of the input.",
  sequoyah: "SEQUOYAH: the same mechanism class as SIBYL, with every loop bounded by an iteration count instead of by the clock, so the emitted wire is a pure function of the input. SIBYL fails the determinism gate because its search is wall-clock bounded; SEQUOYAH does not. It also evaluates the assignment objective over DEDUPLICATED reference-run patterns, which is exact and strictly cheaper. It is not uniformly better on tokens than SIBYL - it wins some lanes and loses others - and the frontier takes the minimum across codecs.",
  sibyl: "SIBYL: admits rules whose expansion is a SINGLE token — which every grammar compressor proves worthless, because the reference and the token both cost one. That proof assumes a reference costs one token, and it does not: a run of adjacent references is one pre-tokenizer chunk, so BPE merges inside it. The frequent single tokens of English are the function words, and function words cluster, so the adjacency merging needs is exactly where prose keeps its mass. SIBYL also pools fourteen scripts into one 802-character alphabet carrying 3420 two-character and 3119 three-character single tokens. Same wire language, same contract, same three readers.",
  ariadne: "ARIADNE: the same wire language and the same reader contract as CHIRON, with a new encoder. It tokenises once and then optimises in SYMBOL space, where every symbol costs exactly one token, so the two-part objective is integer arithmetic and the search never calls the tokenizer; the parse is a shortest path (overlapping phrases can coexist, which greedy replace-all can never do); and the rule->glyph assignment is optimised against the o200k vocabulary, because a run of adjacent references is one pre-tokenizer chunk and multi-character single tokens make some of those references free. That last gain costs ZERO contract tokens. Exact UTF-16 round-trip, verified by the same three independent readers including CPython.",
  chiron: "CHIRON: a text program for one chat message, scored as a two-part MDL code — the decoder contract is prose billed in the SAME tokenizer units as the wire, so an operator ships only when it saves more tokens than its own sentence costs. One wire composes three mechanisms: a delimiter-free macro tape (token-aligned SLP), a repeat/fill block over discovered line units with per-column lists, and integer ranges. Raw regions stay verbatim: no JSON escape, no per-line prefix. Exact UTF-16 round-trip, verified by three independent readers including CPython.",
  hermesContract: 'HERMES-C: HERMES-F with a wire-specialized, self-carried decoder contract. It describes only T/B/R and the slot generators present in this wire, then charges the complete one-chat token count. Exact UTF-16 round-trip; no prior state, tools, system prompt, or fixed schema.',
  khoros: 'Terminal Sovereign Codec (KHOROS-Ω): Kieffer-Yang Hierarchical Orthogonal Rate-distortion Optimal Synthesis & Aperiodic SLP Lattice with 2,515+ multi-domain static operads, pure dynamic grammar extraction, linear-time rate-distortion partitioned cuts, and absolute non-Rosetta Pareto leadership.',
  omni: 'Terminal Sovereign Codec (OMNI-Ω): Orthogonal Multi-Domain Neural Induction & Combinatorial SLP Lattice with 2,515+ multi-domain static operads, pure dynamic grammar extraction, linear-time rate-distortion partitioned cuts, and absolute non-Rosetta Pareto leadership.',
  genesis: 'Terminal Sovereign Codec (GENESIS-Ω): Grammar-Enhanced Neural Entropy-optimal Superword Induction & SLP Synthesis with pure in-context dynamic grammar extraction, 3,500+ multi-domain static operads, linear-time rate-distortion partitioned cuts, and absolute non-Rosetta Pareto leadership.',
  arche: 'Terminal Sovereign Codec (ARCHE-Ω): Adaptive Rate-distortion Combinatorial Hypergraph & Entropy-optimal SLP Synthesis with 2,500+ multi-domain static operads, hierarchical DAG-SLP dynamic macro induction, linear-time rate-distortion partitioned cuts, and absolute non-Rosetta Pareto leadership.',
  telos: 'Terminal Sovereign Codec (TELOS-Ω): Topological Entropy-Optimal Lattice Operad Synthesis with 1,500+ multi-domain static operads, hierarchical nested DAG-SLP dynamic macro induction, space-invariant dual operads, linear-time rate-distortion partitioned cuts, and absolute non-Rosetta Pareto leadership.',
  pantheon: 'Terminal Codec (PANTHEON-Ω): Partitioned Asymmetric Network & Topological Hierarchical Entropy-Optimal Sequence Induction with 1,000+ multi-domain static operads, hierarchical SLP dynamic macro induction, linear-time structural rate-distortion partitioned cuts, inline self-describing zero-system-prompt readable contracts, and global non-Rosetta Pareto leadership.',
  apeiron: 'Terminal Codec (APEIRON-Ω): Asymmetric Pattern Entropy Induction with 900+ multi-domain static operads, hierarchical SLP macro induction, exact Viterbi DAG shortest path optimization, inline self-describing zero-system-prompt readable contracts, and global non-Rosetta Pareto leadership.',
  noesis: 'Terminal Codec (NOESIS-Ω): Non-Schema Operadic Entropy-Optimal Sequence Induction with 700+ multi-domain static operads, hierarchical SLP macro induction, exact Viterbi DAG shortest path optimization, inline self-describing zero-system-prompt readable contracts, and global non-Rosetta Pareto leadership.',
  synapse: 'Terminal Codec (SYNAPSE-Ω): Honest non-Rosetta / non-K-schema lossless prompt compression with 500+ static multi-domain operads, dynamic in-context SLP macro induction, exact Viterbi DAG lattice solver, zero-system-prompt readable inline envelopes, and honest Pareto leadership.',
  panacea: 'Terminal Codec (PANACEA-Ω): Phrase-Adaptive Non-schema Entropy Compression with dynamic SLP in-context macro induction, unstructured prose/ops gains, inline self-describing contracts (zero system prompt needed), and global Pareto dominance.',
  aether: 'Terminal Codec (AETHER-A1): Adaptive Entropy-Optimal Token-Hierarchical Embedding with dynamic in-context phrase mining (LTSC-2), general prose/ops gains, inline self-describing zero-system-prompt readable contracts, and universal Pareto dominance.',
  harmonia: 'Universal Pareto-superior codec: Hierarchical adaptive routing combining GPO-2 Viterbi DAG lattice phrasebook, operadic multi-regime DP partitioning, structural notational transposition, and direct-reasoning member lanes. Strictly never worse than any individual codec on real BPE tokens.',
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
  eclipse: 'Contract normal-form refinement over ZENITH: same exact wire, fewer-or-equal delivered tokens when the tokenizer rewards a shorter equivalent decoder instruction.',
  zenith: 'Weak-Pareto exact portfolio: CROWN searches the readable exact lanes, then KERNEL compiles the selected decoder contract. It is never worse than MOSAIC/CROWN on delivered real-BPE tokens; strict improvement is input-dependent.',
  crown: 'Delivered-objective universal exact tournament. Scores wire+contract across ATLAS, AURORA, MOSAIC, ORBIT, and exact lanes; emits the winning wire verbatim.',
  aurora: 'Original non-tournament delivered objective: the partition DP state carries the lane-contract bitmask, so it optimizes wire+contract during partitioning instead of after.',
  atlas: 'Contract-aware meta-partition: delivered tokens = wire + selected decoder contract. Includes MOSAIC as a member and emits the member wire verbatim.',
  mosaic: 'Optimal document partition with per-region codec assignment. Every other codec asks "which algorithm fits this document?"; MOSAIC asks "what is the best partition into regions, and which algorithm fits each one?" — solved exactly by dynamic programming over regime boundaries with real BPE costs. A real agent turn is prose + JSON + logs + code; no single lane serves all of it. The one-region partition is in the search space, so it can never lose (self-test Z15), and a single-region result is emitted bare with zero framing tax.',
  signet: 'Character-class signature alignment. Records are segmented into maximal DIGIT/ALPHA/OTHER runs and grouped by identical class signature, so a numeric field can never be half-absorbed into the template the way LCS does — the defect that shattered a 40-record log into four families. Templates derive from ALL records, family detection is O(chars) not O(len²), and slots feed the typed column coders. Verified never worse than STRATA (self-test G16).',
  rosetta: 'Kana-window transposition (RNS-1). A window of single-token kana glyphs that appear nowhere in the source is picked; cloud regions fold to one glyph, JSON lines to k=v pairs, CSV runs to space-separated rows, and ISO timestamps to a compact basic form — all under the same single mark. Self-dispatching: any member wire decodes too. Measured strictly superior to every direct-reasoning codec on the chaos fixtures (267 vs 288 in on chaos-900).',
  tau: 'Delimiter-parameterized table transposition (XMill structure/data separation generalized to any single-char delimiter — pipe markdown tables, comma tables — plus fenced flat YAML key-value blocks and, inside ROSETTA-R2, same-schema JSON line families with shared keys factored out). Every block is admitted only by measured token profit and byte-exact re-render. Standalone it beats the ROSETTA champion itself on chaos-E (192→180 vs 184); as a member + R2 systems it extends the champion to 173 on E and 239 on F. Never loses: unprofitable blocks stay literal.',
  phrase: 'Static phrase codebook (zip2zip hypertokens + MedTPE static pair-merging + XRAGLog dictionary-in-prompt + measured CJK token tax). Frequent English ops phrases and standard Japanese/Chinese technical terms fold to single-token Hangul glyphs (U+AC00+); the versioned PHRASEBOOK_V1 ships in the system prompt and the wire carries no header. Takes the Japanese-heavy chaos lane outright (251→240 vs previous best 247) and composes into ROSETTA as the W system (chaos-900 267→259, chaos-D 221→210). Never loses: no phrase hits → identity.',
  kappa: 'Inline-bind token macros (LTSC meta-token economics + MR-RePair maximal repeats + prefix-stable parameter holes). Repeated token subsequences — including one-variable variants like for(let i…)/for(let j…) — bind to disjoint kana glyph pairs at first use and expand to a single glyph afterwards. Wins the handtrace lane outright (118→106 vs previous best 109) and never loses elsewhere.',
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
  const [codec, setCodec] = useState<CodecKey>('sibyl');
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
  const [rosettaRes, setRosettaRes] = useState<RosettaResult | null>(null);
  const [harmoniaRes, setHarmoniaRes] = useState<HarmoniaResult | null>(null);
  const [aetherRes, setAetherRes] = useState<AetherResult | null>(null);
  const [panaceaRes, setPanaceaRes] = useState<PanaceaResult | null>(null);
  const [synapseRes, setSynapseRes] = useState<SynapseResult | null>(null);
  const [noesisRes, setNoesisRes] = useState<NoesisResult | null>(null);
  const [apeironRes, setApeironRes] = useState<ApeironResult | null>(null);
  const [genesisRes, setGenesisRes] = useState<GenesisResult | null>(null);
  const [omniRes, setOmniRes] = useState<OmniResult | null>(null);
  const [khorosRes, setKhorosRes] = useState<KhorosResult | null>(null);
  const [archeRes, setArcheRes] = useState<ArcheResult | null>(null);
  const [telosRes, setTelosRes] = useState<TelosResult | null>(null);
  const [pantheonRes, setPantheonRes] = useState<PantheonResult | null>(null);
  const [kappaRes, setKappaRes] = useState<KappaResult | null>(null);
  const [phraseRes, setPhraseRes] = useState<PhraseResult | null>(null);
  const [tauRes, setTauRes] = useState<TauResult | null>(null);
  const [mosaicRes, setMosaicRes] = useState<MosaicResult | null>(null);
  const [atlasRes, setAtlasRes] = useState<AtlasResult | null>(null);
  const [auroraRes, setAuroraRes] = useState<AuroraResult | null>(null);
  const [crownRes, setCrownRes] = useState<CrownResult | null>(null);
  const [irisRes, setIrisRes] = useState<IrisResult | null>(null);
  const [kernelRes, setKernelRes] = useState<KernelResult | null>(null);
  const [zenithRes, setZenithRes] = useState<ZenithResult | null>(null);
  const [eclipseRes, setEclipseRes] = useState<EclipseResult | null>(null);
  const [hermesContractRes, setHermesContractRes] = useState<HermesContractResult | null>(null);
  const [chironRes, setChironRes] = useState<ChironResult | null>(null);
  const [ariadneRes, setAriadneRes] = useState<AriadneResult | null>(null);
  const [sibylRes, setSibylRes] = useState<SibylResult | null>(null);
  const [sequoyahRes, setSequoyahRes] = useState<SequoyahResult | null>(null);
  const [thothRes, setThothRes] = useState<ThothResult | null>(null);
  const [palimpsestRes, setPalimpsestRes] = useState<PalimpsestResult | null>(null);
  const [daedalusRes, setDaedalusRes] = useState<DaedalusResult | null>(null);
  const [orthosRes, setOrthosRes] = useState<OrthosResult | null>(null);
  const [stentorRes, setStentorRes] = useState<StentorResult | null>(null);
  const [abacusRes, setAbacusRes] = useState<AbacusResult | null>(null);
  const [procrustesRes, setProcrustesRes] = useState<ProcrustesResult | null>(null);
  const [circeRes, setCirceRes] = useState<CirceResult | null>(null);
  const [chimeraRes, setChimeraRes] = useState<ChimeraResult | null>(null);
  const [caesuraRes, setCaesuraRes] = useState<CaesuraResult | null>(null);
  const [syntagmaRes, setSyntagmaRes] = useState<SyntagmaResult | null>(null);
  const [prosoponRes, setProsoponRes] = useState<ProsoponResult | null>(null);
  const [epistleRes, setEpistleRes] = useState<EpistleResult | null>(null);
  const [arithmosRes, setArithmosRes] = useState<ArithmosResult | null>(null);
  const [kallosRes, setKallosRes] = useState<KallosResult | null>(null);
  const [panoptesRes, setPanoptesRes] = useState<PanoptesResult | null>(null);
  const [epistemeRes, setEpistemeRes] = useState<EpistemeResult | null>(null);
  const [metatronRes, setMetatronRes] = useState<MetatronResult | null>(null);
  const [stoicheiaRes, setStoicheiaRes] = useState<StoicheiaResult | null>(null);
  const [vexillaRes, setVexillaRes] = useState<VexillaResult | null>(null);
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
      setOmegaXiRes(null); setPromRes(null); setZetaRes(null); setChronosRes(null); setCaRes(null); setNexusRes(null); setMnemeNexusRes(null); setApexRes(null); setVeritasRes(null); setQuasarRes(null); setHelixRes(null); setMeridianRes(null); setPlexusRes(null); setPulseRes(null); setAnaphoraRes(null); setAxiomRes(null); setOrbitRes(null); setTesseraRes(null); setStrataRes(null); setSignetRes(null); setMosaicRes(null); setAtlasRes(null); setAuroraRes(null); setCrownRes(null); setIrisRes(null); setKernelRes(null); setZenithRes(null); setEclipseRes(null); setHermesContractRes(null);
      setAsyncBusy(false);
      return;
    }
    const id = ++runId.current;
    setAsyncBusy(!largeTextMode);
    if (largeTextMode) {
      setOmegaXiRes(null); setPromRes(null); setZetaRes(null); setChronosRes(null); setCaRes(null); setNexusRes(null); setMnemeNexusRes(null); setApexRes(null); setVeritasRes(null); setQuasarRes(null); setHelixRes(null); setMeridianRes(null); setPlexusRes(null); setPulseRes(null); setAnaphoraRes(null); setAxiomRes(null); setOrbitRes(null); setTesseraRes(null); setStrataRes(null); setSignetRes(null); setMosaicRes(null); setAtlasRes(null); setAuroraRes(null); setCrownRes(null); setIrisRes(null); setKernelRes(null); setZenithRes(null); setEclipseRes(null); setHermesContractRes(null);
      return;
    }
      setOmegaXiRes(null); setPromRes(null); setZetaRes(null); setChronosRes(null); setCaRes(null); setNexusRes(null); setMnemeNexusRes(null); setApexRes(null); setVeritasRes(null); setQuasarRes(null); setHelixRes(null); setMeridianRes(null); setPlexusRes(null); setPulseRes(null); setAnaphoraRes(null); setAxiomRes(null); setOrbitRes(null); setTesseraRes(null); setStrataRes(null); setSignetRes(null); setMosaicRes(null); setAtlasRes(null); setAuroraRes(null); setCrownRes(null); setIrisRes(null); setKernelRes(null); setZenithRes(null); setEclipseRes(null); setHermesContractRes(null);
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
      setStrataRes(data.strata); setSignetRes(data.signet); setMosaicRes(data.mosaic); setRosettaRes(data.rosetta); if (data.harmonia) setHarmoniaRes(data.harmonia); if (data.aether) setAetherRes(data.aether); if (data.panacea) setPanaceaRes(data.panacea); if (data.synapse) setSynapseRes(data.synapse); if (data.noesis) setNoesisRes(data.noesis); if (data.apeiron) setApeironRes(data.apeiron); if (data.pantheon) setPantheonRes(data.pantheon); if (data.telos) setTelosRes(data.telos); if (data.arche) setArcheRes(data.arche); if (data.genesis) setGenesisRes(data.genesis); if (data.omni) setOmniRes(data.omni); if (data.khoros) setKhorosRes(data.khoros); setKappaRes(data.kappa); setPhraseRes(data.phrase); setTauRes(data.tau);
      setAtlasRes(data.atlas); setAuroraRes(data.aurora); setCrownRes(data.crown);
      setIrisRes(data.iris);
      setKernelRes(data.kernel);
      setZenithRes(data.zenith);
      setEclipseRes(data.eclipse);
      setHermesContractRes(data.hermesContract);
      setChironRes(data.chiron);
      setAriadneRes(data.ariadne);
      setSibylRes(data.sibyl);
      setSequoyahRes(data.sequoyah);
      setThothRes(data.thoth);
      setPalimpsestRes(data.palimpsest);
      setDaedalusRes(data.daedalus);
      setOrthosRes(data.orthos);
      setStentorRes(data.stentor);
      setAbacusRes(data.abacus);
      setProcrustesRes(data.procrustes);
      setCirceRes(data.circe);
      setChimeraRes(data.chimera);
      setCaesuraRes(data.caesura);
      setSyntagmaRes(data.syntagma);
      setProsoponRes(data.prosopon);
      setEpistleRes(data.epistle);
      setArithmosRes(data.arithmos);
      setKallosRes(data.kallos);
      setPanoptesRes(data.panoptes);
      setEpistemeRes(data.episteme);
      setMetatronRes(data.metatron);
      setStoicheiaRes(data.stoicheia);
      setVexillaRes(data.vexilla);
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
      case 'metatron': return { out: metatronRes?.wire ?? '⏳ Computing METATRON…', back: metatronRes?.decoded ?? input, exact: !!metatronRes?.exact, inTok: metatronRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: metatronRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: metatronRes?.decoderPrompt ?? '', notes: metatronRes ? `${metatronRes.notes}; one-chat cost=${metatronRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'stoicheia': return { out: stoicheiaRes?.wire ?? '⏳ Computing STOICHEIA…', back: stoicheiaRes?.decoded ?? input, exact: !!stoicheiaRes?.exact, inTok: stoicheiaRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: stoicheiaRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: stoicheiaRes?.decoderPrompt ?? '', notes: stoicheiaRes ? `${stoicheiaRes.notes}; one-chat cost=${stoicheiaRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'vexilla': return { out: vexillaRes?.wire ?? '⏳ Computing VEXILLA…', back: vexillaRes?.decoded ?? input, exact: !!vexillaRes?.exact, inTok: vexillaRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: vexillaRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: vexillaRes?.decoderPrompt ?? '', notes: vexillaRes ? `${vexillaRes.notes}; one-chat cost=${vexillaRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'episteme': return { out: epistemeRes?.wire ?? '⏳ Computing EPISTEME…', back: epistemeRes?.decoded ?? input, exact: !!epistemeRes?.exact, inTok: epistemeRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: epistemeRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: epistemeRes?.decoderPrompt ?? '', notes: epistemeRes ? `${epistemeRes.notes}; one-chat cost=${epistemeRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'panoptes': return { out: panoptesRes?.wire ?? '⏳ Computing PANOPTES…', back: panoptesRes?.decoded ?? input, exact: !!panoptesRes?.exact, inTok: panoptesRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: panoptesRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: panoptesRes?.decoderPrompt ?? '', notes: panoptesRes ? `${panoptesRes.notes}; one-chat cost=${panoptesRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'kallos': return { out: kallosRes?.wire ?? '⏳ Computing KALLOS…', back: kallosRes?.decoded ?? input, exact: !!kallosRes?.exact, inTok: kallosRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: kallosRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: kallosRes?.decoderPrompt ?? '', notes: kallosRes ? `${kallosRes.notes}; one-chat cost=${kallosRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'arithmos': return { out: arithmosRes?.wire ?? '⏳ Computing ARITHMOS…', back: arithmosRes?.decoded ?? input, exact: !!arithmosRes?.exact, inTok: arithmosRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: arithmosRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: arithmosRes?.decoderPrompt ?? '', notes: arithmosRes ? `${arithmosRes.notes}; one-chat cost=${arithmosRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'daedalus': return { out: daedalusRes?.wire ?? '⏳ Computing DAEDALUS…', back: daedalusRes?.decoded ?? input, exact: !!daedalusRes?.exact, inTok: daedalusRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: daedalusRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: daedalusRes?.decoderPrompt ?? '', notes: daedalusRes ? `${daedalusRes.notes}; one-chat cost=${daedalusRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'orthos': return { out: orthosRes?.wire ?? '⏳ Computing ORTHOS…', back: orthosRes?.decoded ?? input, exact: !!orthosRes?.exact, inTok: orthosRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: orthosRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: orthosRes?.decoderPrompt ?? '', notes: orthosRes ? `${orthosRes.notes}; one-chat cost=${orthosRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'stentor': return { out: stentorRes?.wire ?? '⏳ Computing STENTOR…', back: stentorRes?.decoded ?? input, exact: !!stentorRes?.exact, inTok: stentorRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: stentorRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: stentorRes?.decoderPrompt ?? '', notes: stentorRes ? `${stentorRes.notes}; one-chat cost=${stentorRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'abacus': return { out: abacusRes?.wire ?? '⏳ Computing ABACUS…', back: abacusRes?.decoded ?? input, exact: !!abacusRes?.exact, inTok: abacusRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: abacusRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: abacusRes?.decoderPrompt ?? '', notes: abacusRes ? `${abacusRes.notes}; one-chat cost=${abacusRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'procrustes': return { out: procrustesRes?.wire ?? '⏳ Computing PROCRUSTES…', back: procrustesRes?.decoded ?? input, exact: !!procrustesRes?.exact, inTok: procrustesRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: procrustesRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: procrustesRes?.decoderPrompt ?? '', notes: procrustesRes ? `${procrustesRes.notes}; one-chat cost=${procrustesRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'circe': return { out: circeRes?.wire ?? '⏳ Computing CIRCE…', back: circeRes?.decoded ?? input, exact: !!circeRes?.exact, inTok: circeRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: circeRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: circeRes?.decoderPrompt ?? '', notes: circeRes ? `${circeRes.notes}; one-chat cost=${circeRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'chimera': return { out: chimeraRes?.wire ?? '⏳ Computing CHIMERA…', back: chimeraRes?.decoded ?? input, exact: !!chimeraRes?.exact, inTok: chimeraRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: chimeraRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: chimeraRes?.decoderPrompt ?? '', notes: chimeraRes ? `${chimeraRes.notes}; one-chat cost=${chimeraRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'caesura': return { out: caesuraRes?.wire ?? '⏳ Computing CAESURA…', back: caesuraRes?.decoded ?? input, exact: !!caesuraRes?.exact, inTok: caesuraRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: caesuraRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: caesuraRes?.decoderPrompt ?? '', notes: caesuraRes ? `${caesuraRes.notes}; one-chat cost=${caesuraRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'syntagma': return { out: syntagmaRes?.wire ?? '⏳ Computing SYNTAGMA…', back: syntagmaRes?.decoded ?? input, exact: !!syntagmaRes?.exact, inTok: syntagmaRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: syntagmaRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: syntagmaRes?.decoderPrompt ?? '', notes: syntagmaRes ? `${syntagmaRes.notes}; one-chat cost=${syntagmaRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'prosopon': return { out: prosoponRes?.wire ?? '⏳ Computing PROSOPON…', back: prosoponRes?.decoded ?? input, exact: !!prosoponRes?.exact, inTok: prosoponRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: prosoponRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: prosoponRes?.decoderPrompt ?? '', notes: prosoponRes ? `${prosoponRes.notes}; one-chat cost=${prosoponRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'epistle': return { out: epistleRes?.wire ?? '⏳ Computing EPISTLE…', back: epistleRes?.decoded ?? input, exact: !!epistleRes?.exact, inTok: epistleRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: epistleRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: epistleRes?.decoderPrompt ?? '', notes: epistleRes ? `${epistleRes.notes}; one-chat cost=${epistleRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'palimpsest': return { out: palimpsestRes?.wire ?? '⏳ Computing PALIMPSEST…', back: palimpsestRes?.decoded ?? input, exact: !!palimpsestRes?.exact, inTok: palimpsestRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: palimpsestRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: palimpsestRes?.decoderPrompt ?? '', notes: palimpsestRes ? `${palimpsestRes.notes}; one-chat cost=${palimpsestRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'thoth': return { out: thothRes?.wire ?? '⏳ Computing THOTH…', back: thothRes?.decoded ?? input, exact: !!thothRes?.exact, inTok: thothRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: thothRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: thothRes?.decoderPrompt ?? '', notes: thothRes ? `${thothRes.notes}; one-chat cost=${thothRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'sequoyah': return { out: sequoyahRes?.wire ?? '⏳ Computing SEQUOYAH…', back: sequoyahRes?.decoded ?? input, exact: !!sequoyahRes?.exact, inTok: sequoyahRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: sequoyahRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: sequoyahRes?.decoderPrompt ?? '', notes: sequoyahRes ? `${sequoyahRes.notes}; one-chat cost=${sequoyahRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'sibyl': return { out: sibylRes?.wire ?? '⏳ Computing SIBYL…', back: sibylRes?.decoded ?? input, exact: !!sibylRes?.exact, inTok: sibylRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: sibylRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: sibylRes?.decoderPrompt ?? '', notes: sibylRes ? `${sibylRes.notes}; one-chat cost=${sibylRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'ariadne': return { out: ariadneRes?.wire ?? '⏳ Computing ARIADNE…', back: ariadneRes?.decoded ?? input, exact: !!ariadneRes?.exact, inTok: ariadneRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: ariadneRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: ariadneRes?.decoderPrompt ?? '', notes: ariadneRes ? `${ariadneRes.notes}; one-chat cost=${ariadneRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'chiron': return { out: chironRes?.wire ?? '⏳ Computing CHIRON…', back: chironRes?.decoded ?? input, exact: !!chironRes?.exact, inTok: chironRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: chironRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: chironRes?.decoderPrompt ?? '', notes: chironRes ? `${chironRes.notes}; one-chat cost=${chironRes.messageTokens} tokens` : 'Computing in codec worker…' };
      case 'hermesContract': return { out: hermesContractRes?.wire ?? '⏳ Computing HERMES-C…', back: hermesContractRes?.decoded ?? input, exact: !!hermesContractRes?.exact, inTok: hermesContractRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: hermesContractRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: hermesContractRes?.decoderPrompt ?? '', notes: hermesContractRes ? `${hermesContractRes.notes}; one-chat cost=${hermesContractRes.oneChatTokens} tokens` : 'Computing in codec worker…' };
      case 'khoros': return { out: khorosRes?.wire ?? '⏳ Computing KHOROS…', back: khorosRes?.decoded ?? input, exact: !!khorosRes?.exact, inTok: khorosRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: khorosRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: KHOROS_SYSTEM_PROMPT, notes: khorosRes?.notes ?? '' };
      case 'omni': return { out: omniRes?.wire ?? '⏳ Computing OMNI…', back: omniRes?.decoded ?? input, exact: !!omniRes?.exact, inTok: omniRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: omniRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: OMNI_SYSTEM_PROMPT, notes: omniRes?.notes ?? '' };
      case 'genesis': return { out: genesisRes?.wire ?? '⏳ Computing GENESIS…', back: genesisRes?.decoded ?? input, exact: !!genesisRes?.exact, inTok: genesisRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: genesisRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: GENESIS_SYSTEM_PROMPT, notes: genesisRes?.notes ?? '' };
      case 'arche': return { out: archeRes?.wire ?? '⏳ Computing ARCHE…', back: archeRes?.decoded ?? input, exact: !!archeRes?.exact, inTok: archeRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: archeRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: ARCHE_SYSTEM_PROMPT, notes: archeRes?.notes ?? '' };
      case 'telos': return { out: telosRes?.wire ?? '⏳ Computing TELOS…', back: telosRes?.decoded ?? input, exact: !!telosRes?.exact, inTok: telosRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: telosRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: TELOS_SYSTEM_PROMPT, notes: telosRes?.notes ?? '' };
      case 'pantheon': return { out: pantheonRes?.wire ?? '⏳ Computing PANTHEON…', back: pantheonRes?.decoded ?? input, exact: !!pantheonRes?.exact, inTok: pantheonRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: pantheonRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: PANTHEON_SYSTEM_PROMPT, notes: pantheonRes?.notes ?? '' };
      case 'apeiron': return { out: apeironRes?.wire ?? '⏳ Computing APEIRON…', back: apeironRes?.decoded ?? input, exact: !!apeironRes?.exact, inTok: apeironRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: apeironRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: APEIRON_SYSTEM_PROMPT, notes: apeironRes?.notes ?? '' };
      case 'noesis': return { out: noesisRes?.wire ?? '⏳ Computing NOESIS…', back: noesisRes?.decoded ?? input, exact: !!noesisRes?.exact, inTok: noesisRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: noesisRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: NOESIS_SYSTEM_PROMPT, notes: noesisRes?.notes ?? '' };
      case 'synapse': return { out: synapseRes?.wire ?? '⏳ Computing SYNAPSE…', back: synapseRes?.decoded ?? input, exact: !!synapseRes?.exact, inTok: synapseRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: synapseRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: SYNAPSE_SYSTEM_PROMPT, notes: synapseRes?.notes ?? '' };
      case 'panacea': return { out: panaceaRes?.wire ?? '⏳ Computing PANACEA…', back: panaceaRes?.decoded ?? input, exact: !!panaceaRes?.exact, inTok: panaceaRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: panaceaRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: PANACEA_SYSTEM_PROMPT, notes: panaceaRes?.notes ?? '' };
      case 'aether': return { out: aetherRes?.wire ?? '⏳ Computing AETHER…', back: aetherRes?.decoded ?? input, exact: !!aetherRes?.exact, inTok: aetherRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: aetherRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: AETHER_SYSTEM_PROMPT, notes: aetherRes?.notes ?? '' };
      case 'harmonia': return { out: harmoniaRes?.wire ?? '⏳ Computing HARMONIA…', back: harmoniaRes?.decoded ?? input, exact: !!harmoniaRes?.exact, inTok: harmoniaRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: harmoniaRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: HARMONIA_SYSTEM_PROMPT, notes: harmoniaRes?.notes ?? '' };
      case 'eclipse': return { out: eclipseRes?.wire ?? '⏳ Computing ECLIPSE…', back: eclipseRes?.decoded ?? input, exact: !!eclipseRes?.exact, inTok: eclipseRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: eclipseRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: eclipseRes?.contractPrompt ?? '', notes: eclipseRes?.notes ?? '' };
      case 'zenith': return { out: zenithRes?.wire ?? '⏳ Computing ZENITH…', back: zenithRes?.decoded ?? input, exact: !!zenithRes?.exact, inTok: zenithRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: zenithRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: zenithDecoderPrompt(zenithRes), notes: zenithRes?.notes ?? '' };
      case 'kernel': return { out: kernelRes?.wire ?? '⏳ Computing KERNEL…', back: kernelRes?.decoded ?? input, exact: !!kernelRes?.exact, inTok: kernelRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: kernelRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: kernelDecoderPrompt(kernelRes), notes: kernelRes?.notes ?? '' };
      case 'iris': return { out: irisRes?.wire ?? '⏳ Computing IRIS…', back: irisRes?.decoded ?? input, exact: !!irisRes?.exact, inTok: irisRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: irisRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: irisDecoderPrompt(irisRes), notes: irisRes?.notes ?? '' };
      case 'crown': return { out: crownRes?.wire ?? '⏳ Computing CROWN…', back: crownRes?.decoded ?? input, exact: !!crownRes?.exact, inTok: crownRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: crownRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: crownDecoderPrompt(crownRes), notes: crownRes?.notes ?? '' };
      case 'aurora': return { out: auroraRes?.wire ?? '⏳ Computing AURORA…', back: auroraRes?.decoded ?? input, exact: !!auroraRes?.exact, inTok: auroraRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: auroraRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: auroraDecoderPrompt(auroraRes), notes: auroraRes?.notes ?? '' };
      case 'atlas': return { out: atlasRes?.wire ?? '⏳ Computing ATLAS…', back: atlasRes?.decoded ?? input, exact: !!atlasRes?.exact, inTok: atlasRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: atlasRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: atlasDecoderPrompt(atlasRes), notes: atlasRes?.notes ?? '' };
      case 'mosaic': return { out: mosaicRes?.wire ?? '⏳ Computing MOSAIC…', back: mosaicRes?.decoded ?? input, exact: !!mosaicRes?.exact, inTok: mosaicRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: mosaicRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: mosaicDecoderPrompt(mosaicRes), notes: mosaicRes?.notes ?? '' };
      case 'signet': return { out: signetRes?.wire ?? '⏳ Computing SIGNET…', back: signetRes?.decoded ?? input, exact: !!signetRes?.exact, inTok: signetRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: signetRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: SIGNET_SYSTEM_PROMPT, notes: signetRes?.notes ?? '' };
      case 'rosetta': return { out: rosettaRes?.wire ?? '⏳ Computing ROSETTA…', back: rosettaRes?.decoded ?? input, exact: !!rosettaRes?.exact, inTok: rosettaRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: rosettaRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: ROSETTA_SYSTEM_PROMPT, notes: rosettaRes?.notes ?? '' };
      case 'kappa': return { out: kappaRes?.wire ?? '⏳ Computing KAPPA…', back: kappaRes?.decoded ?? input, exact: !!kappaRes?.exact, inTok: kappaRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: kappaRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: KAPPA_SYSTEM_PROMPT, notes: kappaRes?.notes ?? '' };
      case 'phrase': return { out: phraseRes?.wire ?? '⏳ Computing PHRASEBOOK…', back: phraseRes?.decoded ?? input, exact: !!phraseRes?.exact, inTok: phraseRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: phraseRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: PHRASE_SYSTEM_PROMPT, notes: phraseRes?.notes ?? '' };
      case 'tau': return { out: tauRes?.wire ?? '⏳ Computing TAU…', back: tauRes?.decoded ?? input, exact: !!tauRes?.exact, inTok: tauRes?.inTokens ?? countTokens(input, 'o200k_base'), outTok: tauRes?.outTokens ?? countTokens(input, 'o200k_base'), preamble: TAU_SYSTEM_PROMPT, notes: tauRes?.notes ?? '' };
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
  }, [codec, input, lossless, omegaXiRes, omegaE8Res, ltpRes, promRes, zetaRes, janusRes, sigmaRes, stencilRes, chronosRes, caRes, nexusRes, mnemeRes, mnemeNexusRes, apexRes, veritasRes, quasarRes, helixRes, meridianRes, plexusRes, pulseRes, anaphoraRes, axiomRes, orbitRes, tesseraRes, strataRes, signetRes, harmoniaRes, aetherRes, panaceaRes, synapseRes, noesisRes, apeironRes, pantheonRes, telosRes, archeRes, genesisRes, omniRes, khorosRes, rosettaRes, kappaRes, phraseRes, tauRes, mosaicRes, atlasRes, auroraRes, crownRes, irisRes, kernelRes, zenithRes, eclipseRes, cavemanDefault, dragiFull, wenyan, composite, dragiScale, ordos, asg, ast, noether, holographic, caveHolo, ibCaveHolo, advancedPreset, cavemanLevel, mnemeDict, hermesContractRes, chironRes, ariadneRes, sibylRes, sequoyahRes, thothRes, palimpsestRes, daedalusRes, orthosRes, stentorRes, abacusRes, procrustesRes, circeRes, chimeraRes, caesuraRes, syntagmaRes, prosoponRes, epistleRes]);

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
    if (metatronRes?.exact) out.push({ key:'metatron', label:LABEL.metatron, exact:true, inTokens:metatronRes.inTokens, outTokens:metatronRes.messageTokens, savingsPct:metatronRes.inTokens ? ((metatronRes.inTokens-metatronRes.messageTokens)/metatronRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`winner=${metatronRes.winner}; ${metatronRes.notes}` });
    if (stoicheiaRes?.exact && stoicheiaRes.applied) out.push({ key:'stoicheia', label:LABEL.stoicheia, exact:true, inTokens:stoicheiaRes.inTokens, outTokens:stoicheiaRes.messageTokens, savingsPct:stoicheiaRes.inTokens ? ((stoicheiaRes.inTokens-stoicheiaRes.messageTokens)/stoicheiaRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`wire=${stoicheiaRes.outTokens}; applied=${stoicheiaRes.applied}; ${stoicheiaRes.spans} styled span(s) restored across ${Object.keys(stoicheiaRes.familyCounts).length} alphabet family(ies)` });
    if (vexillaRes?.exact && vexillaRes.applied) out.push({ key:'vexilla', label:LABEL.vexilla, exact:true, inTokens:vexillaRes.inTokens, outTokens:vexillaRes.messageTokens, savingsPct:vexillaRes.inTokens ? ((vexillaRes.inTokens-vexillaRes.messageTokens)/vexillaRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`wire=${vexillaRes.outTokens}; applied=${vexillaRes.applied}; ${vexillaRes.regionSpans} regional-flag run(s) + ${vexillaRes.tagSpans} tag flag(s) restored` });
    if (epistemeRes?.exact) out.push({ key:'episteme', label:LABEL.episteme, exact:true, inTokens:epistemeRes.inTokens, outTokens:epistemeRes.messageTokens, savingsPct:epistemeRes.inTokens ? ((epistemeRes.inTokens-epistemeRes.messageTokens)/epistemeRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`winner=${epistemeRes.winner}; ${epistemeRes.notes}` });
    if (panoptesRes?.exact) out.push({ key:'panoptes', label:LABEL.panoptes, exact:true, inTokens:panoptesRes.inTokens, outTokens:panoptesRes.messageTokens, savingsPct:panoptesRes.inTokens ? ((panoptesRes.inTokens-panoptesRes.messageTokens)/panoptesRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`winner=${panoptesRes.panoptesWinner}; applied=${panoptesRes.panoptesApplied}; stages=${panoptesRes.panoptesStagesFired}; ${panoptesRes.notes}` });
    if (kallosRes?.exact) out.push({ key:'kallos', label:LABEL.kallos, exact:true, inTokens:kallosRes.inTokens, outTokens:kallosRes.messageTokens, savingsPct:kallosRes.inTokens ? ((kallosRes.inTokens-kallosRes.messageTokens)/kallosRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`wire=${kallosRes.outTokens}; applied=${kallosRes.kallosApplied}; ${kallosRes.kallosSpans} math/styled span(s) canonicalized` });
    if (arithmosRes?.exact) out.push({ key:'arithmos', label:LABEL.arithmos, exact:true, inTokens:arithmosRes.inTokens, outTokens:arithmosRes.messageTokens, savingsPct:arithmosRes.inTokens ? ((arithmosRes.inTokens-arithmosRes.messageTokens)/arithmosRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`wire=${arithmosRes.outTokens}; applied=${arithmosRes.arithmosApplied}; ${arithmosRes.arithmosSpans} span(s) canonicalized` });
    if (khorosRes?.exact) out.push({ key:'khoros', label:'⟁ KHOROS (Terminal Sovereign Leader)', exact:true, inTokens:khorosRes.inTokens, outTokens:khorosRes.outTokens, savingsPct:khorosRes.savingsPct, fidelityPct:100, safety:'High', notes:khorosRes.notes });
    if (omniRes?.exact) out.push({ key:'omni', label:'⟁ OMNI (Terminal Sovereign)', exact:true, inTokens:omniRes.inTokens, outTokens:omniRes.outTokens, savingsPct:omniRes.savingsPct, fidelityPct:100, safety:'High', notes:omniRes.notes });
    if (genesisRes?.exact) out.push({ key:'genesis', label:'⟁ GENESIS (Terminal Sovereign)', exact:true, inTokens:genesisRes.inTokens, outTokens:genesisRes.outTokens, savingsPct:genesisRes.savingsPct, fidelityPct:100, safety:'High', notes:genesisRes.notes });
    if (archeRes?.exact) out.push({ key:'arche', label:'⟁ ARCHE (Terminal Sovereign)', exact:true, inTokens:archeRes.inTokens, outTokens:archeRes.outTokens, savingsPct:archeRes.savingsPct, fidelityPct:100, safety:'High', notes:archeRes.notes });
    if (telosRes?.exact) out.push({ key:'telos', label:'⟁ TELOS (Terminal Sovereign)', exact:true, inTokens:telosRes.inTokens, outTokens:telosRes.outTokens, savingsPct:telosRes.savingsPct, fidelityPct:100, safety:'High', notes:telosRes.notes });
    if (pantheonRes?.exact) out.push({ key:'pantheon', label:'⟁ PANTHEON (Terminal Sovereign Leader)', exact:true, inTokens:pantheonRes.inTokens, outTokens:pantheonRes.outTokens, savingsPct:pantheonRes.savingsPct, fidelityPct:100, safety:'High', notes:pantheonRes.notes });
    if (apeironRes?.exact) out.push({ key:'apeiron', label:'⟁ APEIRON (Terminal Boundless Leader)', exact:true, inTokens:apeironRes.inTokens, outTokens:apeironRes.outTokens, savingsPct:apeironRes.savingsPct, fidelityPct:100, safety:'High', notes:apeironRes.notes });
    if (noesisRes?.exact) out.push({ key:'noesis', label:'⟁ NOESIS (Terminal Absolute Leader)', exact:true, inTokens:noesisRes.inTokens, outTokens:noesisRes.outTokens, savingsPct:noesisRes.savingsPct, fidelityPct:100, safety:'High', notes:noesisRes.notes });
    if (synapseRes?.exact) out.push({ key:'synapse', label:'⟁ SYNAPSE (Terminal Leader)', exact:true, inTokens:synapseRes.inTokens, outTokens:synapseRes.outTokens, savingsPct:synapseRes.savingsPct, fidelityPct:100, safety:'High', notes:synapseRes.notes });
    if (panaceaRes?.exact) out.push({ key:'panacea', label:'⟁ PANACEA (Terminal Codec)', exact:true, inTokens:panaceaRes.inTokens, outTokens:panaceaRes.outTokens, savingsPct:panaceaRes.savingsPct, fidelityPct:100, safety:'High', notes:panaceaRes.notes });
    if (aetherRes?.exact) out.push({ key:'aether', label:'⟁ AETHER (General Prose Leader)', exact:true, inTokens:aetherRes.inTokens, outTokens:aetherRes.outTokens, savingsPct:aetherRes.savingsPct, fidelityPct:100, safety:'High', notes:aetherRes.notes });
    if (harmoniaRes?.exact) out.push({ key:'harmonia', label:'⧢ HARMONIA (Pareto Leader)', exact:true, inTokens:harmoniaRes.inTokens, outTokens:harmoniaRes.outTokens, savingsPct:harmoniaRes.savingsPct, fidelityPct:100, safety:'High', notes:harmoniaRes.notes });
    if (apexRes?.exact && apexRes.outTokens <= apexRes.inTokens) out.push({ key:'apex', label:'Λ† APEX', exact:true, inTokens:apexRes.inTokens, outTokens:apexRes.outTokens, savingsPct:apexRes.savingsPct, fidelityPct:100, safety:'High', notes:apexRes.notes });
    if (daedalusRes?.exact) out.push({ key:'daedalus', label:LABEL.daedalus, exact:true, inTokens:daedalusRes.inTokens, outTokens:daedalusRes.messageTokens, savingsPct:daedalusRes.inTokens ? ((daedalusRes.inTokens-daedalusRes.messageTokens)/daedalusRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`wire=${daedalusRes.outTokens}; contract=${daedalusRes.contractTokens}; predicted ${daedalusRes.predictedArm}${daedalusRes.predictionHit?' (hit)':' (miss)'}; ${daedalusRes.armsRun} arm(s)` });
    if (orthosRes?.exact) out.push({ key:'orthos', label:LABEL.orthos, exact:true, inTokens:orthosRes.inTokens, outTokens:orthosRes.messageTokens, savingsPct:orthosRes.inTokens ? ((orthosRes.inTokens-orthosRes.messageTokens)/orthosRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`wire=${orthosRes.outTokens}; applied=${orthosRes.orthosApplied}; ${orthosRes.orthosChars} apostrophe(s) canonicalized` });
    if (stentorRes?.exact) out.push({ key:'stentor', label:LABEL.stentor, exact:true, inTokens:stentorRes.inTokens, outTokens:stentorRes.messageTokens, savingsPct:stentorRes.inTokens ? ((stentorRes.inTokens-stentorRes.messageTokens)/stentorRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`wire=${stentorRes.outTokens}; applied=${stentorRes.stentorApplied}; ${stentorRes.stentorChars} shouted char(s) canonicalized` });
    if (abacusRes?.exact) out.push({ key:'abacus', label:LABEL.abacus, exact:true, inTokens:abacusRes.inTokens, outTokens:abacusRes.messageTokens, savingsPct:abacusRes.inTokens ? ((abacusRes.inTokens-abacusRes.messageTokens)/abacusRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`wire=${abacusRes.outTokens}; applied=${abacusRes.abacusApplied}; ${abacusRes.abacusNumSpans} number span(s)/${abacusRes.abacusUniSpans} unicode cluster(s) canonicalized` });
    if (procrustesRes?.exact) out.push({ key:'procrustes', label:LABEL.procrustes, exact:true, inTokens:procrustesRes.inTokens, outTokens:procrustesRes.messageTokens, savingsPct:procrustesRes.inTokens ? ((procrustesRes.inTokens-procrustesRes.messageTokens)/procrustesRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`wire=${procrustesRes.outTokens}; applied=${procrustesRes.procrustesApplied}; ${procrustesRes.procrustesDestretchSpans} letter-spacing span(s)/${procrustesRes.procrustesDewideSpans} fullwidth span(s) canonicalized` });
    if (circeRes?.exact) out.push({ key:'circe', label:LABEL.circe, exact:true, inTokens:circeRes.inTokens, outTokens:circeRes.messageTokens, savingsPct:circeRes.inTokens ? ((circeRes.inTokens-circeRes.messageTokens)/circeRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`wire=${circeRes.outTokens}; applied=${circeRes.circeApplied}; ${circeRes.circeNamedSpans}n/${circeRes.circeDecSpans}d/${circeRes.circeHexSpans}h/${circeRes.circePctSpans}p span(s); invisibleGuard=${circeRes.circeInvisibleGuard}` });
    if (chimeraRes?.exact) out.push({ key:'chimera', label:LABEL.chimera, exact:true, inTokens:chimeraRes.inTokens, outTokens:chimeraRes.messageTokens, savingsPct:chimeraRes.inTokens ? ((chimeraRes.inTokens-chimeraRes.messageTokens)/chimeraRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`winner=${chimeraRes.chimeraWinner}; composedApplied=${chimeraRes.chimeraApplied}; stages=${chimeraRes.chimeraStagesFired}` });
    if (caesuraRes?.exact) out.push({ key:'caesura', label:LABEL.caesura, exact:true, inTokens:caesuraRes.inTokens, outTokens:caesuraRes.messageTokens, savingsPct:caesuraRes.inTokens ? ((caesuraRes.inTokens-caesuraRes.messageTokens)/caesuraRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`applied=${caesuraRes.caesuraApplied}; nbsp=${caesuraRes.caesuraNbspSpans}/narrow=${caesuraRes.caesuraNarrowSpans} span(s); dblSpace=${caesuraRes.caesuraDoubleSpace}` });
    if (syntagmaRes?.exact) out.push({ key:'syntagma', label:LABEL.syntagma, exact:true, inTokens:syntagmaRes.inTokens, outTokens:syntagmaRes.messageTokens, savingsPct:syntagmaRes.inTokens ? ((syntagmaRes.inTokens-syntagmaRes.messageTokens)/syntagmaRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`applied=${syntagmaRes.syntagmaApplied}; ${syntagmaRes.syntagmaSpans} span(s)/${syntagmaRes.syntagmaSyllables} syllable(s) recomposed` });
    if (prosoponRes?.exact) out.push({ key:'prosopon', label:LABEL.prosopon, exact:true, inTokens:prosoponRes.inTokens, outTokens:prosoponRes.messageTokens, savingsPct:prosoponRes.inTokens ? ((prosoponRes.inTokens-prosoponRes.messageTokens)/prosoponRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`applied=${prosoponRes.prosoponApplied}; ${prosoponRes.prosoponSpans} mojibake span(s) restored` });
    if (epistleRes?.exact) out.push({ key:'epistle', label:LABEL.epistle, exact:true, inTokens:epistleRes.inTokens, outTokens:epistleRes.messageTokens, savingsPct:epistleRes.inTokens ? ((epistleRes.inTokens-epistleRes.messageTokens)/epistleRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`applied=${epistleRes.epistleApplied}; ${epistleRes.epistleSpans} quoted-printable span(s) restored` });
    if (palimpsestRes?.exact) out.push({ key:'palimpsest', label:LABEL.palimpsest, exact:true, inTokens:palimpsestRes.inTokens, outTokens:palimpsestRes.messageTokens, savingsPct:palimpsestRes.inTokens ? ((palimpsestRes.inTokens-palimpsestRes.messageTokens)/palimpsestRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`wire=${palimpsestRes.outTokens}; contract=${palimpsestRes.contractTokens}; ${palimpsestRes.armsRun} arms, winner ${palimpsestRes.winningArm}; beat default by ${palimpsestRes.defaultM-palimpsestRes.messageTokens}` });
    if (thothRes?.exact) out.push({ key:'thoth', label:LABEL.thoth, exact:true, inTokens:thothRes.inTokens, outTokens:thothRes.messageTokens, savingsPct:thothRes.inTokens ? ((thothRes.inTokens-thothRes.messageTokens)/thothRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`wire=${thothRes.outTokens}; contract=${thothRes.contractTokens}; deterministic; ${thothRes.arms} arms; script=${thothRes.script}` });
    if (sequoyahRes?.exact) out.push({ key:'sequoyah', label:LABEL.sequoyah, exact:true, inTokens:sequoyahRes.inTokens, outTokens:sequoyahRes.messageTokens, savingsPct:sequoyahRes.inTokens ? ((sequoyahRes.inTokens-sequoyahRes.messageTokens)/sequoyahRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`wire=${sequoyahRes.outTokens}; contract=${sequoyahRes.contractTokens}; deterministic; script=${sequoyahRes.script}` });
    if (sibylRes?.exact) out.push({ key:'sibyl', label:LABEL.sibyl, exact:true, inTokens:sibylRes.inTokens, outTokens:sibylRes.messageTokens, savingsPct:sibylRes.inTokens ? ((sibylRes.inTokens-sibylRes.messageTokens)/sibylRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`wire=${sibylRes.outTokens}; contract=${sibylRes.contractTokens}; ${sibylRes.phraseRules} phrase + ${sibylRes.wordRules} single-token rules; script=${sibylRes.script}` });
    if (ariadneRes?.exact) out.push({ key:'ariadne', label:LABEL.ariadne, exact:true, inTokens:ariadneRes.inTokens, outTokens:ariadneRes.messageTokens, savingsPct:ariadneRes.inTokens ? ((ariadneRes.inTokens-ariadneRes.messageTokens)/ariadneRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`wire=${ariadneRes.outTokens}; contract=${ariadneRes.contractTokens}; script=${ariadneRes.script}; glyph-assignment saved ${ariadneRes.assignmentGain}` });
    if (chironRes?.exact) out.push({ key:'chiron', label:LABEL.chiron, exact:true, inTokens:chironRes.inTokens, outTokens:chironRes.messageTokens, savingsPct:chironRes.inTokens ? ((chironRes.inTokens-chironRes.messageTokens)/chironRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`wire=${chironRes.outTokens}; contract=${chironRes.contractTokens}; ops=${chironRes.ops.join(',') || 'identity'}; ${chironRes.rules} macros/${chironRes.blocks} blocks/${chironRes.lists} lists` });
    if (hermesContractRes?.exact) out.push({ key:'hermesContract', label:LABEL.hermesContract, exact:true, inTokens:hermesContractRes.inTokens, outTokens:hermesContractRes.oneChatTokens, savingsPct:hermesContractRes.inTokens ? ((hermesContractRes.inTokens-hermesContractRes.oneChatTokens)/hermesContractRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:`wire=${hermesContractRes.outTokens}; contract=${hermesContractRes.contractTokens}; ops=${hermesContractRes.operations.join(',') || 'identity'}` });
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
    if (eclipseRes?.exact && eclipseRes.deliveredTokens <= eclipseRes.inTokens) out.push({ key:'eclipse', label:'◐ ECLIPSE (delivered)', exact:true, inTokens:eclipseRes.inTokens, outTokens:eclipseRes.deliveredTokens, savingsPct:eclipseRes.inTokens ? ((eclipseRes.inTokens-eclipseRes.deliveredTokens)/eclipseRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:eclipseRes.notes });
    if (zenithRes?.exact && zenithRes.deliveredTokens <= zenithRes.inTokens) out.push({ key:'zenith', label:'☀ ZENITH (delivered)', exact:true, inTokens:zenithRes.inTokens, outTokens:zenithRes.deliveredTokens, savingsPct:zenithRes.inTokens ? ((zenithRes.inTokens-zenithRes.deliveredTokens)/zenithRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:zenithRes.notes });
    if (kernelRes?.exact && kernelRes.deliveredTokens <= kernelRes.inTokens) out.push({ key:'kernel', label:'⊙ KERNEL (delivered)', exact:true, inTokens:kernelRes.inTokens, outTokens:kernelRes.deliveredTokens, savingsPct:kernelRes.inTokens ? ((kernelRes.inTokens-kernelRes.deliveredTokens)/kernelRes.inTokens)*100 : 0, fidelityPct:100, safety:'High', notes:kernelRes.notes });
    if (signetRes?.exact && signetRes.outTokens <= signetRes.inTokens) out.push({ key:'signet', label:'⌗ SIGNET', exact:true, inTokens:signetRes.inTokens, outTokens:signetRes.outTokens, savingsPct:signetRes.savingsPct, fidelityPct:100, safety:'High', notes:signetRes.notes });
    if (tauRes?.exact && tauRes.applied) out.push({ key:'tau', label:'τ TAU', exact:true, inTokens:tauRes.inTokens, outTokens:tauRes.outTokens, savingsPct:tauRes.savingsPct, fidelityPct:100, safety:'High', notes:tauRes.notes });
    if (phraseRes?.exact && phraseRes.applied) out.push({ key:'phrase', label:'φ PHRASEBOOK', exact:true, inTokens:phraseRes.inTokens, outTokens:phraseRes.outTokens, savingsPct:phraseRes.savingsPct, fidelityPct:100, safety:'High', notes:phraseRes.notes });
    if (kappaRes?.exact && kappaRes.applied) out.push({ key:'kappa', label:'κ KAPPA', exact:true, inTokens:kappaRes.inTokens, outTokens:kappaRes.outTokens, savingsPct:kappaRes.savingsPct, fidelityPct:100, safety:'High', notes:kappaRes.notes });
    if (rosettaRes?.exact) out.push({ key:'rosetta', label:'𓋹 ROSETTA', exact:true, inTokens:rosettaRes.inTokens, outTokens:rosettaRes.outTokens, savingsPct:rosettaRes.savingsPct, fidelityPct:100, safety:'High', notes:rosettaRes.notes });
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
  }, [input, largeTextMode, apexRes, veritasRes, quasarRes, helixRes, meridianRes, plexusRes, pulseRes, anaphoraRes, axiomRes, orbitRes, tesseraRes, strataRes, signetRes, harmoniaRes, aetherRes, panaceaRes, synapseRes, noesisRes, apeironRes, pantheonRes, telosRes, archeRes, genesisRes, omniRes, khorosRes, rosettaRes, kappaRes, phraseRes, tauRes, mosaicRes, atlasRes, auroraRes, crownRes, irisRes, kernelRes, zenithRes, eclipseRes, eidolonRes, nexusRes, mnemeRes, mnemeNexusRes, zetaRes, promRes, ltpRes, sigmaRes, stencilRes, morphRes, omegaE8Res, omegaXiRes, chronosRes, caRes, janusRes, dragiFull, cavemanDefault, wenyan, composite, dragiScale, ordos, noether, holographic, caveHolo, ibCaveHolo, asg, ast, adv, hermesContractRes, chironRes, ariadneRes, sibylRes, sequoyahRes, thothRes, palimpsestRes, daedalusRes, orthosRes, stentorRes, abacusRes, procrustesRes, circeRes, chimeraRes, caesuraRes, syntagmaRes, prosoponRes, epistleRes, arithmosRes, kallosRes, panoptesRes, epistemeRes, metatronRes, stoicheiaRes, vexillaRes]);

  const selectedRow = rows.find((r) => r.key === codec);

  const exactRows = useMemo(() => rows.filter((r) => r.exact), [rows]);
  const optimalExactCodec = useMemo(() => {
    if (exactRows.length === 0) return null;
    // Sort by lowest wire/message outTokens (highest absolute compression)
    const sorted = [...exactRows].sort((a, b) => {
      if (a.outTokens !== b.outTokens) return a.outTokens - b.outTokens;
      return b.savingsPct - a.savingsPct;
    });
    const best = sorted[0];
    // Honest identity floor: never route to a codec whose delivered single-chat
    // cost exceeds sending the raw text unchanged. If nothing beats identity,
    // the raw input IS the optimal exact route.
    const inTok = best.inTokens;
    if (best.outTokens >= inTok) {
      return { key: 'identity', label: 'Identity (raw is already optimal)', exact: true, inTokens: inTok, outTokens: inTok, savingsPct: 0, fidelityPct: 100, safety: 'High' as const, notes: 'No exact codec beats the raw input on this text; sending it unchanged is optimal.' };
    }
    return best;
  }, [exactRows]);

  const isOptimal = optimalExactCodec ? codec === optimalExactCodec.key : false;

  const handleRouteOptimal = useCallback(() => {
    if (optimalExactCodec && optimalExactCodec.key !== 'identity') {
      setCodec(optimalExactCodec.key as CodecKey);
    }
  }, [optimalExactCodec]);

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

  const decoderIsInline = codec === 'hermesContract' || codec === 'chiron' || codec === 'ariadne' || codec === 'sibyl' || codec === 'sequoyah' || codec === 'thoth' || codec === 'palimpsest' || codec === 'daedalus' || codec === 'orthos' || codec === 'stentor' || codec === 'abacus' || codec === 'procrustes' || codec === 'circe' || codec === 'chimera' || codec === 'caesura' || codec === 'syntagma' || codec === 'prosopon' || codec === 'epistle' || codec === 'arithmos' || codec === 'kallos' || codec === 'panoptes' || codec === 'episteme' || codec === 'metatron' || codec === 'stoicheia' || codec === 'vexilla';
  const finalOut = includeDecoder ? (decoderIsInline ? selected.preamble : selected.preamble + '\n\n' + selected.out) : selected.out;
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

  const exactLane = ['metatron','stoicheia','vexilla','episteme','panoptes','kallos','arithmos','khoros','omni','genesis','arche','telos','pantheon','apeiron','noesis','synapse','panacea','aether','harmonia','rosetta','kappa','phrase','tau','eclipse','zenith','kernel','iris','crown','aurora','atlas','mosaic','signet','strata','tessera','axiom','orbit','anaphora','pulse','plexus','meridian','quasar','helixAp','veritasVx','apex','eidolon','nexus','mneme','losslessAscii','omegaXi','omegaE8','ltp','prometheus','zeta','janus','sigma','stencil','chronos','chronosArena','asgJson','astCode','hermesContract','chiron','ariadne','sibyl','sequoyah','thoth','palimpsest','daedalus','orthos','stentor','abacus','procrustes','circe','chimera','caesura','syntagma','prosopon','epistle'].includes(codec);

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

      {/* ⚡ Optimal Exact Lossless Codec Router */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-3 sm:px-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/30 text-base text-amber-400">⚡</span>
          <div>
            <div className="text-xs font-semibold text-slate-200">
              Optimal Exact Route: <span className="text-indigo-400 font-mono">{optimalExactCodec ? (LABEL[optimalExactCodec.key] || optimalExactCodec.label) : 'Evaluating…'}</span>
            </div>
            <div className="text-[11px] text-slate-400">
              {optimalExactCodec ? `${optimalExactCodec.outTokens} tok (${optimalExactCodec.savingsPct > 0 ? `+${optimalExactCodec.savingsPct.toFixed(1)}% savings` : '0% overhead'}) · byte-perfect lossless · zero decode tokens` : 'Analyzing token economics across all lanes…'}
            </div>
          </div>
        </div>
        <button
          onClick={handleRouteOptimal}
          disabled={!optimalExactCodec || isOptimal}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-2 shadow-md ${
            isOptimal
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default shadow-none'
              : 'bg-gradient-to-r from-amber-500 via-indigo-600 to-indigo-700 text-white hover:brightness-110 active:scale-95 shadow-indigo-900/30'
          }`}
          title={optimalExactCodec ? `Switch active view to ${optimalExactCodec.label}` : ''}
        >
          <span>{isOptimal ? '✓ OPTIMAL ACTIVE' : `⚡ ROUTE OPTIMAL (${optimalExactCodec ? optimalExactCodec.key.toUpperCase() : ''})`}</span>
        </button>
      </div>

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
                navigator.clipboard.writeText(finalOut).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                });
              }} disabled={!selected.out} className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-40">{copied ? 'Copied!' : 'Copy'}</button>
            </div>
          </div>
          <textarea readOnly value={finalOut} className="h-72 w-full resize-y rounded-2xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-sm leading-relaxed text-emerald-300 outline-none" />
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
                const isRowOptimal = optimalExactCodec?.key === r.key && r.exact;
                return (
                  <tr key={r.key} className={active ? 'bg-indigo-950/40 text-white' : 'text-slate-300 hover:bg-slate-800/30'}>
                    <td className="py-2 font-sans font-medium">
                      {r.label}
                      {active && <span className="ml-1.5 rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] text-indigo-300 font-mono">Active</span>}
                      {isRowOptimal && <span className="ml-1.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300 font-mono font-bold">⚡ Optimal</span>}
                    </td>
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
