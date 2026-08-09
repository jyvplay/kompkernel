// Neuralese DRAGI Mode — Beast-Card Semantic Skeleton Compression
//
// Source: decofan (Reddit r/LocalLLaMA, 2026)
// Project: 12D harness — turned 126MB / 33M tokens into 17.8MB / 4.7M token semantic map
//
// Core principle: "DRAGI is a universal 'beast card' — it can describe any 'beast'.
// ANY thing can be described as 'beast', including info beasts."
// A story or semantic load is a beast; every sub-element is also a beast.
//
// Two distinct outputs (the reddit post makes this clear):
//   Index D12   = find/fetch metadata (handle, status, byte count, markers)
//   DRAGI D12   = object-preserving compression (what the content MEANS)
//
// This module implements DRAGI-first D12 — semantic meaning compression, not index.
//
// Beast-card ontology:
//   eat  = what the content consumes / operates on
//   foe  = what the content fights / guards against
//   cont = constraints, laws, invariants, rules
//   flags = salient markers for retrieval
//
// The 5 DRAGI lenses (from decofan's framework):
//   DR   = the "beast" (the main entity / agent)
//   eat  = what DR consumes / processes
//   foe  = what DR opposes or protects against
//   cont = context / constraints / operational rules
//   flags = critical markers that must survive compression

export interface DragiCard {
  h: string;           // handle ID
  obj: string;         // one-line summary of what this beast IS
  DR: {
    eat: string;       // what this content processes/applies-to
    loc: string;       // operational domain/context
    ID: string;        // unique identity of this beast
    eater: string;     // the risk/failure mode if this beast acts wrong
  };
  foe: {
    beast: string;     // what failure looks like
    best: string;      // the ideal/correct state
    post: string;      // where the beast operates
    pest: string;      // the subtle attack vector / corruption path
  };
  cont: {
    law: string;       // the invariant rule
    roar: string;      // the mandatory enforcement
    war: string;       // the tension / trade-off
    wall: string;      // the hard boundary / constraint
  };
  flags: string[];     // salient markers for routing/retrieval
}

export interface DragiResult {
  output: string;       // the compact D12 block
  card: DragiCard;
  stats: {
    origLen: number;
    outLen: number;
    chrReduction: number;
    lossType: "Lossless semantic skeleton";
  };
  decoderPrompt: string;
}

let _handleCounter = 0;
function nextHandle(): string {
  return `H${(++_handleCounter).toString().padStart(7, "0")}`;
}

// High-frequency words not worth flagging
const COMMON_SKIP = new Set([
  "the","a","an","is","are","was","were","be","been","being","have","has","had",
  "do","does","did","will","would","could","should","may","might","must","shall",
  "can","need","it","this","that","these","those","they","them","their","we","our",
  "in","on","at","for","of","to","from","with","and","or","but","so","if","not",
  "because","since","although","however","therefore","thus","hence","also","too",
  "very","just","even","still","quite","really","only","then","there","here",
]);

// Extract salient conceptual markers from text
function extractFlags(text: string): string[] {
  const flags: string[] = [];

  // Detect negation/constraint markers first
  if (/\bnever|must not|cannot|prohibited|forbidden|required|mandatory\b/i.test(text)) {
    flags.push("!constraint");
  }
  if (/\balways|every time|all cases|invariant\b/i.test(text)) {
    flags.push("!invariant");
  }
  if (/\bcauses|leads to|results in|therefore|consequently\b/i.test(text)) {
    flags.push("!causal");
  }
  if (/\bwarning|error|fail|crash|bug|issue|problem\b/i.test(text)) {
    flags.push("!error-mode");
  }
  if (/\bif and only|iff\b/i.test(text)) {
    flags.push("!biconditional");
  }

  // Extract high-information content words (nouns/verbs, len>=5, not common)
  const contentWords = text
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, "").toLowerCase())
    .filter((w) => w.length >= 5 && !COMMON_SKIP.has(w));
  // Frequency count
  const freq = new Map<string, number>();
  for (const w of contentWords) freq.set(w, (freq.get(w) ?? 0) + 1);
  // Sort by frequency descending, take top 4
  const topWords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([w]) => w);
  flags.push(...topWords);

  return [...new Set(flags)].slice(0, 8);
}

// Build a semantic summary: strip stopwords, keep content words
function semanticObj(text: string, maxWords = 10): string {
  const words = text.split(/\s+/);
  const content = words.filter((w) => {
    const bare = w.replace(/[^a-zA-Z]/g, "").toLowerCase();
    return bare.length >= 3 && !COMMON_SKIP.has(bare);
  });
  return content.slice(0, maxWords).join(" ").replace(/[.!?,]+$/, "");
}

