/**
 * Level-based gating that keeps steady background sounds (transformer / fridge / fan hum at
 * 100-120 Hz) from being read as a guitar string. A periodic hum passes the pitch detector with
 * clarity ~1.0, so it has to be rejected by its behaviour over time instead:
 *
 * - A new pitch track may only start right after an onset (level jump, i.e. a pluck).
 *   A hum that is already present never produces one.
 * - An active track ends once the level falls back near the noise floor. The floor follows
 *   quiet passages immediately and rises toward sustained sound very slowly (30 s half-life),
 *   so a decaying string stays well above it while the hum that remains after it does not.
 * - A level that does not move for a couple of seconds (a hum that switched on, which does have
 *   an onset) is lifted into the floor. A plucked string always decays, so it never holds still.
 */
export interface SignalGateOptions {
  /** Half-life of the floor rising toward a sustained level. */
  floorRiseHalfLifeMs?: number;
  /** Level jump over the recent minimum that counts as an onset. */
  onsetRiseDb?: number;
  /** How far back the onset detector looks for the pre-pluck minimum. */
  onsetLookbackMs?: number;
  /** How long after an onset a new pitch track may start. */
  onsetArmMs?: number;
  /** Minimum distance above the floor for frames of an active track. */
  minAboveFloorDb?: number;
  /** Wait after an onset so the analysis window holds mostly the new note, not the sound before it. */
  startDelayMs?: number;
  /** A level that stays within steadyRangeDb for this long is treated as background. */
  steadyWindowMs?: number;
  steadyRangeDb?: number;
}

export interface SignalGateReading {
  levelDb: number;
  floorDb: number;
  /** An onset happened recently, so a new pitch track may start. */
  canStartTrack: boolean;
  /** The level is far enough above the noise floor to keep an active track. */
  aboveFloor: boolean;
}

const SILENCE_DB = -120;

export function rmsToDb(rms: number): number {
  return rms > 0 ? Math.max(SILENCE_DB, 20 * Math.log10(rms)) : SILENCE_DB;
}

export class SignalGate {
  private readonly floorRiseHalfLifeMs: number;
  private readonly onsetRiseDb: number;
  private readonly onsetLookbackMs: number;
  private readonly onsetArmMs: number;
  private readonly minAboveFloorDb: number;
  private readonly startDelayMs: number;
  private readonly steadyWindowMs: number;
  private readonly steadyRangeDb: number;

  private floorDb: number | null = null;
  private lastUpdateMs = 0;
  private onsetMs = -Infinity;
  private wasRising = false;
  private history: { t: number; db: number }[] = [];

  constructor(options: SignalGateOptions = {}) {
    this.floorRiseHalfLifeMs = options.floorRiseHalfLifeMs ?? 30000;
    this.onsetRiseDb = options.onsetRiseDb ?? 6;
    this.onsetLookbackMs = options.onsetLookbackMs ?? 400;
    this.onsetArmMs = options.onsetArmMs ?? 800;
    this.minAboveFloorDb = options.minAboveFloorDb ?? 6;
    this.startDelayMs = options.startDelayMs ?? 90;
    this.steadyWindowMs = options.steadyWindowMs ?? 2000;
    this.steadyRangeDb = options.steadyRangeDb ?? 1.0;
  }

  reset(): void {
    this.floorDb = null;
    this.lastUpdateMs = 0;
    this.onsetMs = -Infinity;
    this.wasRising = false;
    this.history = [];
  }

  update(rms: number, nowMs: number): SignalGateReading {
    const levelDb = rmsToDb(rms);

    const keepMs = Math.max(this.onsetLookbackMs, this.steadyWindowMs);
    while (this.history.length > 0 && this.history[0].t < nowMs - keepMs) {
      this.history.shift();
    }

    // Onset: rise over the quietest level of the lookback window (excluding this frame)
    let recentMinDb = Infinity;
    for (const h of this.history) {
      if (h.t >= nowMs - this.onsetLookbackMs && h.db < recentMinDb) recentMinDb = h.db;
    }
    // Stamp only the first frame of a rise; the level stays high for the whole lookback window
    const rising = recentMinDb !== Infinity && levelDb - recentMinDb >= this.onsetRiseDb;
    if (rising && !this.wasRising) {
      this.onsetMs = nowMs;
    }
    this.wasRising = rising;
    this.history.push({ t: nowMs, db: levelDb });

    // Noise floor: drop immediately, rise slowly
    if (this.floorDb === null) {
      this.floorDb = levelDb;
    } else if (levelDb <= this.floorDb) {
      this.floorDb = levelDb;
    } else {
      const dt = Math.max(0, nowMs - this.lastUpdateMs);
      const rise = 1 - Math.pow(0.5, dt / this.floorRiseHalfLifeMs);
      this.floorDb += (levelDb - this.floorDb) * rise;
    }
    this.lastUpdateMs = nowMs;

    // Steady level over the whole window: background sound, lift it into the floor
    const oldest = this.history[0];
    if (oldest && nowMs - oldest.t >= this.steadyWindowMs * 0.95) {
      let minDb = Infinity;
      let maxDb = -Infinity;
      for (const h of this.history) {
        if (h.db < minDb) minDb = h.db;
        if (h.db > maxDb) maxDb = h.db;
      }
      if (maxDb - minDb < this.steadyRangeDb && minDb > this.floorDb) {
        this.floorDb = minDb;
      }
    }

    const sinceOnset = nowMs - this.onsetMs;
    return {
      levelDb,
      floorDb: this.floorDb,
      canStartTrack: sinceOnset >= this.startDelayMs && sinceOnset <= this.startDelayMs + this.onsetArmMs,
      aboveFloor: levelDb - this.floorDb >= this.minAboveFloorDb,
    };
  }
}

export interface ClippingMonitorOptions {
  /** Absolute sample value treated as clipped. */
  clipLevel?: number;
  /** Clipped samples needed to flag one frame. */
  minClippedSamples?: number;
  /** How long the warning stays up after the last clipped frame. */
  holdMs?: number;
}

/**
 * Flags input overload. Clipped samples sit at full scale on the raw (pre-filter) input;
 * a few in a frame are enough to distort the waveform and make the pitch jump.
 */
export class ClippingMonitor {
  private readonly clipLevel: number;
  private readonly minClippedSamples: number;
  private readonly holdMs: number;
  private lastClipMs = -Infinity;

  constructor(options: ClippingMonitorOptions = {}) {
    this.clipLevel = options.clipLevel ?? 0.98;
    this.minClippedSamples = options.minClippedSamples ?? 3;
    this.holdMs = options.holdMs ?? 1500;
  }

  reset(): void {
    this.lastClipMs = -Infinity;
  }

  update(rawBuffer: Float32Array, nowMs: number): boolean {
    let clipped = 0;
    for (let i = 0; i < rawBuffer.length; i++) {
      if (Math.abs(rawBuffer[i]) >= this.clipLevel) {
        clipped++;
        if (clipped >= this.minClippedSamples) {
          this.lastClipMs = nowMs;
          break;
        }
      }
    }
    return nowMs - this.lastClipMs <= this.holdMs;
  }
}
