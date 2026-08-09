// Neuralese Compiler — deterministic English-prose -> high-density LLM-readable
// notation engine. Pure, side-effect-free, fully client/server safe.
//
// Pipeline (order matters):
//   1. normalize whitespace
//   2. number-words -> digits          (opt: digits)
//   3. multiword phrase collapse       (level-gated)
//   4. logical/relational symbols      (opt: symbols, level-gated)
//   5. single-word abbreviation dict   (level-gated)
//   6. stopword / filler removal       (opt: dropStopwords, level-gated)
//   7. vowel-drop compression          (opt: dropVowels, max density)
//   8. sentence-joiner + casing + tidy

export type Density = 1 | 2 | 3;

export interface NeuraleseOptions {
  density: Density;
  symbols: boolean; // use math/logic glyphs (→ ∴ ∵ ∧ ∨ ¬ …)
  dropStopwords: boolean; // strip articles / auxiliaries / fillers
  dropVowels: boolean; // aggressive intra-word vowel elision
  digits: boolean; // "three" -> "3", "thousand" -> "k"
  lowercase: boolean; // fold case
  joinSentences: boolean; // "." -> ";" telegraphic stream
}

export interface NeuraleseStats {
  inChars: number;
  outChars: number;
  charDeltaPct: number; // % reduction (positive == smaller)
  inWords: number;
  outWords: number;
  inTokensEst: number; // ~chars/4 heuristic
  outTokensEst: number;
  tokenDeltaPct: number;
}

export interface NeuraleseResult {
  output: string;
  stats: NeuraleseStats;
}

export const PRESETS: Record<
  string,
  { label: string; hint: string; options: NeuraleseOptions }
> = {
  light: {
    label: "Light",
    hint: "Readable · light abbreviation, no symbols",
    options: {
      density: 1,
      symbols: false,
      dropStopwords: false,
      dropVowels: false,
      digits: true,
      lowercase: false,
      joinSentences: false,
    },
  },
  balanced: {
    label: "Balanced",
    hint: "Symbols + abbreviations + filler removal",
    options: {
      density: 2,
      symbols: true,
      dropStopwords: true,
      dropVowels: false,
      digits: true,
      lowercase: true,
      joinSentences: true,
    },
  },
  max: {
    label: "Max",
    hint: "Aggressive · telegraphic dense stream",
    options: {
      density: 3,
      symbols: true,
      dropStopwords: true,
      dropVowels: false,
      digits: true,
      lowercase: true,
      joinSentences: true,
    },
  },
  extreme: {
    label: "Extreme",
    hint: "Vowel-drop · maximum density (lossy)",
    options: {
      density: 3,
      symbols: true,
      dropStopwords: true,
      dropVowels: true,
      digits: true,
      lowercase: true,
      joinSentences: true,
    },
  },
};

interface Rule {
  re: RegExp;
  to: string;
  level: Density;
}

// Build a case-insensitive, word-boundary rule.
function w(src: string, to: string, level: Density): Rule {
  const escaped = src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return { re: new RegExp(`\\b${escaped}\\b`, "gi"), to, level };
}

// ---- 1. multiword phrases (longest first — applied before single words) ----
const PHRASES: Rule[] = [
  w("due to the fact that", "∵", 2),
  w("in order to", "to", 1),
  w("for the purpose of", "to", 2),
  w("with respect to", "re:", 2),
  w("with regard to", "re:", 2),
  w("in terms of", "re:", 2),
  w("as a result of", "∵", 2),
  w("as a result", "∴", 2),
  w("on the other hand", "⟂", 2),
  w("in addition to", "+", 2),
  w("in addition", "+", 2),
  w("as well as", "&", 1),
  w("such as", "e.g.", 1),
  w("for example", "e.g.", 1),
  w("for instance", "e.g.", 1),
  w("that is to say", "i.e.", 2),
  w("that is", "i.e.", 2),
  w("in other words", "i.e.", 2),
  w("a lot of", "many", 1),
  w("a number of", "many", 1),
  w("the majority of", "most", 1),
  w("at this point in time", "now", 2),
  w("at the present time", "now", 2),
  w("in the near future", "soon", 2),
  w("a large number of", "many", 1),
  w("if and only if", "⇔", 2),
  w("greater than or equal to", "≥", 2),
  w("less than or equal to", "≤", 2),
  w("greater than", ">", 2),
  w("more than", ">", 2),
  w("less than", "<", 2),
  w("fewer than", "<", 2),
  w("equal to", "=", 2),
  w("equals to", "=", 2),
  w("compared to", "vs", 2),
  w("compared with", "vs", 2),
  w("as opposed to", "vs", 2),
  w("leads to", "→", 2),
  w("results in", "→", 2),
  w("gives rise to", "→", 2),
  w("which causes", "→", 2),
  w("so that", "→", 2),
  w("in conclusion", "∴", 2),
  w("to summarize", "∴", 2),
  w("for all", "∀", 2),
  w("there exists", "∃", 2),
  w("there is", "∃", 3),
  w("there are", "∃", 3),
  w("note that", "!", 2),
  w("keep in mind that", "!", 2),
  w("it is important to note", "!", 2),
  w("kind of", "~", 2),
  w("sort of", "~", 2),
];

