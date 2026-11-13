export interface TimeSignature {
  id: string;
  label: string;
  beatsPerBar: number;
  beatUnit: 4 | 8;
  secondaryAccents: number[]; // 0-based beat indices that get secondary emphasis (e.g., beat 3 in 6/8)
  description: string;
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
    description: '标准四四拍 · 流行与摇滚常用',
  },
  {
    id: '3/4',
    label: '3/4',
    beatsPerBar: 3,
    beatUnit: 4,
    secondaryAccents: [],
    description: '三四拍 · 民谣分解与华尔兹',
  },
  {
    id: '2/4',
    label: '2/4',
    beatsPerBar: 2,
    beatUnit: 4,
    secondaryAccents: [],
    description: '二四拍 · 轻快行进节奏',
  },
  {
    id: '6/8',
    label: '6/8',
    beatsPerBar: 6,
    beatUnit: 8,
    secondaryAccents: [3],
    description: '六八拍 · 抒情摇摆与慢摇滚',
  },
  {
    id: '5/4',
    label: '5/4',
    beatsPerBar: 5,
    beatUnit: 4,
    secondaryAccents: [3],
    description: '五四拍 · 奇数复合节拍练习',
  },
  {
    id: '7/8',
    label: '7/8',
    beatsPerBar: 7,
    beatUnit: 8,
    secondaryAccents: [2, 4],
    description: '七八拍 · 前卫奇数拍练习',
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

export function getTempoMarking(bpm: number): string {
  const safe = clampBpm(bpm);
  if (safe < 60) return 'Largo · 广板';
  if (safe < 76) return 'Adagio · 柔板';
  if (safe < 108) return 'Andante / Moderato · 行板至中板';
  if (safe < 132) return 'Allegretto · 小快板';
  if (safe < 168) return 'Allegro · 快板';
  return 'Presto · 急板';
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
