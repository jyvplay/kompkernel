/**
 * src/lib/omega/codec-map.ts
 * =============================================================================
 * COMPREHENSIVE TAXONOMY MAP & FLOW ANALYSIS OF ALL CODECS IN THIS REPOSITORY
 * =============================================================================
 */

export interface CodecDefinition {
  id: string;
  symbol: string;
  name: string;
  family: 'SLP_GRAMMAR' | 'STRUCTURAL_COLUMNAR' | 'BPE_REALIGNMENT' | 'TOURNAMENT_ENSEMBLE' | 'DUPLEX_RESIDUAL' | 'FACTORADIX' | 'CONTEXT_MIXING' | 'FRAGMENT_MOTIF';
  description: string;
  flowsFrom: string[];
  flowsTo: string[];
}

export const SYSTEM_CODEC_MAP: CodecDefinition[] = [
  // Tournament & Ensemble Leaders
  {
    id: 'cadmus',
    symbol: '⚔',
    name: 'CADMUS-Ω',
    family: 'TOURNAMENT_ENSEMBLE',
    description: 'Audited portfolio selector routing across Rosetta, Harmonia, Aether, and specialized family solvers.',
    flowsFrom: ['raw_input'],
    flowsTo: ['rosetta', 'harmonia', 'aether', 'panacea'],
  },
  {
    id: 'rosetta',
    symbol: '𓋹',
    name: 'ROSETTA-R5.6',
    family: 'TOURNAMENT_ENSEMBLE',
    description: 'Tournament engine integrating compact E spans, A heads, Meridian-M1 restoration, prompt-native templates, and OPS-1 lexeme modes.',
    flowsFrom: ['cadmus', 'crown'],
    flowsTo: ['mosaic', 'kappa', 'tau', 'phrase', 'lattice', 'strand', 'valence', 'kinetic'],
  },
  {
    id: 'crown',
    symbol: '♛',
    name: 'CROWN-C1',
    family: 'TOURNAMENT_ENSEMBLE',
    description: 'Ensemble voting decoder and multi-codec candidate builder.',
    flowsFrom: ['rosetta', 'atlas', 'aurora'],
    flowsTo: ['exact_output'],
  },

  // Structural & Columnar Codecs
  {
    id: 'mosaic',
    symbol: '▦',
    name: 'MOSAIC-M1',
    family: 'STRUCTURAL_COLUMNAR',
    description: 'Sub-span pre-filtering and lane scope separation for repeating columnar structures.',
    flowsFrom: ['rosetta'],
    flowsTo: ['kappa', 'strata'],
  },
  {
    id: 'kappa',
    symbol: 'κ',
    name: 'KAPPA-κ1',
    family: 'STRUCTURAL_COLUMNAR',
    description: 'Token memoization and costCache parameterized repeat factorization using ⋄ holes.',
    flowsFrom: ['mosaic', 'rosetta'],
    flowsTo: ['crown'],
  },
  {
    id: 'tau',
    symbol: 'τ',
    name: 'TAU-τ1',
    family: 'STRUCTURAL_COLUMNAR',
    description: 'Markdown table, pipe delimiter, and YAML block structural factorizer.',
    flowsFrom: ['rosetta'],
    flowsTo: ['crown'],
  },

  // Straight-Line Grammar & SLP Codecs
  {
    id: 'logos',
    symbol: 'Ω',
    name: 'LOGOS-Ω',
    family: 'SLP_GRAMMAR',
    description: 'Self-referential lexicon frontier context-free grammar induction.',
    flowsFrom: ['cadmus'],
    flowsTo: ['proteus', 'metis'],
  },
  {
    id: 'proteus',
    symbol: '⬥',
    name: 'PROTEUS-Ω',
    family: 'SLP_GRAMMAR',
    description: 'Adaptive grammar frontier with dynamic non-terminal expansion.',
    flowsFrom: ['logos'],
    flowsTo: ['themis'],
  },

  // BPE Boundary Realignment & CJK
  {
    id: 'phrase',
    symbol: 'φ',
    name: 'PHRASEBOOK-φ1',
    family: 'BPE_REALIGNMENT',
    description: 'Single-token Katakana IT loanwords and CJK technical terms contractive dictionary.',
    flowsFrom: ['rosetta'],
    flowsTo: ['crown'],
  },
  {
    id: 'kinetic',
    symbol: '⚡',
    name: 'KINETIC-K8',
    family: 'BPE_REALIGNMENT',
    description: 'Phase-space flow contraction eliminating sub-word BPE token fragmentation.',
    flowsFrom: ['rosetta'],
    flowsTo: ['zero', 'orion'],
  },

  // Duplex & Residual Codecs
  {
    id: 'eidolon',
    symbol: '👁',
    name: 'EIDOLON-E1',
    family: 'DUPLEX_RESIDUAL',
    description: 'Projected natural prose residual predictor optimizing BPE bounds on continuous text.',
    flowsFrom: ['cadmus'],
    flowsTo: ['ltp'],
  },
  {
    id: 'omegaXi',
    symbol: 'Ω-Ξ',
    name: 'OMEGA-Ξ ATOM',
    family: 'DUPLEX_RESIDUAL',
    description: 'Context mixing with warm prior binary transport layer.',
    flowsFrom: ['raw_input'],
    flowsTo: ['exact_output'],
  },
];

export const UNEXPLORED_STACK_GAPS = [
  {
    gapId: 'GAP-1',
    name: 'Dynamic In-Context N-Gram Entropy Pools',
    description: 'Online single-pass n-gram dictionary synthesis that emits temporary single-token mappings in prompt headers for unseen domains.',
    targetCategories: ['natural-prose-literary', 'natural-prose-technical', 'natural-prose-essay'],
    expectedImpact: '15% - 25% additional wire token reduction on non-repeating natural text.',
  },
  {
    gapId: 'GAP-2',
    name: 'Cross-Document SLP Graph Transduction',
    description: 'Hypergraph grammar induction operating across multi-turn prompt trajectories and conversation histories.',
    targetCategories: ['prompt-log-agent-trajectory', 'prompt-log-reasoning-trace', 'agent-turn'],
    expectedImpact: '30% - 40% reduction on long LLM reasoning traces.',
  },
  {
    gapId: 'GAP-3',
    name: 'Sub-Byte Hybrid Code-Prose Realignment',
    description: 'Joint tokenization boundary realigner specifically designed for Markdown documents containing embedded Python/TypeScript/JSON code blocks.',
    targetCategories: ['hybrid-prose-markdown', 'hybrid-prose-apispec'],
    expectedImpact: '10% - 20% wire token reduction on hybrid documents.',
  },
];
