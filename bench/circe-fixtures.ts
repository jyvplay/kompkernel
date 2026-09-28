/**
 * bench/circe-fixtures.ts
 * =============================================================================
 * Realistic "everyday work" fixtures for CIRCE, mirroring the rigor of
 * bench/procrustes-fixtures.ts / bench/abacus-fixtures.ts: genuine document
 * TYPES a real user would paste into a chat, not synthetic stress tests.
 *
 * Four families, matched to CIRCE's mechanisms:
 *   - HTML: CMS/RSS/scrape exports where named + numeric character
 *     references were never decoded back to plain text.
 *   - PERCENT: pasted URLs, webhook/API payloads, and log lines carrying
 *     percent-encoded UTF-8 bytes for non-ASCII characters.
 *   - WATERMARK: text carrying a UNIFORM invisible-character guard (the
 *     realistic target of mechanism 5) -- steganography/AI-watermarking
 *     tool output and SEO-stuffing artifacts, at a few realistic lengths
 *     to show the mechanism's break-even point honestly, not just its
 *     best case.
 *   - NEGATIVE SPACE: clean prose, an HTML/URL-encoding TUTORIAL that
 *     talks ABOUT entities/percent-encoding without containing any real
 *     ones, and short fragments below CIRCE's own break-even -- all of
 *     which MUST decline (or, in the tutorial's case, must not corrupt
 *     the few literal examples it legitimately needs to keep verbatim).
 *
 * Every raw/messageTokens/percentage number below is produced by actually
 * running circeEncode/circeDecode via `npx tsx bench/circe-fixtures.ts`
 * against the live o200k_base tokenizer -- never estimated.
 * =============================================================================
 */
import { circeEncode, circeDecode, circeDecoderPrompt } from '../src/lib/omega/circe';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';

const ENC: EncodingName = 'o200k_base';

function zwspWatermark(text: string): string {
  return text.split(' ').join('\u200B ');
}

/* ---------------------------------------------------------------------------
 * HTML entity fixtures
 * ------------------------------------------------------------------------- */

export const wordpressExcerpt = `The company&#8217;s Q3 earnings call revealed that R&amp;D spending had increased by 12 percent this year. &ldquo;We&#8217;re doubling down on innovation,&rdquo; said the CEO, &ldquo;and we won&#8217;t be slowing down anytime soon.&rdquo; The board&#8217;s decision &mdash; announced late Friday &mdash; came after months of internal debate. Analysts noted that the firm&#8217;s market share had grown, though it&#8217;s still trailing competitors. Johnson &amp; Johnson, along with several other firms, also reported strong Q&amp;A sessions with shareholders this quarter.`;

export const rssFeedItem = `<item><title>Qu&#233;bec startup raises &#36;12M Series A</title><description>The round was led by an investor who said the founder&#8217;s vision for the product was &ldquo;exactly what the market needs.&rdquo; The company plans to use the funds to expand its engineering team and open a new office by early next year.</description></item>`;

export const scrapedForumPost = `Re: Best caf&eacute; in the neighborhood?\n\nI&#8217;ve tried basically every place on this block and honestly the little spot on the corner is still my favorite &mdash; their espresso is amazing and the staff always remembers your order. Don&#8217;t sleep on the pastries either, they&#8217;re baked fresh every morning.`;

export const emailDigestSnippet = `Today&#8217;s top stories: &ldquo;Markets rally as inflation cools,&rdquo; &ldquo;City council approves new transit plan,&rdquo; and &ldquo;Local team clinches championship &mdash; their first in over a decade.&rdquo; Read more below, and don&#8217;t forget to update your preferences if you&#8217;d like fewer emails.`;

/* ---------------------------------------------------------------------------
 * Percent-encoded UTF-8 fixtures
 * ------------------------------------------------------------------------- */

export const sharedArticleUrl = "Here's the article I mentioned: https://www.example.com/blog/2026/09/why-caf%C3%A9-culture-is-booming-in-qu%C3%A9bec%E2%80%94an-in-depth-look-at-what%E2%80%99s-driving-the-trend?utm_source=newsletter&utm_campaign=fall%E2%80%99s-biggest-stories";

export const webhookJsonPayload = `{"event":"order.created","customer_name":"Ren%C3%A9e%20O%E2%80%99Connor","note":"Please%20don%E2%80%99t%20call%20before%209am%2C%20I%E2%80%99m%20usually%20asleep","shipping_address":"123%20Rue%20Saint-Jos%C3%A9ph%2C%20Qu%C3%A9bec","gift_message":"Happy%20Birthday%E2%80%94wishing%20you%20a%20wonderful%20year%20ahead%21"}`;

export const sharedLinksList = "Here are the links from the meeting notes: https://shop.example.com/product/women%E2%80%99s-jacket-size-m, https://news.example.com/articles/caf%C3%A9-culture-in-paris, https://blog.example.com/2026/09/it%E2%80%99s-time-to-move-on, https://forum.example.com/thread/what%E2%80%99s-your-favorite-caf%C3%A9, https://example.com/search?q=r%C3%A9sum%C3%A9%20writing%20tips, https://example.com/deal?title=50%25%20off%20%E2%80%94%20today%20only, https://example.com/user/o%E2%80%99brien-reviews, https://example.com/notes/don%E2%80%99t-forget-the-na%C3%AFve-approach.";

