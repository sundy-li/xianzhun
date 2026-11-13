import test from 'node:test';
import assert from 'node:assert/strict';
import { detectLang } from './detect';
import { en } from './en';
import { zh } from './zh';
import { STANDARD_TUNINGS } from '../utils/musicTheory';
import { TIME_SIGNATURES } from '../utils/metronome';

test('detectLang: saved choice wins', () => {
  assert.equal(detectLang('en', ['zh-CN']), 'en');
  assert.equal(detectLang('zh', ['en-US']), 'zh');
});

test('detectLang: browser language list', () => {
  assert.equal(detectLang(null, ['zh-TW', 'en']), 'zh');
  assert.equal(detectLang(null, ['en-GB', 'zh-CN']), 'en');
  assert.equal(detectLang(null, ['fr-FR', 'zh-CN']), 'zh');
  assert.equal(detectLang(null, ['fr-FR']), 'en');
  assert.equal(detectLang('garbage', []), 'en');
});

/** Collects key paths, with the kind of each leaf, so both languages can be compared. */
function shape(obj: unknown, prefix = ''): string[] {
  if (typeof obj === 'function') return [`${prefix}:fn${(obj as (...a: unknown[]) => unknown).length}`];
  if (Array.isArray(obj)) return [`${prefix}:array${obj.length}`];
  if (obj && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .flatMap((k) => shape((obj as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k));
  }
  return [`${prefix}:${typeof obj}`];
}

test('en and zh have the same keys', () => {
  assert.deepEqual(shape(en), shape(zh));
});

test('every built-in tuning and time signature is translated', () => {
  for (const p of STANDARD_TUNINGS) {
    assert.ok(zh.presets[p.id] && en.presets[p.id], p.id);
  }
  for (const ts of TIME_SIGNATURES) {
    assert.ok(zh.metronome.timeSigDesc[ts.id] && en.metronome.timeSigDesc[ts.id], ts.id);
  }
});
