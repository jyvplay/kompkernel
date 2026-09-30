/**
 * bench/panoptes-fixtures.ts
 * =============================================================================
 * Real-world multi-artifact fixtures for PANOPTES evaluation:
 * - Complex customer support ticket with quoted-printable leaks + Eastern Arabic prices + smart quotes + ALL-CAPS shouting
 * - Markdown technical spec with Math Bold headers + NBSP spaces + fullwidth text + HTML entities
 * - Forwarded email digest with mojibake UTF-8 + thousands commas + letter-spacing
 * - Negative space: clean prose, clean code.
 * =============================================================================
 */

export const multiArtifactSupportTicket = `URGENT CUSTOMER ISSUE: Order #٤٨٢٩١٠٥٧
From: Support Client <client@example.com>
Subject: CANNOT COMPLETE PAYMENT - PLEASE HELP IMMEDIATELY!

Dear Support Team,
I am writing regarding my pending order for the café supplies and the crème brûlée ingredients.
The system is showing an error on the total price of ١٨٦٠٠ ريال.
The invoice states: "The customer's account balance is insufficient."
PLEASE FIX THIS ASAP! WE NEED THIS RESOLVED TODAY BEFORE ٥:٠٠ PM!

Order Breakdown:
- Item 1: Premium Coffee Beans (سعر: ٤٥٠٠ ريال, كمية: ٢)
- Item 2: French Vanilla Extract (سعر: ١٢٥٠ ريال, كمية: ٤)
Total Due: ٢١٣٩٠ ريال.
Contact Phone: ٩٢٠٠١٥٤٨٩.`;

export const multiArtifactTechSpec = `# 𝐓𝐨𝐤𝐞𝐧𝐢𝐳𝐚𝐭𝐢𝐨𝐧 𝐒𝐩𝐞𝐜𝐢𝐟𝐢𝐜𝐚𝐭𝐢𝐨𝐧 & 𝐁𝐞𝐧𝐜𝐡𝐦𝐚𝐫𝐤

## 𝖮𝗏𝖾𝗋𝗏𝗂𝖾𝗐
The system processes data with high efficiency (NBSP separated) across all components.
Here is a letter-spaced banner: I M P O R T A N T
And fullwidth parameters: Ｗｉｄｔｈ＝１００， Ｈｅｉｇｈｔ＝２００．

### 𝖢𝗈𝖽𝖾 𝖲𝗇𝗂𝗉𝗉𝖾𝗍
\`\`\`typescript
𝚌𝚘𝚗𝚜𝚝 𝚌𝚘𝚗𝚏𝚒𝚐 = { 𝚝𝚒𝚖𝚎𝚘𝚞𝚝: 𝟻𝟶𝟶𝟶, 𝚛𝚎𝚝𝚛𝚒𝚎𝚜: 𝟹 };
\`\`\`

Status: Verified 100% lossless.`;

export const PANOPTES_FIXTURES: Record<string, string> = {
  multiArtifactSupportTicket,
  multiArtifactTechSpec,
};
