import { countTokens } from '@/lib/omega/bpe';
const c = [
 'In a run of digits, 8 digits that read as a valid date (month 01-12, day inside the month, leap years counted) are written YYYY-MM-DD.',
 'T then 6 digits is HH:MM:SS; T then 4 digits is HH:MM.',
 'After a date and a space, 6 digits are HH:MM:SS and 4 digits are HH:MM.',
 '8-digit runs that are valid dates become YYYY-MM-DD.',
 'An 8-digit run that is a valid date is written YYYY-MM-DD.',
 'Dates have no dashes: an 8-digit run that is a valid date is YYYY-MM-DD.',
 'Dates and times have no separators: 8 digits that form a valid date are YYYY-MM-DD; T then 6 digits is HH:MM:SS.',
 'Restore ISO dates and clocks: an 8-digit run that is a valid date takes dashes; T then 6 digits is HH:MM:SS.',
 '8-digit runs: if valid, YYYY-MM-DD. T+6 digits: HH:MM:SS. T+4: HH:MM.',
 'In digits: 8 valid-date digits are YYYY-MM-DD; T+6 are HH:MM:SS; T+4 are HH:MM.',
 '8-digit runs that are valid dates get dashes (YYYY-MM-DD).',
 'T+6 digits is HH:MM:SS; T+4 is HH:MM.',
 'Dates lack dashes: 8 digits forming a valid date are YYYY-MM-DD.',
 'After a date and a space, 6 digits are a clock: HH:MM:SS.',
];
for (const s of c) console.log(String(countTokens(s,'o200k_base')).padStart(3), s);
