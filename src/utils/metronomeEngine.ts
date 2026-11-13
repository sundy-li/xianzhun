import {
  BeatEmphasis,
  TimeSignature,
  getBeatEmphasis,
  getBeatIntervalSeconds,
} from './metronome';

export interface MetronomeTickInfo {
  beatIndex: number; // 0-based within bar
  barNumber: number; // 1-based bar counter
  emphasis: BeatEmphasis;
}

/**
 * High-precision Web Audio API lookahead metronome scheduler.
 */
export class MetronomeEngine {
  private ctx: AudioContext | null = null;
  private schedulerId: number | null = null;
  private uiTimers: number[] = [];
  private isRunning = false;

  private bpm = 90;
  private timeSignature: TimeSignature;
  private accentFirstBeat = true;

  private nextNoteTime = 0;
  private currentBeat = 0;
  private barNumber = 1;
  private onBeatCallback: ((info: MetronomeTickInfo) => void) | null = null;

  constructor(initialTimeSignature: TimeSignature) {
    this.timeSignature = initialTimeSignature;
  }

  private ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public updateConfig(bpm: number, timeSignature: TimeSignature, accentFirstBeat: boolean): void {
    this.bpm = bpm;
    const changedBarLength = this.timeSignature.beatsPerBar !== timeSignature.beatsPerBar;
    this.timeSignature = timeSignature;
    this.accentFirstBeat = accentFirstBeat;
    if (changedBarLength && this.currentBeat >= timeSignature.beatsPerBar) {
      this.currentBeat = 0;
    }
  }

  public start(onBeat: (info: MetronomeTickInfo) => void): void {
    this.stop();
    const ctx = this.ensureContext();
    this.onBeatCallback = onBeat;
    this.isRunning = true;
    this.currentBeat = 0;
    this.barNumber = 1;
    this.nextNoteTime = ctx.currentTime + 0.04;

    this.scheduler();
    this.schedulerId = window.setInterval(() => this.scheduler(), 25);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    for (const timer of this.uiTimers) {
      window.clearTimeout(timer);
    }
    this.uiTimers = [];
    this.onBeatCallback = null;
  }

  private scheduler(): void {
    if (!this.isRunning || !this.ctx) return;
    const lookaheadSec = 0.11;

    while (this.nextNoteTime < this.ctx.currentTime + lookaheadSec) {
      this.scheduleBeat(this.currentBeat, this.barNumber, this.nextNoteTime);
      const interval = getBeatIntervalSeconds(this.bpm);
      this.nextNoteTime += interval;

      this.currentBeat++;
      if (this.currentBeat >= this.timeSignature.beatsPerBar) {
        this.currentBeat = 0;
        this.barNumber++;
      }
    }
  }

  private scheduleBeat(beatIndex: number, barNumber: number, time: number): void {
    if (!this.ctx) return;

    const emphasis = getBeatEmphasis(beatIndex, this.timeSignature, this.accentFirstBeat);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freq = emphasis === 'accent' ? 1280 : emphasis === 'secondary' ? 980 : 760;
    const peakGain = emphasis === 'accent' ? 0.55 : emphasis === 'secondary' ? 0.36 : 0.24;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.55, time + 0.045);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peakGain, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.065);

    const delayMs = Math.max(0, (time - this.ctx.currentTime) * 1000);
    const timer = window.setTimeout(() => {
      if (!this.isRunning) return;
      this.onBeatCallback?.({ beatIndex, barNumber, emphasis });
    }, delayMs);
    this.uiTimers.push(timer);
    if (this.uiTimers.length > 16) {
      this.uiTimers.shift();
    }
  }
}
