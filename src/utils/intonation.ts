import { getCentsDifference } from './musicTheory';

/**
 * Intonation check: the note fretted at the 12th fret should sound exactly one octave above
 * the open string. If it is sharp the vibrating length is too short and the saddle must move
 * back (away from the neck); if it is flat the saddle must move forward.
 */

/** Deviation within this range counts as good intonation. */
export const INTONATION_OK_CENTS = 3;

/** Typical scale lengths (mm) used to estimate how far to move the saddle. */
export const DEFAULT_SCALE_LENGTH_MM = 648;

export type IntonationVerdict = 'ok' | 'sharp' | 'flat';

export interface IntonationResult {
  openFreq: number;
  frettedFreq: number;
  /** Fretted 12th note relative to twice the open string frequency. */
  cents: number;
  verdict: IntonationVerdict;
  /** Estimated saddle movement in mm (positive = move back, away from the neck). */
  saddleMoveMm: number;
}

export function assessIntonation(
  openFreq: number,
  frettedFreq: number,
  scaleLengthMm: number = DEFAULT_SCALE_LENGTH_MM
): IntonationResult {
  const cents = getCentsDifference(frettedFreq, openFreq * 2);
  const verdict: IntonationVerdict =
    Math.abs(cents) <= INTONATION_OK_CENTS ? 'ok' : cents > 0 ? 'sharp' : 'flat';
  // Lengthening the string by d (fret positions fixed) lowers the 12th fret relative to the
  // octave by about 1200/ln2 * d/L cents, so d ≈ cents * L / 1731.
  const saddleMoveMm = (cents * scaleLengthMm * Math.LN2) / 1200;
  return { openFreq, frettedFreq, cents, verdict, saddleMoveMm };
}

export interface StableCaptureOptions {
  /** How long the reading must stay steady before it is accepted. */
  windowMs: number;
  /** Max spread (max - min) of readings inside the window, in cents. */
  maxSpreadCents: number;
  /** Minimum number of readings inside the window. */
  minSamples: number;
}

const DEFAULT_CAPTURE: StableCaptureOptions = {
  windowMs: 600,
  maxSpreadCents: 6,
  minSamples: 8,
};

/**
 * Collects pitch readings of one plucked note and returns their median once they have stayed
 * within a narrow band for a while. The attack of a pluck glides a few cents sharp, so the
 * window only fills after the note settles.
 */
export class StableReadingCapture {
  private samples: { freq: number; t: number }[] = [];
  private readonly opts: StableCaptureOptions;

  constructor(opts: Partial<StableCaptureOptions> = {}) {
    this.opts = { ...DEFAULT_CAPTURE, ...opts };
  }

  reset(): void {
    this.samples = [];
  }

  /** 0..1 share of the window that is already steady, for a progress indicator. */
  progress(nowMs: number): number {
    if (this.samples.length === 0) return 0;
    const span = nowMs - this.samples[0].t;
    return Math.max(0, Math.min(1, span / this.opts.windowMs));
  }

  /** Feeds one reading; returns the captured frequency once stable, otherwise null. */
  push(freq: number, nowMs: number): number | null {
    if (!(freq > 0)) {
      this.reset();
      return null;
    }
    this.samples.push({ freq, t: nowMs });

    // Drop older readings that disagree with the newest one, so the window restarts
    // after a pitch change or the attack glide.
    const newest = freq;
    let firstKept = this.samples.length - 1;
    for (let i = this.samples.length - 1; i >= 0; i--) {
      if (Math.abs(getCentsDifference(this.samples[i].freq, newest)) > this.opts.maxSpreadCents) break;
      firstKept = i;
    }
    this.samples = this.samples.slice(firstKept);

    let freqs = this.samples.map((s) => s.freq);
    while (freqs.length > 1 && spreadCents(freqs) > this.opts.maxSpreadCents) {
      this.samples.shift();
      freqs = this.samples.map((s) => s.freq);
    }

    const span = nowMs - this.samples[0].t;
    if (span >= this.opts.windowMs && this.samples.length >= this.opts.minSamples) {
      return median(freqs);
    }
    return null;
  }
}

function spreadCents(freqs: number[]): number {
  let lo = Infinity;
  let hi = -Infinity;
  for (const f of freqs) {
    if (f < lo) lo = f;
    if (f > hi) hi = f;
  }
  return getCentsDifference(hi, lo);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Whether a reading is plausibly the expected note (guards against plucking the wrong string). */
export function isNearExpected(freq: number, expectedFreq: number, maxCents: number): boolean {
  return Math.abs(getCentsDifference(freq, expectedFreq)) <= maxCents;
}
