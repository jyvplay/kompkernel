import { countTokens } from '@/lib/omega/bpe';
const c = [
 '8-digit runs that are valid dates (month 01-12, real day) become YYYY-MM-DD.',
 'An 8-digit run that is a valid date becomes YYYY-MM-DD.',
 '8-digit runs that are valid dates become YYYY-MM-DD.',
 'T+6 digits is HH:MM:SS; T+4 is HH:MM.',
 'After T, 6 digits are HH:MM:SS and 4 are HH:MM.',
 'T then 6 digits is HH:MM:SS and 4 is HH:MM.',
 'After a date and a space, 6 digits are HH:MM:SS and 4 are HH:MM.',
 'After a date and a space, 6 digits are HH:MM:SS, 4 are HH:MM.',
 'A date followed by a space and 6 digits: the digits are HH:MM:SS.',
];
for (const s of c) console.log(String(countTokens(s,'o200k_base')).padStart(3), s);
