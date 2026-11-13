import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STANDARD_TUNINGS,
  applyCapoToMidi,
  getCentsDifference,
  getTuningGuidance,
  matchChromaticNote,
  matchGuitarString,
  midiToFrequency,
  midiToNoteDisplay,
  shiftStringMidi,
} from './musicTheory';

test('midiToFrequency computes standard A4 and guitar string frequencies accurately', () => {
  assert.equal(midiToFrequency(69, 440), 440);
  assert.ok(Math.abs(midiToFrequency(40, 440) - 82.406889) < 0.001); // E2
  assert.equal(midiToFrequency(45, 440), 110); // A2
  assert.equal(midiToFrequency(45, 432), 108); // A2 at A4=432Hz
});

test('midiToNoteDisplay formats sharps and flats cleanly', () => {
  assert.equal(midiToNoteDisplay(39, 440, true).fullLabel, 'Eb2');
  assert.equal(midiToNoteDisplay(39, 440, false).fullLabel, 'D#2');
  assert.equal(midiToNoteDisplay(64, 440, false).fullLabel, 'E4');
});

test('matchGuitarString auto mode picks closest string and computes cents', () => {
  const standard = STANDARD_TUNINGS[0].strings;
  // Slightly flat A2 (108.5 Hz vs 110 Hz)
  const match = matchGuitarString(108.5, standard, 440, 0, null);
  assert.equal(match.stringNumber, 5);
  assert.equal(match.targetLabel, 'A2');
  assert.ok(match.cents < -20 && match.cents > -26);
});

test('matchGuitarString manual mode locks onto chosen string even if frequency is closer to another string', () => {
  const standard = STANDARD_TUNINGS[0].strings;
  // Lock on String 6 (E2 = 82.41 Hz) even if input is 105 Hz (closer to A2)
  const match = matchGuitarString(105, standard, 440, 0, 6);
  assert.equal(match.stringNumber, 6);
  assert.equal(match.targetLabel, 'E2');
  assert.ok(match.cents > 400);
});

test('capo shifts target frequencies properly', () => {
  const standard = STANDARD_TUNINGS[0].strings;
  const match = matchGuitarString(92.5, standard, 440, 2, 6); // E2 + 2 semitones = F#2 (~92.5 Hz)
  assert.equal(match.targetMidi, applyCapoToMidi(40, 2));
  assert.equal(match.targetLabel, 'F#2');
  assert.ok(Math.abs(match.cents) < 1);
});

test('matchChromaticNote identifies arbitrary notes accurately', () => {
  const match = matchChromaticNote(261.63, 440);
  assert.equal(match.stringNumber, null);
  assert.equal(match.targetLabel, 'C4');
  assert.ok(Math.abs(match.cents) < 1);
});

test('getTuningGuidance returns explicit direction and hint', () => {
  assert.equal(getTuningGuidance(0, 4).direction, 'in-tune');
  assert.equal(getTuningGuidance(-12, 4).direction, 'flat');
  assert.equal(getTuningGuidance(15, 4).direction, 'sharp');
});

test('shiftStringMidi clamps safely within guitar playable range', () => {
  assert.equal(shiftStringMidi(28, -5), 28);
  assert.equal(shiftStringMidi(76, 5), 76);
  assert.equal(shiftStringMidi(40, -2), 38);
});

test('getCentsDifference handles exact octaves and unisons', () => {
  assert.equal(getCentsDifference(440, 440), 0);
  assert.equal(getCentsDifference(880, 440), 1200);
});
