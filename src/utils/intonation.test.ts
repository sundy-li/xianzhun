import test from 'node:test';
import assert from 'node:assert/strict';
import { StableReadingCapture, assessIntonation, isNearExpected } from './intonation';

const cents = (freq: number, c: number) => freq * Math.pow(2, c / 1200);
const FRAME_MS = 28;

test('assessIntonation: exact octave is ok', () => {
  const r = assessIntonation(82.41, 164.82);
  assert.equal(r.verdict, 'ok');
  assert.ok(Math.abs(r.cents) < 0.1);
});

test('assessIntonation: sharp 12th fret means move saddle back', () => {
  const r = assessIntonation(110, cents(220, 8));
  assert.equal(r.verdict, 'sharp');
  assert.ok(Math.abs(r.cents - 8) < 0.01);
  // About 0.37 mm per cent on a 648 mm scale
  assert.ok(r.saddleMoveMm > 2.9 && r.saddleMoveMm < 3.1, `${r.saddleMoveMm}`);
});

test('assessIntonation: flat 12th fret means move saddle forward', () => {
  const r = assessIntonation(196, cents(392, -5));
  assert.equal(r.verdict, 'flat');
  assert.ok(r.saddleMoveMm < 0);
});

test('assessIntonation: tolerance boundary', () => {
  assert.equal(assessIntonation(100, cents(200, 2.9)).verdict, 'ok');
  assert.equal(assessIntonation(100, cents(200, -3.2)).verdict, 'flat');
});

test('StableReadingCapture: captures a steady note after the window', () => {
  const cap = new StableReadingCapture();
  let captured: number | null = null;
  let t = 0;
  for (; t < 2000 && captured === null; t += FRAME_MS) {
    captured = cap.push(cents(146.83, Math.sin(t / 50)), t);
  }
  assert.ok(captured !== null);
  assert.ok(t >= 600 && t < 700, `captured at ${t}ms`);
  assert.ok(Math.abs(1200 * Math.log2(captured! / 146.83)) < 1.5);
});

test('StableReadingCapture: ignores the sharp attack glide', () => {
  const cap = new StableReadingCapture();
  let captured: number | null = null;
  for (let t = 0; t < 3000 && captured === null; t += FRAME_MS) {
    // Starts 20 cents sharp and settles over 300 ms
    const glide = t < 300 ? 20 * (1 - t / 300) : 0;
    captured = cap.push(cents(220, glide), t);
  }
  assert.ok(captured !== null);
  assert.ok(Math.abs(1200 * Math.log2(captured! / 220)) < 2);
});

test('StableReadingCapture: never captures a wobbling pitch', () => {
  const cap = new StableReadingCapture();
  for (let t = 0; t < 3000; t += FRAME_MS) {
    assert.equal(cap.push(cents(220, 15 * Math.sin(t / 60)), t), null);
  }
});

test('StableReadingCapture: a dropout restarts the window', () => {
  const cap = new StableReadingCapture();
  for (let t = 0; t < 400; t += FRAME_MS) cap.push(110, t);
  cap.push(0, 400);
  assert.equal(cap.progress(400), 0);
  assert.equal(cap.push(110, 450), null);
});

test('isNearExpected', () => {
  assert.ok(isNearExpected(cents(82.41, 90), 82.41, 150));
  assert.ok(!isNearExpected(110, 82.41, 150));
});