// ---- 2. logical / relational single-token symbols ----
const SYMBOLS: Rule[] = [
  w("therefore", "∴", 2),
  w("thus", "∴", 2),
  w("hence", "∴", 2),
  w("consequently", "∴", 2),
  w("because", "∵", 2),
  w("since", "∵", 2),
  w("approximately", "≈", 2),
  w("about", "~", 3),
  w("around", "~", 3),
  w("roughly", "~", 3),
  w("and", "&", 2),
  w("plus", "+", 2),
  w("or", "∨", 3),
  w("not", "¬", 3),
  w("versus", "vs", 2),
  w("increase", "↑", 3),
  w("increases", "↑", 3),
  w("increased", "↑", 3),
  w("rising", "↑", 3),
  w("decrease", "↓", 3),
  w("decreases", "↓", 3),
  w("decreased", "↓", 3),
  w("falling", "↓", 3),
  w("per", "/", 3),
  w("every", "∀", 3),
  w("each", "∀", 3),
  w("some", "∃", 3),
  w("percent", "%", 2),
  w("number", "#", 3),
  w("regarding", "re:", 2),
  w("between", "btw", 2),
];

// ---- 3. abbreviation dictionary (no-symbol shrink; safe at all densities) ---
const ABBREV: Rule[] = [
  w("information", "info", 1),
  w("application", "app", 1),
  w("applications", "apps", 1),
  w("development", "dev", 1),
  w("environment", "env", 1),
  w("environments", "envs", 1),
  w("configuration", "config", 1),
  w("implementation", "impl", 1),
  w("implementations", "impls", 1),
  w("function", "fn", 1),
  w("functions", "fns", 1),
  w("parameter", "param", 1),
  w("parameters", "params", 1),
  w("database", "db", 1),
  w("databases", "dbs", 1),
  w("requirement", "req", 1),
  w("requirements", "reqs", 1),
  w("documentation", "docs", 1),
  w("document", "doc", 1),
  w("management", "mgmt", 1),
  w("performance", "perf", 1),
  w("technology", "tech", 1),
  w("technologies", "techs", 1),
  w("maximum", "max", 1),
  w("minimum", "min", 1),
  w("average", "avg", 1),
  w("estimate", "est", 2),
  w("approximately", "approx", 1),
  w("versus", "vs", 1),
  w("with", "w/", 2),
  w("without", "w/o", 2),
  w("within", "w/in", 2),
  w("between", "btw", 2),
  w("through", "thru", 2),
  w("because", "bc", 1),
  w("architecture", "arch", 1),
  w("infrastructure", "infra", 1),
  w("repository", "repo", 1),
  w("repositories", "repos", 1),
  w("organization", "org", 1),
  w("organizations", "orgs", 1),
  w("specification", "spec", 1),
  w("specifications", "specs", 1),
  w("optimization", "opt", 1),
  w("communication", "comms", 1),
  w("temperature", "temp", 1),
  w("frequency", "freq", 1),
  w("reference", "ref", 1),
  w("references", "refs", 1),
  w("variable", "var", 1),
  w("variables", "vars", 1),
  w("previous", "prev", 2),
  w("current", "cur", 2),
  w("standard", "std", 2),
  w("example", "ex", 2),
  w("versions", "vers", 2),
  w("version", "ver", 2),
];

// ---- 4. number words -> digits ----
const NUMBERS: Rule[] = [
  w("zero", "0", 1),
  w("one", "1", 1),
  w("two", "2", 1),
  w("three", "3", 1),
  w("four", "4", 1),
  w("five", "5", 1),
  w("six", "6", 1),
  w("seven", "7", 1),
  w("eight", "8", 1),
  w("nine", "9", 1),
  w("ten", "10", 1),
  w("eleven", "11", 1),
  w("twelve", "12", 1),
  w("hundred", "00", 2),
  w("thousand", "k", 2),
  w("million", "M", 2),
  w("billion", "B", 2),
];

