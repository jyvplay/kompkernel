import { countTokens } from '../../src/lib/omega/bpe';
const cases = ['-rw-r--r--', 'rwxr-xr-x', '-rwxr-xr-x', 'drwxr-xr-x', 'lrwxrwxrwx',
  '755', '644', ' 755 ', '0755', 'rwxrxrx', 'Jan  2  2024', 'Jan 02 2024', '2024-01-02',
  ' 1234567', '1234567', 'root root', ' root  root ', 'root:root'];
for (const c of cases) console.log(JSON.stringify(c).padEnd(16), countTokens(c, 'o200k_base'));
const nat = '-rw-r--r-- 1 root root 1234567 Jan  2  2024 somefile.txt';
const pac = '644 1 root root 1234567 Jan  2  2024 somefile.txt';
console.log('line natural', countTokens(nat, 'o200k_base'), 'line packed', countTokens(pac, 'o200k_base'));
