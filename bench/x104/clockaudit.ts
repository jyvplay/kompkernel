/**
 * X104 — THE DETECTING TEST FOR A LIVE WALL-CLOCK GATE.
 *
 * clock.now() is frozen to 0 under OMEGA_DET=1, so under that flag every gate
 * that routes through clock.now() sees an open budget. A gate that reads
 * Date.now()/performance.now() DIRECTLY still sees real time and can still cut
 * a search short, which makes the emitted wire a function of machine load.
 *
 * This probe is the detector: it encodes the same lane twice in one process,
 * once with the global clocks left alone and once with them patched to a clock
 * that runs one second per call. If ANY gate reads a global clock, the second
 * wire must differ from the first (or the encode must throw). Identical wires
 * are evidence -- not proof -- that no gate on this lane reads a global clock.
 *
 * A control must be checked against a number the code under test did not
 * produce: the control here is the same lane encoded with the patch installed
 * BEFORE any encode runs, so the patch cannot be blamed for a difference the
 * unpatched pass also shows.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0';

const lane = process.argv[2];
const enc: any = 'o200k_base';
const text = fs.readFileSync(lane, 'utf8');

const realDateNow = Date.now.bind(Date);
const realPerfNow = typeof performance !== 'undefined' ? performance.now.bind(performance) : () => 0;

const wireOf = (patch: boolean): { sha: string; tokens: number; bytes: number; err: string | null } => {
  if (patch) {
    let t = 0;
    (Date as any).now = () => { t += 1000; return t; };
    if (typeof performance !== 'undefined') (performance as any).now = () => { t += 1000; return t; };
  } else {
    (Date as any).now = realDateNow;
    if (typeof performance !== 'undefined') (performance as any).now = realPerfNow;
  }
  try {
    const R: any = tagstackEncode(text, enc);
    const wire: string = R.wire ?? '';
    return { sha: hash(wire), tokens: R.messageTokens, bytes: wire.length, err: null };
  } catch (e: any) {
    return { sha: '', tokens: -1, bytes: -1, err: String(e && e.message ? e.message : e) };
  }
};

function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

// control first: patched-from-the-start, so the patch cannot be blamed for
// anything the unpatched pass shows
const ctrl = wireOf(true);
const plain = wireOf(false);
const patched = wireOf(true);

console.log(JSON.stringify({
  lane: lane.split('/').pop(),
  control_patchedFromStart: ctrl,
  plain: plain,
  patched: patched,
  gateDetected: ctrl.sha !== plain.sha || patched.sha !== plain.sha,
}, null, 1));