// ---- 5. stopwords / fillers to drop entirely ----
const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "very",
  "really",
  "quite",
  "just",
  "actually",
  "basically",
  "essentially",
  "simply",
  "literally",
  "definitely",
  "certainly",
  "probably",
  "perhaps",
  "maybe",
  "somewhat",
  "rather",
  "indeed",
  "of",
  "that",
  "which",
  "who",
  "whom",
  "then",
  "so",
  "well",
  "also",
  "too",
  "here",
  "there",
  "please",
  "kindly",
  "hereby",
]);

// words that should NOT be vowel-dropped (already short / meaningful)
function keepWhole(token: string): boolean {
  return token.length <= 5;
}

function dropVowelsWord(token: string): string {
  // preserve leading char, strip interior a/e/i/o/u, keep trailing consonants
  const head = token[0];
  const rest = token.slice(1).replace(/[aeiou]/gi, "");
  const out = head + rest;
  // guard against over-collapse producing empty tail
  return out.length >= 2 ? out : token;
}

function countWords(s: string): number {
  const m = s.trim().match(/\S+/g);
  return m ? m.length : 0;
}

function applyRules(text: string, rules: Rule[], density: Density): string {
  let out = text;
  for (const r of rules) {
    if (r.level <= density) out = out.replace(r.re, r.to);
  }
  return out;
}

export function convert(
  input: string,
  opts: NeuraleseOptions,
): NeuraleseResult {
  const inChars = input.length;
  const inWords = countWords(input);

  let t = input.replace(/\r\n/g, "\n");

  // 1. normalize inner whitespace but keep paragraph breaks
  t = t.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");

  // 2. numbers
  if (opts.digits) t = applyRules(t, NUMBERS, opts.density);

  // 3. multiword phrases first
  t = applyRules(t, PHRASES, opts.density);

  // 4. logical symbols
  if (opts.symbols) t = applyRules(t, SYMBOLS, opts.density);

  // 5. abbreviations
  t = applyRules(t, ABBREV, opts.density);

  // 6. stopword / filler removal
  if (opts.dropStopwords) {
    t = t
      .split("\n")
      .map((line) =>
        line
          .split(" ")
          .filter((tok) => {
            const bare = tok.replace(/[^\p{L}]/gu, "").toLowerCase();
            if (!bare) return true; // keep punctuation-only / symbol tokens
            return !STOPWORDS.has(bare);
          })
          .join(" "),
      )
      .join("\n");
  }

  // 7. vowel drop (lossy)
  if (opts.dropVowels) {
    t = t
      .split(/(\s+)/)
      .map((tok) => {
        if (/^\s+$/.test(tok)) return tok;
        const lead = tok.match(/^[^\p{L}]*/u)?.[0] ?? "";
        const trail = tok.match(/[^\p{L}]*$/u)?.[0] ?? "";
        const coreLen = tok.length - lead.length - trail.length;
        const core = tok.slice(lead.length, lead.length + coreLen);
        if (!core || keepWhole(core)) return tok;
        return lead + dropVowelsWord(core) + trail;
      })
      .join("");
  }

  // 8. sentence joiner + tidy
  if (opts.joinSentences) {
    t = t
      .replace(/\s*\.\s+/g, "; ")
      .replace(/;\s*$/gm, "")
      .replace(/\s*,\s*/g, ",");
  }

  if (opts.lowercase) t = t.toLowerCase();

  // final tidy: collapse spaces, trim padding around symbols
  t = t
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ *([→∴∵∧∨¬⇔≥≤⟂]) */g, " $1 ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .trim();

  const outChars = t.length;
  const outWords = countWords(t);
  const inTokensEst = Math.max(1, Math.round(inChars / 4));
  const outTokensEst = Math.max(1, Math.round(outChars / 4));

  const stats: NeuraleseStats = {
    inChars,
    outChars,
    charDeltaPct: inChars ? Math.round(((inChars - outChars) / inChars) * 100) : 0,
    inWords,
    outWords,
    inTokensEst,
    outTokensEst,
    tokenDeltaPct: inTokensEst
      ? Math.round(((inTokensEst - outTokensEst) / inTokensEst) * 100)
      : 0,
  };

  return { output: t, stats };
}

export const SAMPLE_TEXT =
  "Because the application performance decreased significantly, the development team decided that they should increase the number of database connections in order to improve the overall user experience. As a result, the average response time was reduced, which leads to greater than ninety percent customer satisfaction. For example, the configuration was changed so that each request is processed approximately three times faster than the previous version.";
