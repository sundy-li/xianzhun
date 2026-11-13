import test from 'node:test';
import assert from 'node:assert/strict';
import { ClippingMonitor, SignalGate } from './signalGate';

const FRAME_MS = 28;
const dbToRms = (db: number) => Math.pow(10, db / 20);

/** Feeds a level curve (dB as a function of seconds) frame by frame. */
function feed(gate: SignalGate, fromSec: number, toSec: number, levelDb: (t: number) => number) {
  const readings = [];
  for (let ms = fromSec * 1000; ms < toSec * 1000; ms += FRAME_MS) {
    readings.push({ t: ms / 1000, ...gate.update(dbToRms(levelDb(ms / 1000)), ms) });
  }
  return readings;
}

/** Plucked note: jumps to peakDb at onsetSec, then decays linearly in dB toward the background. */
function pluck(backgroundDb: number, onsetSec: number, peakDb: number, decayDbPerSec: number) {
  return (t: number) => {
    if (t < onsetSec) return backgroundDb;
    const note = peakDb - decayDbPerSec * (t - onsetSec);
    // Power sum of the note and the background
    return 10 * Math.log10(Math.pow(10, note / 10) + Math.pow(10, backgroundDb / 10));
  };
}

test('SignalGate never starts a track on hum that is already present', () => {
  const gate = new SignalGate();
  const readings = feed(gate, 0, 10, () => -34);
  assert.ok(readings.every((r) => !r.canStartTrack));
});

test('SignalGate starts a track shortly after a pluck, then stops allowing new starts', () => {
  const gate = new SignalGate();
  const readings = feed(gate, 0, 4, pluck(-70, 1, -20, 4));
  const starts = readings.filter((r) => r.canStartTrack);
  assert.ok(starts.length > 0);
  const firstStart = starts[0].t;
  assert.ok(firstStart > 1 && firstStart < 1.15, `first start at ${firstStart}s`);
  assert.ok(starts.every((r) => r.t < 2.0), 'start window should close within ~1 s');
});

test('SignalGate keeps a decaying string above the floor but drops the hum left after it', () => {
  const gate = new SignalGate();
  const readings = feed(gate, 0, 10, pluck(-34, 2, -14, 4));
  const at = (sec: number) => readings.find((r) => Math.abs(r.t - sec) < FRAME_MS / 2000)!;
  // 3 s after the pluck the note is still ~8 dB over the hum
  assert.ok(at(5).aboveFloor, 'note should still be above the floor at 5 s');
  // By 8 s the note has decayed into the hum
  assert.ok(!at(8.5).aboveFloor, 'hum after the note should be below the gate');
});

test('SignalGate lifts a sound that switched on and then holds still into the floor', () => {
  const gate = new SignalGate();
  const readings = feed(gate, 0, 6, (t) => (t < 1 ? -70 : -34));
  assert.ok(readings.some((r) => r.canStartTrack), 'the switch-on looks like an onset');
  const late = readings.filter((r) => r.t > 3.3);
  assert.ok(late.length > 0 && late.every((r) => !r.aboveFloor), 'steady sound must be gated after ~2 s');
});

test('SignalGate does not mistake a slowly decaying sustain for steady background', () => {
  const gate = new SignalGate();
  const readings = feed(gate, 0, 10, pluck(-70, 1, -20, 1));
  const sustain = readings.filter((r) => r.t > 1.2 && r.t < 9);
  assert.ok(sustain.every((r) => r.aboveFloor), 'a 1 dB/s sustain should stay above the floor');
});

test('SignalGate keeps a loud long sustain in a quiet room until the detector RMS limit', () => {
  // -14 dB peak decaying 2 dB/s reaches the detector's 0.009 RMS limit (-41 dB) after ~13.5 s
  const gate = new SignalGate();
  const readings = feed(gate, 0, 14.5, pluck(-70, 1, -14, 2));
  const sustain = readings.filter((r) => r.t > 1.2 && r.t < 14.4);
  assert.ok(sustain.every((r) => r.aboveFloor), 'the floor must not catch up with the note');
});

test('ClippingMonitor flags full-scale samples and clears after the hold time', () => {
  const monitor = new ClippingMonitor();
  const clean = new Float32Array(4096).fill(0.5);
  const clipped = new Float32Array(4096).fill(0.5);
  clipped[10] = 1;
  clipped[20] = -1;
  clipped[30] = 1;
  const oneClick = new Float32Array(4096).fill(0.5);
  oneClick[10] = 1;

  assert.equal(monitor.update(clean, 0), false);
  assert.equal(monitor.update(oneClick, 30), false, 'a single full-scale sample is not overload');
  assert.equal(monitor.update(clipped, 60), true);
  assert.equal(monitor.update(clean, 1000), true, 'warning holds briefly');
  assert.equal(monitor.update(clean, 1700), false);
});
