// Type-only placeholder for the X60 reproducible speed A/B runner.
// bench/x60/speed-ab-diastema.sh materializes the actual baseline TypeScript
// from commit d7b204a as diastema.before.ts before bundling; no baseline code
// is duplicated or loaded in the shipped application.
import type { EncodingName } from './bpe';
import type { DiastemaPlan, DiastemaResult } from './diastema';
export function diastemaPlan(text: string, enc?: EncodingName): DiastemaPlan | null;
export function diastemaWire(plan: DiastemaPlan, text: string): string | null;
export function diastemaDecode(wire: string): string;
export function diastemaEncode(text: string, enc?: EncodingName, opts?: Record<string, unknown>): DiastemaResult;
