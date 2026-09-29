/**
 * bench/prosopon-fixtures.ts
 * =============================================================================
 * Realistic "everyday work" fixtures for PROSOPON, mirroring the rigor of
 * bench/syntagma-fixtures.ts / bench/caesura-fixtures.ts.
 *
 * The headline fixture (frenchBusinessEmailMojibake) reproduces the single
 * most famous, most universally-recognized text-corruption pattern in
 * computing history -- "mojibake": UTF-8-encoded bytes decoded one byte at
 * a time as the legacy Windows-1252 code page instead, turning "café" into
 * "cafÃ©". It is the realistic worst case honestly measured this session: a
 * message written ENTIRELY in a language whose orthography requires
 * diacritics on most words (so essentially the whole message is affected),
 * as opposed to an English message with only occasional loanwords.
 *
 * Every raw/messageTokens/percentage number below is produced by actually
 * running prosoponEncode/prosoponDecode via
 * `npx tsx bench/prosopon-fixtures.ts` against the live o200k_base
 * tokenizer -- never estimated.
 * =============================================================================
 */
import { prosoponEncode, prosoponDecode, prosoponDecoderPrompt } from '../src/lib/omega/prosopon';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';

const ENC: EncodingName = 'o200k_base';

const CP1252_HIGH: Record<number, number> = {
  0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160,
  0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153,
  0x9E: 0x017E, 0x9F: 0x0178,
};

function toMojibake1252(s: string): string {
  const utf8Bytes = Buffer.from(s, 'utf8');
  let out = '';
  for (const b of utf8Bytes) out += String.fromCodePoint(b >= 0x80 && b <= 0x9F ? (CP1252_HIGH[b] ?? b) : b);
  return out;
}

const frenchParas = [
  "Bonjour à toute l'équipe, je vous écris pour faire le point sur la réunion d'hier après-midi concernant le développement du nouveau produit.",
  "Nous avons discuté des différentes options pour améliorer la qualité de nos services, et plusieurs collègues ont proposé des idées intéressantes à explorer.",
  'Le responsable financier a présenté les résultats du dernier trimestre, qui montrent une croissance légèrement supérieure aux prévisions initiales.',
  "Malheureusement, certains problèmes techniques ont été signalés par nos clients, et l'équipe technique s'occupe déjà de résoudre ces difficultés rapidement.",
  'Je vous prie de bien vouloir préparer vos rapports respectifs avant vendredi prochain, afin que nous puissions les examiner ensemble lors de la prochaine réunion.',
  "N'hésitez pas à me contacter si vous avez des questions ou des préoccupations concernant les sujets abordés dans ce message.",
];

/* ---------------------------------------------------------------------------
 * Headline fixture: a realistic, fully-French business email corrupted by
 * the classic UTF-8-decoded-as-Windows-1252 mojibake bug.
 * ------------------------------------------------------------------------- */

export const frenchBusinessEmailMojibake = toMojibake1252(frenchParas.join(' '));

/* ---------------------------------------------------------------------------
 * Realistic embedded scenario: an English message quoting a mojibake'd
 * excerpt (e.g. pasted from a legacy CMS export or a mis-configured RSS
 * feed reader).
 * ------------------------------------------------------------------------- */

export const embeddedMojibakeExcerpt = `Hi team! Here's the excerpt the vendor sent over, looks like it came through a broken export tool: ${toMojibake1252("Le café a été livré à temps, merci beaucoup à toute l\u2019équipe.")} Let me know if you can make sense of it.`;

/* ---------------------------------------------------------------------------
 * Negative space: PROSOPON must decline cleanly.
 * ------------------------------------------------------------------------- */

export const genuineFrenchProse = frenchParas.join(' ');
export const cleanEnglishProse = 'Our team is meeting on Thursday to review the quarterly roadmap and finalize the launch checklist. Please bring your notes from the customer interviews so we can prioritize the next sprint together.';
export const genuineSmartQuotesNotMojibake = 'She said \u201Ccaf\u00E9 au lait\u201D and smiled \u2014 simple as that, nothing broken here.';
export const shortFragment = 'café';

/* ---------------------------------------------------------------------------
 * Runner
 * ------------------------------------------------------------------------- */

export const PROSOPON_FIXTURES: Record<string, string> = {
  frenchBusinessEmailMojibake,
  embeddedMojibakeExcerpt,
  genuineFrenchProse,
  cleanEnglishProse,
  genuineSmartQuotesNotMojibake,
  shortFragment,
};

function pct(before: number, after: number): string {
  if (before === 0) return '0.0%';
  return `${(100 * (before - after) / before).toFixed(1)}%`;
}

function main() {
  console.log('=== PROSOPON fixture report (live o200k_base measurements) ===\n');
  for (const [name, text] of Object.entries(PROSOPON_FIXTURES)) {
    const before = countTokens(text, ENC);
    const r = prosoponEncode(text, ENC);
    const decoded = prosoponDecode(r.wire);
    const promptOk = prosoponDecoderPrompt(r.wire) === r.decoderPrompt;
    const exact = decoded === text;
    console.log(
      `${name.padEnd(28)} before=${String(before).padStart(4)} messageTokens=${String(r.messageTokens).padStart(4)} ` +
      `saved=${String(before - r.messageTokens).padStart(4)} (${pct(before, r.messageTokens).padStart(6)}) ` +
      `applied=${r.prosoponApplied} spans=${r.prosoponSpans} exact=${exact} promptOk=${promptOk}`,
    );
    if (!exact) throw new Error(`FIXTURE FAILED EXACTNESS: ${name}`);
    if (!promptOk) throw new Error(`FIXTURE decoderPrompt MISMATCH: ${name}`);
  }

  console.log('\n--- Headline receipt: frenchBusinessEmailMojibake (vs plain DAEDALUS) ---');
  const r = prosoponEncode(frenchBusinessEmailMojibake, ENC);
  console.log(r.notes);
}

main();
