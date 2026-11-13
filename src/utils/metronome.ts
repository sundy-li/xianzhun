export interface TimeSignature {
  id: string;
  label: string;
  beatsPerBar: number;
  beatUnit: 4 | 8;
  secondaryAccents: number[]; // 0-based beat indices that get secondary emphasis (e.g., beat 3 in 6/8)
}

export type BeatEmphasis = 'accent' | 'secondary' | 'normal';

export const MIN_BPM = 30;
export const MAX_BPM = 240;
export const DEFAULT_BPM = 90;

export const TIME_SIGNATURES: TimeSignature[] = [
  {
    id: '4/4',
    label: '4/4',
    beatsPerBar: 4,
    beatUnit: 4,
    secondaryAccents: [],
  },
  {
    id: '3/4',
    label: '3/4',
    beatsPerBar: 3,
    beatUnit: 4,
    secondaryAccents: [],
  },
  {
    id: '2/4',
    label: '2/4',
    beatsPerBar: 2,
    beatUnit: 4,
    secondaryAccents: [],
  },
  {
    id: '6/8',
    label: '6/8',
    beatsPerBar: 6,
    beatUnit: 8,
    secondaryAccents: [3],
  },
  {
    id: '5/4',
    label: '5/4',
    beatsPerBar: 5,
    beatUnit: 4,
    secondaryAccents: [3],
  },
  {
    id: '7/8',
    label: '7/8',
    beatsPerBar: 7,
    beatUnit: 8,
    secondaryAccents: [2, 4],
  },
];

export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) return DEFAULT_BPM;
  return Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(bpm)));
}

export function getTimeSignatureById(id: string): TimeSignature {
  return TIME_SIGNATURES.find((ts) => ts.id === id) ?? TIME_SIGNATURES[0];
}

export function getBeatIntervalSeconds(bpm: number): number {
  const safeBpm = clampBpm(bpm);
  return 60 / safeBpm;
}

export function getBeatEmphasis(
  beatIndex: number,
  timeSignature: TimeSignature,
  accentFirstBeat: boolean
): BeatEmphasis {
  if (beatIndex === 0 && accentFirstBeat) {
    return 'accent';
  }
  if (accentFirstBeat && timeSignature.secondaryAccents.includes(beatIndex)) {
    return 'secondary';
  }
  return 'normal';
}

export type TempoMarking = 'largo' | 'adagio' | 'andante' | 'allegretto' | 'allegro' | 'presto';

export function getTempoMarking(bpm: number): TempoMarking {
  const safe = clampBpm(bpm);
  if (safe < 60) return 'largo';
  if (safe < 76) return 'adagio';
  if (safe < 108) return 'andante';
  if (safe < 132) return 'allegretto';
  if (safe < 168) return 'allegro';
  return 'presto';
}

export function computeTapTempoBpm(timestampsMs: number[]): number | null {
  if (timestampsMs.length < 2) return null;
  const recent = timestampsMs.slice(-5);
  let totalDiff = 0;
  let count = 0;
  for (let i = 1; i < recent.length; i++) {
    const diff = recent[i] - recent[i - 1];
    if (diff >= 200 && diff <= 2500) {
      totalDiff += diff;
      count++;
    }
  }
  if (count === 0) return null;
  const avgMs = totalDiff / count;
  return clampBpm(60000 / avgMs);
}
