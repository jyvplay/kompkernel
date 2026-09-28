/**
 * bench/caesura-fixtures.ts
 * =============================================================================
 * Realistic "everyday work" fixtures for CAESURA, mirroring the rigor of
 * bench/circe-fixtures.ts / bench/procrustes-fixtures.ts.
 *
 * The headline fixture (nbspEditorBugArticle) reproduces the EXACT real-world
 * artifact class documented in bench/caesura-report.md: a rich-text editor
 * or contenteditable field silently converting most/all typed or pasted
 * spaces into non-breaking spaces (confirmed via multiple independent,
 * multi-year, cross-platform bug reports -- Mozilla Bugzilla #194498/#359303,
 * WordPress Gutenberg #7474, CraftCMS Redactor #383, and a live itch.io bug
 * opened February 2025). A human proofreading such a message sees nothing
 * wrong at all -- NBSP is pixel-identical to a space in every font.
 *
 * Every raw/messageTokens/percentage number below is produced by actually
 * running caesuraEncode/caesuraDecode via `npx tsx bench/caesura-fixtures.ts`
 * against the live o200k_base tokenizer -- never estimated.
 * =============================================================================
 */
import { caesuraEncode, caesuraDecode, caesuraDecoderPrompt } from '../src/lib/omega/caesura';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';

const ENC: EncodingName = 'o200k_base';

const businessUpdateParas = [
  'The quarterly report shows steady growth across every region we track this year, with the strongest gains coming from overseas markets.',
  'Meanwhile, the engineering team shipped three major releases, each one focused on reliability improvements rather than new features.',
  'Customer feedback has been largely positive, though several users flagged confusing onboarding steps that the design team is now revising.',
  'Looking ahead, leadership expects continued investment in infrastructure, along with a renewed push into international markets next spring.',
  'The finance department also noted that operating margins improved slightly despite rising costs in logistics and raw materials.',
  'Several partnerships announced earlier this year are already contributing meaningfully to revenue, and two additional deals are expected to close.',
  'Employee retention remains strong, with turnover rates well below the industry average across nearly every department this year.',
  'The board expressed confidence in the current strategy while encouraging management to explore additional cost efficiencies where reasonable.',
  'Overall sentiment among analysts covering the company has shifted noticeably more positive since the last earnings call this quarter.',
];

function toNbsp(text: string): string {
  return text.split(' ').join('\u00A0');
}

/* ---------------------------------------------------------------------------
 * Headline fixture: the editor-bug scenario, realistic length.
 * ------------------------------------------------------------------------- */

export const nbspEditorBugArticle = toNbsp(businessUpdateParas.join(' '));

/* ---------------------------------------------------------------------------
 * Realistic embedded scenario: an ordinary chat message where ONE pasted
 * paragraph (e.g. copied from a vendor email that hit the editor bug) is
 * NBSP-corrupted, surrounded by completely normal prose.
 * ------------------------------------------------------------------------- */

export const embeddedNbspParagraph = `Hi team,\n\nHere's the update I got from the vendor this afternoon, copy-pasted directly from their portal:\n\n${toNbsp('The shipment was delayed due to customs processing and should arrive by Friday at the latest according to the carrier, who confirmed the new tracking number this morning.')}\n\nLet me know if you have any questions before the call tomorrow.`;

/* ---------------------------------------------------------------------------
 * French typography fixture: official NBSP-before-punctuation convention.
 * ------------------------------------------------------------------------- */

export const frenchTypography = `Bonjour\u00A0! Voici le rapport que vous avez demand\u00E9\u00A0: tout semble en ordre. L'\u00E9quipe a confirm\u00E9\u00A0: \u00ABc'est termin\u00E9\u00A0!\u00BB Vraiment\u00A0? Oui, absolument\u00A0!`;

/* ---------------------------------------------------------------------------
 * Uniform double-space-after-sentence fixture (touch-typing convention).
 * ------------------------------------------------------------------------- */

export const doubleSpacedMemo = businessUpdateParas.join('  ');

/* ---------------------------------------------------------------------------
 * Negative space: CAESURA must decline cleanly.
 * ------------------------------------------------------------------------- */

export const cleanProseControl = 'Our team is meeting on Thursday to review the quarterly roadmap and finalize the launch checklist. Please bring your notes from the customer interviews so we can prioritize the next sprint together.';
export const mixedSpacingControl = 'This is the first sentence.  This is the second one. And here is a third sentence with only one space after the period.';
export const shortFragment = "It's fine, thanks.";

/* ---------------------------------------------------------------------------
 * Runner
 * ------------------------------------------------------------------------- */

export const CAESURA_FIXTURES: Record<string, string> = {
  nbspEditorBugArticle,
  embeddedNbspParagraph,
  frenchTypography,
  doubleSpacedMemo,
  cleanProseControl,
  mixedSpacingControl,
  shortFragment,
};

function pct(before: number, after: number): string {
  if (before === 0) return '0.0%';
  return `${(100 * (before - after) / before).toFixed(1)}%`;
}

function main() {
  console.log('=== CAESURA fixture report (live o200k_base measurements) ===\n');
  let totalBefore = 0;
  let totalAfter = 0;
  for (const [name, text] of Object.entries(CAESURA_FIXTURES)) {
    const before = countTokens(text, ENC);
    const r = caesuraEncode(text, ENC);
    const decoded = caesuraDecode(r.wire);
    const promptOk = caesuraDecoderPrompt(r.wire) === r.decoderPrompt;
    const exact = decoded === text;
    console.log(
      `${name.padEnd(22)} before=${String(before).padStart(4)} messageTokens=${String(r.messageTokens).padStart(4)} ` +
      `saved=${String(before - r.messageTokens).padStart(4)} (${pct(before, r.messageTokens).padStart(6)}) ` +
      `applied=${r.caesuraApplied} nbsp=${r.caesuraNbspSpans} narrow=${r.caesuraNarrowSpans} dblspace=${r.caesuraDoubleSpace} exact=${exact} promptOk=${promptOk}`,
    );
    if (!exact) throw new Error(`FIXTURE FAILED EXACTNESS: ${name}`);
    if (!promptOk) throw new Error(`FIXTURE decoderPrompt MISMATCH: ${name}`);
    totalBefore += before;
    totalAfter += r.messageTokens;
  }
  console.log(
    `\nTOTAL (individually, as separate messages): before=${totalBefore} after=${totalAfter} ` +
    `saved=${totalBefore - totalAfter} (${pct(totalBefore, totalAfter)})`,
  );

  console.log('\n--- Headline receipt: nbspEditorBugArticle ---');
  const r = caesuraEncode(nbspEditorBugArticle, ENC);
  console.log(`raw=${countTokens(nbspEditorBugArticle, ENC)} messageTokens=${r.messageTokens} saved=${countTokens(nbspEditorBugArticle, ENC) - r.messageTokens} (${pct(countTokens(nbspEditorBugArticle, ENC), r.messageTokens)})`);
  console.log(r.notes);
}

main();