// Extract the semantic DR fields from text using linguistic heuristics
function extractDragiFields(text: string): Omit<DragiCard, "h"> {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const words = text.split(/\s+/).filter(Boolean);

  // obj: semantic summary — content words from first sentence
  const obj = semanticObj(sentences[0] ?? text, 10);

  // eat: content words from first 2 sentences
  const eatWords = semanticObj(sentences.slice(0, 2).join(" "), 6);

  // eater: What goes wrong? Look for failure/risk language
  const riskSentence = sentences.find((s) =>
    /fail|error|wrong|problem|issue|risk|danger|corrupt|break|crash|warn/i.test(s)
  ) ?? "semantic drift under aggressive compression";
  const eater = riskSentence.split(/\s+/).slice(0, 8).join(" ");

  // foe: What does this content oppose?
  const negSentence = sentences.find((s) =>
    /not|never|must|should not|without|prevent|avoid|protect/i.test(s)
  );
  const foeBeast = negSentence
    ? negSentence.split(/\s+/).slice(0, 6).join(" ")
    : "incorrect interpretation";

  // cont: What are the constraints/rules?
  const ruleSentence = sentences.find((s) =>
    /always|must|require|mandatory|invariant|rule|law|constraint|never remove/i.test(s)
  );
  const contLaw = ruleSentence
    ? ruleSentence.split(/\s+/).slice(0, 10).join(" ").replace(/[.!?]+$/, "")
    : "preserve semantic load fidelity";

  // loc: operational domain (first noun phrase after verb)
  const loc = text.match(/\b(compression|language|context|inference|system|model|data|code|text)\b/i)?.[1]
    ?? "semantic compression layer";

  return {
    obj,
    DR: {
      eat: eatWords || words.slice(0, 5).join(" "),
      loc,
      ID: obj.slice(0, 24),
      eater,
    },
    foe: {
      beast: foeBeast,
      best: "full meaning preserved in skeleton",
      post: "compressed text sent to downstream LLM",
      pest: "silent semantic loss during compression",
    },
    cont: {
      law: contLaw,
      roar: "DRAGI beast-card: mandatory structural preservation",
      war: "compression ratio vs. semantic fidelity",
      wall: "DR|flags must survive all transformations",
    },
    flags: extractFlags(text),
  };
}

// Render a DragiCard to compact D12 format (human-readable, LLM-parseable)
function renderD12(card: DragiCard): string {
  const lines: string[] = [];
  lines.push(`D12{`);
  lines.push(`  h:${card.h}`);
  lines.push(`  obj:"${card.obj}"`);
  lines.push(`  DR:{`);
  lines.push(`    eat:"${card.DR.eat}"`);
  lines.push(`    loc:"${card.DR.loc}"`);
  lines.push(`    ID:"${card.DR.ID}"`);
  lines.push(`    eater:"${card.DR.eater}"`);
  lines.push(`  }`);
  lines.push(`  foe:{`);
  lines.push(`    beast:"${card.foe.beast}"`);
  lines.push(`    best:"${card.foe.best}"`);
  lines.push(`    post:"${card.foe.post}"`);
  lines.push(`    pest:"${card.foe.pest}"`);
  lines.push(`  }`);
  lines.push(`  cont:{`);
  lines.push(`    law:"${card.cont.law}"`);
  lines.push(`    roar:"${card.cont.roar}"`);
  lines.push(`    war:"${card.cont.war}"`);
  lines.push(`    wall:"${card.cont.wall}"`);
  lines.push(`  }`);
  lines.push(`  flags:[${card.flags.map((f) => `"${f}"`).join(",")}]`);
  lines.push(`  fetch_key:${card.h}`);
  lines.push(`}`);
  return lines.join("\n");
}

export function compressDragi(text: string): DragiResult {
  const fields = extractDragiFields(text);
  const handle = nextHandle();
  const card: DragiCard = { h: handle, ...fields };
  const output = renderD12(card);
  const origLen = text.length;
  const outLen = output.length;
  const chrReduction = origLen ? Math.round(((origLen - outLen) / origLen) * 100) : 0;

  const decoderPrompt = `# DRAGI D12 Decoder
You receive a beast-card in D12 format (DRAGI semantic skeleton ontology).
Fields:
  obj    = what the beast IS (core identity/purpose)
  DR.eat = what it processes/consumes
  DR.loc = operational domain
  DR.eater = failure mode if misused
  foe.beast = what it opposes
  foe.pest  = subtle corruption path to guard against
  cont.law  = invariant rule that must hold
  cont.wall = hard boundary/constraint
  flags  = critical salient markers

Reconstruct the original semantic content. Preserve all meaning. Do not invent.
Use obj + DR.eat + cont.law + flags as primary reconstruction anchors.

D12 INPUT:`;

  return {
    output,
    card,
    stats: {
      origLen,
      outLen,
      chrReduction,
      lossType: "Lossless semantic skeleton",
    },
    decoderPrompt,
  };
}