export const serverLogLine = `GET /api/v2/items?title=Women%E2%80%99s%20Jacket%20%E2%80%94%20Size%20M&category=Men%E2%80%99s%20Shoes&sort=r%C3%A9sum%C3%A9 HTTP/1.1" 200`;

/* ---------------------------------------------------------------------------
 * Invisible-character watermark/steganography fixtures
 * (mechanism 5 -- shown at three realistic lengths so the break-even point
 * is honest, not cherry-picked)
 * ------------------------------------------------------------------------- */

const shortWatermarkedComment = zwspWatermark("Great post, thanks for sharing this with the team!");

const midWatermarkedParagraph = zwspWatermark(
  `The quarterly report shows steady growth across every region we track this year, with the strongest gains coming from overseas markets. Meanwhile, the engineering team shipped three major releases, each one focused on reliability improvements rather than new features.`,
);

const longWatermarkedArticle = zwspWatermark(
  `The quarterly report shows steady growth across every region we track this year, with the strongest gains coming from overseas markets. Meanwhile, the engineering team shipped three major releases, each one focused on reliability improvements rather than new features. Customer feedback has been largely positive, though several users flagged confusing onboarding steps that the design team is now revising. Looking ahead, leadership expects continued investment in infrastructure, along with a renewed push into international markets next spring. The finance department also noted that operating margins improved slightly despite rising costs in logistics and raw materials. Several partnerships announced earlier this year are already contributing meaningfully to revenue, and two additional deals are expected to close before the end of the fiscal year. Employee retention remains strong, with turnover rates well below the industry average across nearly every department. The board expressed confidence in the current strategy while encouraging management to explore additional cost efficiencies where reasonable. Overall sentiment among analysts covering the company has shifted noticeably more positive since the last earnings call.`,
);

export { shortWatermarkedComment, midWatermarkedParagraph, longWatermarkedArticle };

/* ---------------------------------------------------------------------------
 * Negative space -- CIRCE must decline all of these (or, for the tutorial,
 * must leave the deliberately-preserved literal examples untouched)
 * ------------------------------------------------------------------------- */

export const cleanProseControl = `Our team is meeting on Thursday to review the quarterly roadmap and finalize the launch checklist. Please bring your notes from the customer interviews so we can prioritize the next sprint together.`;

export const htmlTutorialExcerpt = `In HTML, special characters must be escaped using character references. For example, an ampersand is written as the literal text "&amp;" (the entity for the ampersand character), and a copyright symbol is written as "&copy;". Numeric references like "&#65;" (which is the same as the letter A) are also supported, as are hexadecimal ones like "&#x41;". Understanding when to use each form is a common topic in web development courses.`;

export const shortFragmentBelowBreakeven = `It&#8217;s fine.`;

/* ---------------------------------------------------------------------------
 * Runner
 * ------------------------------------------------------------------------- */

export const CIRCE_FIXTURES: Record<string, string> = {
  wordpressExcerpt,
  rssFeedItem,
  scrapedForumPost,
  emailDigestSnippet,
  sharedArticleUrl,
  webhookJsonPayload,
  sharedLinksList,
  serverLogLine,
  shortWatermarkedComment,
  midWatermarkedParagraph,
  longWatermarkedArticle,
  cleanProseControl,
  htmlTutorialExcerpt,
  shortFragmentBelowBreakeven,
};

function pct(before: number, after: number): string {
  if (before === 0) return '0.0%';
  return `${(100 * (before - after) / before).toFixed(1)}%`;
}

function main() {
  console.log('=== CIRCE fixture report (live o200k_base measurements) ===\n');
  let totalBefore = 0;
  let totalAfter = 0;
  for (const [name, text] of Object.entries(CIRCE_FIXTURES)) {
    const before = countTokens(text, ENC);
    const r = circeEncode(text, ENC);
    const decoded = circeDecode(r.wire);
    const promptOk = circeDecoderPrompt(r.wire) === r.decoderPrompt;
    const exact = decoded === text;
    console.log(
      `${name.padEnd(28)} before=${String(before).padStart(4)} messageTokens=${String(r.messageTokens).padStart(4)} ` +
      `saved=${String(before - r.messageTokens).padStart(4)} (${pct(before, r.messageTokens).padStart(6)}) ` +
      `applied=${r.circeApplied} named=${r.circeNamedSpans} dec=${r.circeDecSpans} hex=${r.circeHexSpans} pct=${r.circePctSpans} inv=${r.circeInvisibleGuard} exact=${exact} promptOk=${promptOk}`,
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

  // Negative-space check: htmlTutorialExcerpt must not have its deliberately
  // literal examples corrupted -- it may legitimately decline (it does, see
  // report), but IF it were ever to apply, decode must still be byte-exact
  // (already checked above by the per-fixture exactness assertion).
}

main();
