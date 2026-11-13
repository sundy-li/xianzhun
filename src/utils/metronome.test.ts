import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_BPM,
  MAX_BPM,
  MIN_BPM,
  clampBpm,
  computeTapTempoBpm,
  getBeatEmphasis,
  getBeatIntervalSeconds,
  getTempoMarking,
  getTimeSignatureById,
} from './metronome';

test('clampBpm enforces bounds and handles invalid numbers', () => {
  assert.equal(clampBpm(10), MIN_BPM);
  assert.equal(clampBpm(400), MAX_BPM);
  assert.equal(clampBpm(120.4), 120);
  assert.equal(clampBpm(Number.NaN), DEFAULT_BPM);
});

test('getBeatIntervalSeconds returns exact beat duration in seconds', () => {
  assert.equal(getBeatIntervalSeconds(60), 1);
  assert.equal(getBeatIntervalSeconds(120), 0.5);
});

test('getBeatEmphasis assigns accent, secondary, and normal beats accurately', () => {
  const ts44 = getTimeSignatureById('4/4');
  assert.equal(getBeatEmphasis(0, ts44, true), 'accent');
  assert.equal(getBeatEmphasis(1, ts44, true), 'normal');
  assert.equal(getBeatEmphasis(0, ts44, false), 'normal');

  const ts68 = getTimeSignatureById('6/8');
  assert.equal(getBeatEmphasis(0, ts68, true), 'accent');
  assert.equal(getBeatEmphasis(3, ts68, true), 'secondary');
  assert.equal(getBeatEmphasis(4, ts68, true), 'normal');
});

test('computeTapTempoBpm calculates average BPM from tap intervals', () => {
  assert.equal(computeTapTempoBpm([1000]), null);
  assert.equal(computeTapTempoBpm([1000, 1500, 2000, 2500]), 120);
  assert.equal(computeTapTempoBpm([1000, 1600, 2200]), 100);
});

test('getTempoMarking classifies tempo ranges properly', () => {
  assert.ok(getTempoMarking(50).includes('广板'));
  assert.ok(getTempoMarking(90).includes('中板'));
  assert.ok(getTempoMarking(150).includes('快板'));
});
