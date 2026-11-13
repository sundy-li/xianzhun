export interface PitchDetectionResult {
  frequency: number;
  clarity: number;
  rms: number;
}

export interface YinOptions {
  minFrequency?: number;
  maxFrequency?: number;
  threshold?: number;
  minRms?: number;
}

export function computeRms(buffer: Float32Array): number {
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i++) {
    const sample = buffer[i];
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / buffer.length);
}

function parabolicInterpolate(yinBuffer: Float32Array, tau: number, maxTau: number): number {
  if (tau <= 1 || tau >= maxTau) return tau;
  const s0 = yinBuffer[tau - 1];
  const s1 = yinBuffer[tau];
  const s2 = yinBuffer[tau + 1];
  const denominator = 2 * (2 * s1 - s2 - s0);
  if (Math.abs(denominator) <= 1e-12) return tau;
  const adjustment = (s2 - s0) / denominator;
  return Math.abs(adjustment) < 1 ? tau + adjustment : tau;
}

function findLocalMinimumNear(
  yinBuffer: Float32Array,
  centerTau: number,
  minTau: number,
  maxTau: number
): number {
  const radius = Math.max(2, Math.round(centerTau * 0.06));
  const start = Math.max(minTau, centerTau - radius);
  const end = Math.min(maxTau, centerTau + radius);
  let bestIdx = centerTau;
  let bestVal = yinBuffer[centerTau] ?? 1;
  for (let t = start; t <= end; t++) {
    if (yinBuffer[t] < bestVal) {
      bestVal = yinBuffer[t];
      bestIdx = t;
    }
  }
  return bestIdx;
}

/**
 * Enhanced YIN fundamental frequency estimator (stringSync / YIN paper inspired):
 * 1. DC-offset removal + zero-bias Tukey weighting on the difference sum so frame edges
 *    are tapered without shifting the true periodicity minimum.
 * 2. Difference & Cumulative Mean Normalized Difference Function (CMNDF).
 * 3. Strict absolute thresholding (~0.11) + sub-harmonic verification to avoid octave jumps.
 * 4. Parabolic interpolation for sub-cent precision.
 */
