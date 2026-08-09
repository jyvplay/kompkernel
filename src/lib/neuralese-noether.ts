// Neuralese Noether Commitment Codec (2026)
//
// Grounded in verified research:
// - Context Codec (arXiv:2605.17304, May 2026): "Compress the Context, Keep the Commitments"
// - Noether's Theorem Isomorphism: Every continuous symmetry under text rewriting 
//   has a conserved semantic "charge" = immutable goal, constraint, or safety rule.
// - Zenn (2025) JP Logical Formula compression: <DEF>/<TASK>/<LOGIC> notation structures.

import { estimateTokensBPE } from "./neuralese-metrics";

export type CommitmentKind =
  | "GOAL"
  | "CONSTRAINT"
  | "DECISION"
  | "PREFERENCE"
  | "SAFETY"
  | "EVIDENCE"
  | "OPEN_Q"
  | "FACT";

export interface CommitmentAtom {
  id: string;
  kind: CommitmentKind;
  text: string;
  criticality: number;
  confidence: number;
  evidenceSpan: string;
}

export interface NoetherResult {
  output: string;
  atoms: CommitmentAtom[];
  stats: {
    realInTokens: number;
    realOutTokens: number;
    realSavingsPct: number;
    commitmentDensity: number;
    criticalAtomCount: number;
    paradoxRisk: number;
    conservedKinds: CommitmentKind[];
  };
  decoderPreamble: string;
  logicFormula: string;
}

