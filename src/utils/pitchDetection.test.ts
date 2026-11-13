import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRms,
  detectPitchYin,
  filterStableFrequency,
  generateGuitarWaveform,
} from './pitchDetection';
import { getCentsDifference } from './musicTheory';

test('detectPitchYin returns null on silence or sub-threshold noise', () => {
  const silent = new Float32Array(8192);
  assert.equal(computeRms(silent), 0);
  assert.equal(detectPitchYin(silent, 44100), null);
});

test('detectPitchYin ignores DC offset on mobile MEMS microphones', () => {
  const sampleRate = 48000;
  const targetHz = 82.41; // E2
  const buffer = generateGuitarWaveform(targetHz, sampleRate, 8192, 0.3);
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] += 0.25; // Strong DC bias
  }
  const result = detectPitchYin(buffer, sampleRate);
  assert.ok(result !== null);
  const centsError = Math.abs(getCentsDifference(result.frequency, targetHz));
  assert.ok(centsError < 1.5, `DC offset caused ${centsError} cents error`);
});

test('detectPitchYin accurately detects all 6 standard guitar open strings with harmonics', () => {
  const sampleRate = 48000;
  const openStringsHz = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];

  for (const expectedHz of openStringsHz) {
    const buffer = generateGuitarWaveform(expectedHz, sampleRate, 8192, 0.35);
    const result = detectPitchYin(buffer, sampleRate);
    assert.ok(result !== null, `Expected detection for ${expectedHz} Hz`);
    const centsError = Math.abs(getCentsDifference(result.frequency, expectedHz));
    assert.ok(
      centsError < 1.5,
      `Expected < 1.5 cents error for ${expectedHz} Hz, got ${result.frequency.toFixed(2)} Hz (${centsError.toFixed(2)} cents)`
    );
    assert.ok(result.clarity > 0.85, `Expected high clarity, got ${result.clarity}`);
  }
});

test('detectPitchYin avoids octave jumps when 2nd/3rd harmonics dominate E2 and A2', () => {
  const sampleRate = 48000;
  for (const expectedHz of [82.41, 110.0, 73.42]) {
    const buffer = generateGuitarWaveform(expectedHz, sampleRate, 8192, 0.35, 0, true);
    const result = detectPitchYin(buffer, sampleRate);
    assert.ok(result !== null, `Expected detection for ${expectedHz} Hz with strong harmonics`);
    const centsError = Math.abs(getCentsDifference(result.frequency, expectedHz));
    assert.ok(
      centsError < 2.0,
      `Octave jump or error for ${expectedHz} Hz: got ${result.frequency.toFixed(2)} Hz (${centsError.toFixed(2)} cents)`
    );
  }
});

test('filterStableFrequency removes single-frame outlier spikes', () => {
  const stable = filterStableFrequency([110.0, 110.1, 220.0, 109.9, 110.05]);
  assert.ok(Math.abs(stable - 110.05) < 0.2);
});

test('detectPitchYin rejects non-periodic background room noise', () => {
  const noisy = new Float32Array(8192);
  let seed = 42;
  for (let i = 0; i < noisy.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    noisy[i] = ((seed / 0xffffffff) - 0.5) * 0.2;
  }
  assert.equal(detectPitchYin(noisy, 48000), null);
});

