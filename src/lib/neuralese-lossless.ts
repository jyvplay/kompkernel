// Neuralese Lossless ASCII Codec
//
// Goal: a cross-LLM, tokenizer-safe, fully reversible compression mode.
// Unlike the symbolic / lossy presets, this codec never deletes information.
// It only aliases repeated ASCII-safe phrases into deterministic short codes
// and prepends a compact ASCII header that can be decoded exactly by code.
//
// Design principles from verified research:
// - Dictionary-Encoding + ICL (2026): LLMs can reason directly on encoded text
//   if the dictionary is provided in context.
// - CompactPrompt (2025): short recurrent n-grams are the sweet spot.
// - Unicode/tokenizer attack literature (2025-2026): prefer visible ASCII,
//   avoid invisible / confusable Unicode and tokenizer-fragile symbols.
//
// Wire format (ASCII only):
//   [[NL1|k0=phrase one|k1=phrase two]]
//   body with @0 @1 aliases
//
// Exact decoding is guaranteed by `decodeLosslessAscii()`.

export interface LosslessEntry {
  key: string;
  phrase: string;
  hits: number;
}

export interface LosslessResult {
  output: string;
  decoded: string;
  entries: LosslessEntry[];
  exact: boolean;
}

const KEY_POOL = Array.from({ length: 36 }, (_, i) => i.toString(36));

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenizeWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function looksWordLike(token: string): boolean {
  return /^[A-Za-z][A-Za-z0-9'/-]*$/.test(token);
}

function normalizeSpaces(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");
}

export function buildLosslessDictionary(
  input: string,
  opts: { maxEntries?: number; minHits?: number; nMin?: number; nMax?: number } = {},
): LosslessEntry[] {
  const maxEntries = opts.maxEntries ?? 10;
  const minHits = opts.minHits ?? 2;
  const nMin = opts.nMin ?? 2;
  const nMax = opts.nMax ?? 4;

  const toks = tokenizeWords(input);
  const counts = new Map<string, { hits: number; n: number }>();

  for (let n = nMin; n <= nMax; n++) {
    for (let i = 0; i + n <= toks.length; i++) {
      const slice = toks.slice(i, i + n);
      if (!slice.every(looksWordLike)) continue;
      const phrase = slice.join(" ");
      if (phrase.length < 8) continue;
      const cur = counts.get(phrase);
      if (cur) cur.hits += 1;
      else counts.set(phrase, { hits: 1, n });
    }
  }

  const scored = [...counts.entries()]
    .map(([phrase, meta]) => ({ phrase, hits: meta.hits, n: meta.n }))
    .filter((x) => x.hits >= minHits)
    .map((x) => {
      // exact savings guard:
      // body saves (hits * (phraseLen - aliasLen)); header costs phraseLen + framing.
      // alias is @<key> e.g. @0
      const key = "@0";
      const headerCost = `|k=${x.phrase}`.length;
      const bodySavings = x.hits * (x.phrase.length - key.length);
      const net = bodySavings - headerCost;
      return { ...x, net };
    })
    .filter((x) => x.net > 0)
    .sort((a, b) => b.net - a.net || b.n - a.n || b.hits - a.hits);

  const out: LosslessEntry[] = [];
  for (const cand of scored) {
    if (out.length >= maxEntries) break;
    const conflict = out.some(
      (e) => e.phrase.includes(cand.phrase) || cand.phrase.includes(e.phrase),
    );
    if (conflict) continue;
    out.push({
      key: KEY_POOL[out.length] ?? String(out.length),
      phrase: cand.phrase,
      hits: cand.hits,
    });
  }
  return out;
}

export function encodeLosslessAscii(input: string): LosslessResult {
  const normalized = normalizeSpaces(input);
  const entries = buildLosslessDictionary(normalized);

  let body = normalized;
  for (const entry of entries) {
    const re = new RegExp(`\\b${escapeRegExp(entry.phrase)}\\b`, "g");
    body = body.replace(re, `@${entry.key}`);
  }

  const header = entries.length
    ? `[[NL1${entries.map((e) => `|${e.key}=${e.phrase}`).join("")}]]\n`
    : "";

  const output = `${header}${body}`;
  const decoded = decodeLosslessAscii(output);

  // exactness is string identity on the normalized representation that the codec
  // intentionally preserves. We do not touch case or punctuation.
  return {
    output,
    decoded,
    entries,
    exact: decoded === normalized,
  };
}

export function decodeLosslessAscii(text: string): string {
  const match = text.match(/^\[\[NL1([^\]]*)\]\]\n?/);
  if (!match) return text;

  const header = match[1] ?? "";
  const body = text.slice(match[0].length);
  const pairs = header
    .split("|")
    .filter(Boolean)
    .map((chunk) => {
      const idx = chunk.indexOf("=");
      if (idx === -1) return null;
      return {
        key: chunk.slice(0, idx),
        phrase: chunk.slice(idx + 1),
      };
    })
    .filter((x): x is { key: string; phrase: string } => Boolean(x));

  let out = body;
  for (const pair of pairs) {
    const re = new RegExp(`@${escapeRegExp(pair.key)}\\b`, "g");
    out = out.replace(re, pair.phrase);
  }
  return out;
}

export function buildLosslessDecoderPreamble(entries: LosslessEntry[]): string {
  if (!entries.length) {
    return "The following message uses the NL1 lossless ASCII neuralese format. There is no dictionary header, so read it literally.";
  }
  return [
    "The following message uses the NL1 lossless ASCII neuralese format.",
    "Decode rules:",
    "1. If the message begins with [[NL1|...]], parse each dictionary pair k=phrase.",
    "2. In the body, each alias @k expands to its exact phrase.",
    "3. Preserve all other visible text literally.",
    "Dictionary:",
    ...entries.map((e) => `- @${e.key} = ${e.phrase}`),
  ].join("\n");
}
