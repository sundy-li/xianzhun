/**
 * Synthesizes a warm, acoustic-guitar-like plucked reference tone using Web Audio API.
 */
class ReferenceTonePlayer {
  private ctx: AudioContext | null = null;
  private activeTimer: number | null = null;
  private activeNodes: AudioNode[] = [];
  private isLooping = false;

  private ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public playPluck(frequency: number, durationSec: number = 1.6): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.28, now + 0.014);
    masterGain.gain.exponentialRampToValueAtTime(0.08, now + 0.35);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(frequency * 7, 3600), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(frequency * 2, 320), now + durationSec);

    // Fundamental + 2nd & 3rd harmonics for acoustic string timbre
    const harmonics: Array<{ ratio: number; type: OscillatorType; gain: number }> = [
      { ratio: 1, type: 'triangle', gain: 0.7 },
      { ratio: 2, type: 'sine', gain: 0.25 },
      { ratio: 3, type: 'sine', gain: 0.1 },
    ];

    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    const createdOscs: OscillatorNode[] = [];
    for (const h of harmonics) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = h.type;
      osc.frequency.setValueAtTime(frequency * h.ratio, now);
      g.gain.setValueAtTime(h.gain, now);
      osc.connect(g);
      g.connect(filter);
      osc.start(now);
      osc.stop(now + durationSec + 0.05);
      createdOscs.push(osc);
    }

    this.activeNodes.push(masterGain, filter, ...createdOscs);
  }

  public startLoop(frequency: number, onTick?: () => void): void {
    this.stop();
    this.isLooping = true;
    const trigger = () => {
      if (!this.isLooping) return;
      this.playPluck(frequency, 1.45);
      onTick?.();
    };
    trigger();
    this.activeTimer = window.setInterval(trigger, 1500);
  }

  public stop(): void {
    this.isLooping = false;
    if (this.activeTimer !== null) {
      window.clearInterval(this.activeTimer);
      this.activeTimer = null;
    }
    for (const node of this.activeNodes) {
      try {
        if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
          (node as OscillatorNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore already stopped oscillators
      }
    }
    this.activeNodes = [];
  }
}

export const referenceTonePlayer = new ReferenceTonePlayer();
