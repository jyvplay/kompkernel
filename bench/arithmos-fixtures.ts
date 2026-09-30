/** Real o200k_base fixtures for ARITHMOS. */
import { arithmosDecode, arithmosDecoderPrompt, arithmosEncode } from '../src/lib/omega/arithmos';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';

const ENC: EncodingName = 'o200k_base';

function digits(value: number | string, base: number): string {
  return String(value).replace(/[0-9]/g, (d) => String.fromCodePoint(base + Number(d)));
}

/** A realistic bilingual export: English accounting labels, Arabic-locale
 * numerals.  It is deliberately non-repeating in its values, not a synthetic
 * run of one digit.  This is the everyday invoice/receipt shape ARITHMOS
 * targets. */
export const arabicIndicInvoiceLedger = Array.from({ length: 60 }, (_, i) => {
  const invoice = 100000 + i * 7919;
  const units = 100 + i * 71;
  const price = 9000 + i * 173;
  const date = 20260900 + i;
  return `Invoice ${digits(invoice, 0x0660)}: ${digits(units, 0x0660)} units, unit price ${digits(price, 0x0660)}; shipment ${digits(date, 0x0660)}.`;
}).join('\n');

export const persianPurchaseOrder = [
  'سفارش خرید شماره ' + digits(1405123456, 0x06f0) + ' ثبت شد.',
  'تاریخ تحویل ' + digits(14050930, 0x06f0) + ' و مبلغ ' + digits(987654321, 0x06f0) + ' ریال است.',
  'شماره پیگیری ' + digits(7019283645, 0x06f0) + ' را برای پاسخ‌گویی نگه دارید.',
].join(' ');

export const devanagariSchoolNotice = [
  'कक्षा ' + digits(12, 0x0966) + ' की परीक्षा ' + digits(20260930, 0x0966) + ' को होगी।',
  'कमरा ' + digits(204, 0x0966) + ', समय ' + digits(930, 0x0966) + ', छात्र संख्या ' + digits(1234567890, 0x0966) + '।',
].join(' ');

export const bengaliDispatchNotice = [
  'চালান নম্বর ' + digits(202609301, 0x09e6) + ' আজ পাঠানো হয়েছে।',
  'অর্ডার ' + digits(481275, 0x09e6) + ', পরিমাণ ' + digits(1250, 0x09e6) + ', ট্র্যাকিং ' + digits(9081726354, 0x09e6) + '।',
].join(' ');

export const thaiInventoryNotice = [
  'ใบรับสินค้าเลขที่ ' + digits(20260930, 0x0e50) + ' ได้รับแล้ว',
  'รายการ ' + digits(481275, 0x0e50) + ' จำนวน ' + digits(1250, 0x0e50) + ' ติดตาม ' + digits(9081726354, 0x0e50),
].join(' ');

export const cleanEnglishProse = 'The finance team will review the quarterly plan on Thursday and publish the approved schedule after the final meeting.';
export const mixedScriptControl = 'Arabic locale ١٢٣ mixed with ASCII 456 must preserve both scripts exactly.';
export const isolatedNativeDigit = 'The reviewer added a single note marked ٣ beside the paragraph.';

export const ARITHMOS_FIXTURES: Record<string, string> = {
  arabicIndicInvoiceLedger,
  persianPurchaseOrder,
  devanagariSchoolNotice,
  bengaliDispatchNotice,
  thaiInventoryNotice,
  cleanEnglishProse,
  mixedScriptControl,
  isolatedNativeDigit,
};

function main() {
  console.log('=== ARITHMOS fixture report (live o200k_base) ===');
  for (const [name, text] of Object.entries(ARITHMOS_FIXTURES)) {
    const r = arithmosEncode(text, ENC, { budgetMs: 3000, maxArms: 2 });
    const exact = arithmosDecode(r.wire) === text;
    const promptOk = arithmosDecoderPrompt(r.wire) === r.decoderPrompt;
    const saved = r.inTokens - r.messageTokens;
    const pct = r.inTokens ? (100 * saved / r.inTokens).toFixed(1) : '0.0';
    console.log(`${name.padEnd(27)} raw=${String(countTokens(text, ENC)).padStart(5)} delivered=${String(r.messageTokens).padStart(5)} saved=${String(saved).padStart(5)} (${pct}%) applied=${r.arithmosApplied} spans=${r.arithmosSpans} exact=${exact} prompt=${promptOk}`);
    if (!exact || !promptOk) throw new Error(`fixture failure: ${name}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
