import { codecEntries } from '../../src/lib/omega/registry';
console.log('entries', codecEntries().length, 'zygon', codecEntries().some((e: any) => e.key === 'zygon'));
