/** Real o200k_base fixtures for KALLIGRAPHOS. */
import { kalligraphosDecode, kalligraphosDecoderPrompt, kalligraphosEncode } from '../src/lib/omega/kalligraphos';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';

const ENC: EncodingName = 'o200k_base';

type Style = { upper: number; lower: number; digit?: number };
const F: Style = { upper: 0x1d5d4, lower: 0x1d5ee, digit: 0x1d7ec }; // sans bold
const B: Style = { upper: 0x1d400, lower: 0x1d41a, digit: 0x1d7ce }; // bold
const M: Style = { upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 }; // monospace

function styled(text: string, style: Style): string {
  return text.replace(/[A-Za-z0-9]/g, (ch) => {
    const cp = ch.charCodeAt(0);
    if (cp >= 0x41 && cp <= 0x5a) return String.fromCodePoint(style.upper + cp - 0x41);
    if (cp >= 0x61 && cp <= 0x7a) return String.fromCodePoint(style.lower + cp - 0x61);
    return String.fromCodePoint(style.digit! + cp - 0x30);
  });
}

/** A real everyday “fancy font” operations post: social/chat tooling and PDF
 * copy-paste commonly emit these Unicode mathematical font codepoints. */
export const styledOperationsBrief = styled([
  'Daily operations update: the gateway deployment completed successfully and the customer login error rate is back below the alert threshold.',
  'The on-call team verified 42 requests, closed 7 incidents, and scheduled the remaining database index repair for 2026-10-01.',
  'Please review the change summary before the afternoon handoff and reply if any service still needs a rollback plan.',
].join(' '), F);

export const mixedStyledAnnouncement = `${styled('RELEASE 2026', B)} — ${styled('all checks passed and the rollback guide is ready.', M)}`;
export const legitimateMathNotation = 'For the field 𝔽 and vector 𝐯, retain mathematical typography exactly; this short notation should not repay an inline contract.';
export const formalMathParagraph = styled('For the vector x and matrix A, prove the equation A x = b. The basis and coefficient values define the function.', B);
export const cleanEnglishProse = 'The team completed the deployment and will monitor the service through the afternoon handoff.';
export const supportedStyleWithAsciiBoundary = `${styled('Styled', F)} ordinaryASCII ${styled('again', F)}.`;

export const KALLIGRAPHOS_FIXTURES: Record<string, string> = {
  styledOperationsBrief,
  mixedStyledAnnouncement,
  legitimateMathNotation,
  formalMathParagraph,
  cleanEnglishProse,
  supportedStyleWithAsciiBoundary,
};

function main() {
  console.log('=== KALLIGRAPHOS fixture report (live o200k_base) ===');
  for (const [name, text] of Object.entries(KALLIGRAPHOS_FIXTURES)) {
    const r = kalligraphosEncode(text, ENC, { budgetMs: 3000, maxArms: 2 });
    const saved = r.inTokens - r.messageTokens;
    const pct = r.inTokens ? (100 * saved / r.inTokens).toFixed(1) : '0.0';
    const exact = kalligraphosDecode(r.wire) === text;
    const promptOk = kalligraphosDecoderPrompt(r.wire) === r.decoderPrompt;
    console.log(`${name.padEnd(30)} raw=${String(countTokens(text, ENC)).padStart(4)} delivered=${String(r.messageTokens).padStart(4)} saved=${String(saved).padStart(4)} (${pct}%) applied=${r.kalligraphosApplied} spans=${r.kalligraphosSpans} exact=${exact} prompt=${promptOk}`);
    if (!exact || !promptOk) throw new Error(`fixture failure: ${name}`);
  }
}
if (import.meta.url === `file://${process.argv[1]}`) main();