export function detectPitchYin(
  buffer: Float32Array,
  sampleRate: number,
  options: YinOptions = {}
): PitchDetectionResult | null {
  const minFrequency = options.minFrequency ?? 60;
  const maxFrequency = options.maxFrequency ?? 1100;
  const threshold = options.threshold ?? 0.11;
  const minRms = options.minRms ?? 0.009;

  // Step 0: Remove DC offset before RMS and YIN difference calculation
  const n = buffer.length;
  let mean = 0;
  for (let i = 0; i < n; i++) {
    mean += buffer[i];
  }
  mean /= n;

  const centered = new Float32Array(n);
  let sumSquares = 0;
  for (let i = 0; i < n; i++) {
    const rawCentered = buffer[i] - mean;
    centered[i] = rawCentered;
    sumSquares += rawCentered * rawCentered;
  }

  const rms = Math.sqrt(sumSquares / n);
  if (rms < minRms) {
    return null;
  }

  const halfBufferSize = Math.floor(n / 2);
  const minTau = Math.max(2, Math.floor(sampleRate / maxFrequency));
  const maxTau = Math.min(halfBufferSize - 2, Math.floor(sampleRate / minFrequency));

  if (maxTau <= minTau) {
    return null;
  }

  // Precompute zero-bias Tukey edge weights over [0, halfBufferSize)
  const weights = new Float32Array(halfBufferSize);
  const taperLen = Math.floor((halfBufferSize * 0.16) / 2);
  for (let i = 0; i < halfBufferSize; i++) {
    if (taperLen > 0 && i < taperLen) {
      weights[i] = 0.5 * (1 - Math.cos((Math.PI * i) / taperLen));
    } else if (taperLen > 0 && i >= halfBufferSize - taperLen) {
      weights[i] = 0.5 * (1 - Math.cos((Math.PI * (halfBufferSize - 1 - i)) / taperLen));
    } else {
      weights[i] = 1;
    }
  }

  const yinBuffer = new Float32Array(maxTau + 2);

  // Step 1: Weighted Difference function d(tau)
  for (let tau = 1; tau <= maxTau + 1; tau++) {
    let sum = 0;
    for (let i = 0; i < halfBufferSize; i++) {
      const delta = centered[i] - centered[i + tau];
      sum += weights[i] * delta * delta;
    }
    yinBuffer[tau] = sum;
  }

  // Step 2: Cumulative mean normalized difference function (CMNDF)
  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau <= maxTau + 1; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] = runningSum === 0 ? 1 : (yinBuffer[tau] * tau) / runningSum;
  }

  // Step 3: Strict absolute threshold - find first local minimum below threshold
  let tauEstimate = -1;
  for (let tau = minTau; tau <= maxTau; tau++) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 <= maxTau && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      tauEstimate = tau;
      break;
    }
  }

  // Tightened fallback: reject weak/noisy periodicity (> 0.18) instead of emitting jittery pitches
  if (tauEstimate === -1) {
    let minVal = Infinity;
    let minIdx = -1;
    for (let tau = minTau; tau <= maxTau; tau++) {
      if (yinBuffer[tau] < minVal) {
        minVal = yinBuffer[tau];
        minIdx = tau;
      }
    }
    if (minVal > 0.18 || minIdx === -1) {
      return null;
    }
    tauEstimate = minIdx;
  }

  // Step 3.5: Sub-harmonic / Octave disambiguation
  const baseVal = yinBuffer[tauEstimate];
  if (baseVal > 0.03) {
    for (const mult of [3, 2]) {
      const candidateCenter = tauEstimate * mult;
      if (candidateCenter <= maxTau) {
        const subTau = findLocalMinimumNear(yinBuffer, candidateCenter, minTau, maxTau);
        const subVal = yinBuffer[subTau];
        if (subVal < baseVal * 0.55 && subVal < 0.14) {
          tauEstimate = subTau;
          break;
        }
      }
    }
  }

  // Step 4: Parabolic interpolation for sub-sample precision
  const betterTau = parabolicInterpolate(yinBuffer, tauEstimate, maxTau);
  const frequency = sampleRate / betterTau;

  if (!Number.isFinite(frequency) || frequency < minFrequency || frequency > maxFrequency) {
    return null;
  }

  const clarity = Math.max(0, Math.min(1, 1 - yinBuffer[tauEstimate]));

  return {
    frequency,
    clarity,
    rms,
  };
}

/**
 * Computes a robust frequency estimate from recent readings using median + trimmed mean
 * to eliminate single-frame outliers without making the needle sluggish.
 */
export function filterStableFrequency(samples: number[]): number {
  if (samples.length === 0) return 0;
  if (samples.length === 1) return samples[0];
  const sorted = [...samples].sort((a, b) => a - b);
  if (sorted.length <= 2) {
    return sorted[Math.floor(sorted.length / 2)];
  }
  // Trimmed mean excluding highest and lowest outliers
  let sum = 0;
  for (let i = 1; i < sorted.length - 1; i++) {
    sum += sorted[i];
  }
  return sum / (sorted.length - 2);
}

/**
 * Generates a realistic harmonic-rich guitar-like waveform buffer for deterministic DSP tests and signal simulation.
 */
export function generateGuitarWaveform(
  frequency: number,
  sampleRate: number,
  length: number = 8192,
  amplitude: number = 0.35,
  phaseOffsetSeconds: number = 0,
  strongHarmonics: boolean = false
): Float32Array {
  const buffer = new Float32Array(length);
  const h1 = strongHarmonics ? 0.55 : 1.0;
  const h2 = strongHarmonics ? 0.95 : 0.45;
  const h3 = strongHarmonics ? 0.65 : 0.22;
  const h4 = strongHarmonics ? 0.3 : 0.1;

  for (let i = 0; i < length; i++) {
    const t = phaseOffsetSeconds + i / sampleRate;
    const fundamental = h1 * Math.sin(2 * Math.PI * frequency * t);
    const harmonic2 = h2 * Math.sin(2 * Math.PI * frequency * 2 * t);
    const harmonic3 = h3 * Math.sin(2 * Math.PI * frequency * 3 * t);
    const harmonic4 = h4 * Math.sin(2 * Math.PI * frequency * 4 * t);
    buffer[i] = amplitude * (fundamental + harmonic2 + harmonic3 + harmonic4);
  }
  return buffer;
}
