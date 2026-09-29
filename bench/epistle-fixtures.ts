/**
 * bench/epistle-fixtures.ts
 * =============================================================================
 * Realistic "everyday work" fixtures for EPISTLE, mirroring the rigor of
 * bench/prosopon-fixtures.ts / bench/syntagma-fixtures.ts.
 *
 * The headline fixture (frenchBusinessEmailQuotedPrintable) reproduces a
 * live, current (2026) real-world artifact: an email whose body used the
 * RFC 2045 quoted-printable Content-Transfer-Encoding and was never
 * decoded before being pasted -- confirmed via a real GitHub pull request
 * dated September 17, 2026 fixing exactly this bug in a mail-server
 * codebase, and a real Nextcloud Mail bug report showing the identical
 * failure mode on a Czech-language message.
 *
 * Every raw/messageTokens/percentage number below is produced by actually
 * running epistleEncode/epistleDecode via
 * `npx tsx bench/epistle-fixtures.ts` against the live o200k_base
 * tokenizer -- never estimated.
 * =============================================================================
 */
import { epistleEncode, epistleDecode, epistleDecoderPrompt } from '../src/lib/omega/epistle';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';

const ENC: EncodingName = 'o200k_base';

function toQuotedPrintable(s: string): string {
  const bytes = Buffer.from(s, 'utf8');
  let out = '';
  for (const b of bytes) {
    if ((b >= 33 && b <= 126 && b !== 61) || b === 32 || b === 9) out += String.fromCharCode(b);
    else if (b === 10) out += '\n';
    else out += '=' + b.toString(16).toUpperCase().padStart(2, '0');
  }
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
 * Headline fixture: a realistic, fully-French business email whose
 * Content-Transfer-Encoding: quoted-printable was never decoded.
 * ------------------------------------------------------------------------- */

export const frenchBusinessEmailQuotedPrintable = toQuotedPrintable(frenchParas.join(' '));

/* ---------------------------------------------------------------------------
 * Realistic embedded scenario: an English message quoting a raw MIME
 * excerpt (e.g. pasted from an email client's "view source" feature).
 * ------------------------------------------------------------------------- */

export const embeddedQpExcerpt = `Hi team! Here's the raw MIME source the vendor's server sent, looks like it never got decoded: ${toQuotedPrintable("Le café a été livré à temps, merci beaucoup à toute l'équipe.")} Can you check on your end?`;

/* ---------------------------------------------------------------------------
 * Negative space: EPISTLE must decline cleanly.
 * ------------------------------------------------------------------------- */

export const genuineFrenchProse = frenchParas.join(' ');
export const cleanEnglishProse = 'Our team is meeting on Thursday to review the quarterly roadmap and finalize the launch checklist. Please bring your notes from the customer interviews so we can prioritize the next sprint together.';
export const literalEqualsSignsNotQp = 'The config sets x=3D as the default value, y=41 for the secondary mode, and z=FF for the override, none of which are encoded bytes.';
export const shortFragment = 'caf\u00e9';

/* ---------------------------------------------------------------------------
 * Runner
 * ------------------------------------------------------------------------- */

export const EPISTLE_FIXTURES: Record<string, string> = {
  frenchBusinessEmailQuotedPrintable,
  embeddedQpExcerpt,
  genuineFrenchProse,
  cleanEnglishProse,
  literalEqualsSignsNotQp,
  shortFragment,
};

function pct(before: number, after: number): string {
  if (before === 0) return '0.0%';
  return `${(100 * (before - after) / before).toFixed(1)}%`;
}

function main() {
  console.log('=== EPISTLE fixture report (live o200k_base measurements) ===\n');
  for (const [name, text] of Object.entries(EPISTLE_FIXTURES)) {
    const before = countTokens(text, ENC);
    const r = epistleEncode(text, ENC);
    const decoded = epistleDecode(r.wire);
    const promptOk = epistleDecoderPrompt(r.wire) === r.decoderPrompt;
    const exact = decoded === text;
    console.log(
      `${name.padEnd(32)} before=${String(before).padStart(4)} messageTokens=${String(r.messageTokens).padStart(4)} ` +
      `saved=${String(before - r.messageTokens).padStart(4)} (${pct(before, r.messageTokens).padStart(6)}) ` +
      `applied=${r.epistleApplied} spans=${r.epistleSpans} exact=${exact} promptOk=${promptOk}`,
    );
    if (!exact) throw new Error(`FIXTURE FAILED EXACTNESS: ${name}`);
    if (!promptOk) throw new Error(`FIXTURE decoderPrompt MISMATCH: ${name}`);
  }

  console.log('\n--- Headline receipt: frenchBusinessEmailQuotedPrintable (vs plain DAEDALUS) ---');
  const r = epistleEncode(frenchBusinessEmailQuotedPrintable, ENC);
  console.log(r.notes);
}

main();