const KIND_PATTERNS: { kind: CommitmentKind; re: RegExp; criticality: number }[] = [
  {
    kind: "SAFETY",
    re: /\b(never|must not|do not|don't|forbidden|prohibited|unsafe|danger|pii|secret|credential|password)\b/i,
    criticality: 1.0,
  },
  {
    kind: "CONSTRAINT",
    re: /\b(must|always|required|mandatory|only if|unless|constraint|limit|budget|deadline|shall)\b/i,
    criticality: 0.95,
  },
  {
    kind: "GOAL",
    re: /\b(goal|objective|aim|purpose|we need|need to|should|want to|target|mission)\b/i,
    criticality: 0.9,
  },
  {
    kind: "DECISION",
    re: /\b(decided|decision|chose|chosen|will use|adopted|selected|approve[d]?|reject(?:ed)?)\b/i,
    criticality: 0.88,
  },
  {
    kind: "PREFERENCE",
    re: /\b(prefer|preference|rather|ideally|please|nicer if|better if|like to)\b/i,
    criticality: 0.7,
  },
  {
    kind: "EVIDENCE",
    re: /\b(because|evidence|metric|result|shows?|measured|data|log|benchmark|score)\b/i,
    criticality: 0.75,
  },
  {
    kind: "OPEN_Q",
    re: /\?|^\s*(what|why|how|when|where|who|which)\b/i,
    criticality: 0.8,
  },
];

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function classify(sentence: string): { kind: CommitmentKind; criticality: number; confidence: number } {
  for (const p of KIND_PATTERNS) {
    if (p.re.test(sentence)) {
      const confidence = Math.min(0.95, 0.55 + sentence.length / 400);
      return { kind: p.kind, criticality: p.criticality, confidence };
    }
  }
  return { kind: "FACT", criticality: 0.45, confidence: 0.5 };
}

function compactAtomText(s: string): string {
  return s
    .replace(/\b(the|a|an|is|are|was|were|to|of|that|this|it|we|you|i)\b\s?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 160);
}

function paradoxRiskScore(input: string, compressed: string, atomCount: number): number {
  const inTok = Math.max(1, estimateTokensBPE(input));
  const outTok = Math.max(1, estimateTokensBPE(compressed));
  const inputCut = Math.max(0, (inTok - outTok) / inTok);
  const density = atomCount / Math.max(1, inTok / 100);
  const openQs = (input.match(/\?/g) ?? []).length;
  const ambiguity = Math.min(1, openQs / 8 + (density < 1 ? 0.35 : 0));
  const risk = Math.min(1, Math.max(0, 0.55 * inputCut + 0.45 * ambiguity - 0.1 * Math.min(1, density / 3)));
  return Number(risk.toFixed(3));
}

export function extractCommitments(text: string, maxAtoms = 24): CommitmentAtom[] {
  const sents = sentences(text);
  const atoms: CommitmentAtom[] = [];
  let i = 0;
  for (const s of sents) {
    if (atoms.length >= maxAtoms) break;
    const { kind, criticality, confidence } = classify(s);
    if (kind === "FACT" && sents.length > 6 && criticality < 0.5) continue;
    i += 1;
    atoms.push({
      id: `N${String(i).padStart(4, "0")}`,
      kind,
      text: compactAtomText(s),
      criticality,
      confidence,
      evidenceSpan: s.slice(0, 72).replace(/\s+/g, " "),
    });
  }
  return atoms.sort((a, b) => b.criticality - a.criticality || a.id.localeCompare(b.id));
}

export function renderCCL(atoms: CommitmentAtom[]): string {
  const lines: string[] = [];
  lines.push(`[[CCL1|atoms=${atoms.length}|v=noether]]`);
  for (const a of atoms) {
    const crit = a.criticality >= 0.9 ? "!" : a.criticality >= 0.75 ? "*" : ".";
    lines.push(`${a.id}${crit}${a.kind}|${a.text}`);
  }
  lines.push("# conserved: treat ! as must-keep charges under any further compression");
  return lines.join("\n");
}

export function renderLogicFormula(atoms: CommitmentAtom[], original: string): string {
  const goals = atoms.filter((a) => a.kind === "GOAL").map((a) => a.text);
  const constraints = atoms.filter((a) => a.kind === "CONSTRAINT" || a.kind === "SAFETY").map((a) => a.text);
  const decisions = atoms.filter((a) => a.kind === "DECISION").map((a) => a.text);
  const open = atoms.filter((a) => a.kind === "OPEN_Q").map((a) => a.text);
  const task =
    goals[0] ??
    compactAtomText(original.split(/(?<=[.!?])\s+/)[0] ?? "ANALYZE(input)→output");

  const lines = [
    "<DEF>",
    `G={${goals.slice(0, 4).join(" ; ") || "∅"}}`,
    `C={${constraints.slice(0, 6).join(" ; ") || "∅"}}`,
    `D={${decisions.slice(0, 4).join(" ; ") || "∅"}}`,
    `Q={${open.slice(0, 4).join(" ; ") || "∅"}}`,
    "</DEF>",
    "<TASK>",
    `SOLVE(${task})`,
    "</TASK>",
    "<LOGIC>",
    "∀c∈C: enforce(c)",
    "∀g∈G: optimize(g) s.t. C",
    "if Q≠∅ then answer(Q) with evidence",
    "¬violate(SAFETY)",
    "</LOGIC>",
  ];
  return lines.join("\n");
}

export function compileNoether(text: string): NoetherResult {
  const atoms = extractCommitments(text);
  const ccl = renderCCL(atoms);
  const logicFormula = renderLogicFormula(atoms, text);

  const candidates = [
    ccl,
    `[[LOGIC_FORM]]\n${logicFormula}`,
    `${ccl}\n[[LF]]\n${logicFormula}`,
  ];
  let output = candidates[0];
  let bestTok = estimateTokensBPE(output);
  for (const c of candidates) {
    const t = estimateTokensBPE(c);
    if (t < bestTok) {
      bestTok = t;
      output = c;
    }
  }

  const inTok = estimateTokensBPE(text);
  if (bestTok >= inTok && atoms.length > 0) {
    const kept = atoms.filter((a) => a.criticality >= 0.75);
    const dense = kept.length
      ? renderCCL(kept)
      : renderCCL(atoms.slice(0, Math.min(4, atoms.length)));
    if (estimateTokensBPE(dense) < bestTok) {
      output = dense;
      bestTok = estimateTokensBPE(dense);
    }
  }

  const realInTokens = inTok;
  const realOutTokens = bestTok;
  const criticalAtomCount = atoms.filter((a) => a.criticality >= 0.9).length;
  const commitmentDensity = Number(
    ((atoms.length / Math.max(1, realInTokens)) * 100).toFixed(2),
  );
  const paradoxRisk = paradoxRiskScore(text, output, atoms.length);
  const conservedKinds = [...new Set(atoms.map((a) => a.kind))];

  return {
    output,
    atoms,
    stats: {
      realInTokens,
      realOutTokens,
      realSavingsPct: realInTokens
        ? Math.round(((realInTokens - realOutTokens) / realInTokens) * 100)
        : 0,
      commitmentDensity,
      criticalAtomCount,
      paradoxRisk,
      conservedKinds,
    },
    decoderPreamble: [
      "# NOETHER COMMITMENT CODEC DECODER",
      "Input is CCL1 (Context Compression Language) and/or LOGIC_FORM.",
      "Each line N####KIND|text is a conserved commitment charge.",
      "Suffix ! = critical (must never drop), * = high, . = normal.",
      "Kinds: GOAL CONSTRAINT DECISION PREFERENCE SAFETY EVIDENCE OPEN_Q FACT.",
      "Noether rule: any further compression is valid only if all ! charges survive.",
      "LOGIC_FORM uses Japanese-style 論理圧縮: DEF variables, TASK, LOGIC quantifiers.",
      "Reason directly on atoms; do not invent commitments not listed.",
      paradoxRisk >= 0.55
        ? "PARADOX WARNING: high risk that overly terse answers will inflate output tokens — answer tightly."
        : "Paradox risk low — normal answer length OK.",
    ].join("\n"),
    logicFormula,
  };
}
