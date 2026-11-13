export interface GuitarStringTarget {
  stringNumber: 1 | 2 | 3 | 4 | 5 | 6; // 6 is thickest (low E), 1 is thinnest (high E)
  midi: number;
}

export interface TuningPreset {
  id: string;
  name: string;
  englishName: string;
  category: 'standard' | 'drop' | 'open' | 'custom';
  description: string;
  strings: GuitarStringTarget[]; // Ordered 6 -> 1 (low to high)
}

export interface NoteDisplay {
  midi: number;
  noteName: string;
  octave: number;
  fullLabel: string;
  frequency: number;
}

export interface TuningMatch {
  stringNumber: number | null; // null in chromatic mode
  targetMidi: number;
  targetLabel: string;
  targetFreq: number;
  detectedFreq: number;
  cents: number;
}

export type TuningDirection = 'flat' | 'in-tune' | 'sharp';

export interface TuningGuidance {
  direction: TuningDirection;
  /** More than 20 cents off: turn the peg further. */
  isLarge: boolean;
}

const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export const MIN_A4_FREQ = 430;
export const MAX_A4_FREQ = 450;
export const DEFAULT_A4_FREQ = 440;

export const MIN_GUITAR_MIDI = 28; // E1 (41.2 Hz)
export const MAX_GUITAR_MIDI = 76; // E5 (659.25 Hz)

export const STANDARD_TUNINGS: TuningPreset[] = [
  {
    id: 'standard',
    name: '标准调弦',
    englishName: 'Standard',
    category: 'standard',
    description: '现代民谣、古典与电吉他最常用的标准六弦定弦',
    strings: [
      { stringNumber: 6, midi: 40 }, // E2
      { stringNumber: 5, midi: 45 }, // A2
      { stringNumber: 4, midi: 50 }, // D3
      { stringNumber: 3, midi: 55 }, // G3
      { stringNumber: 2, midi: 59 }, // B3
      { stringNumber: 1, midi: 64 }, // E4
    ],
  },
  {
    id: 'drop-d',
    name: 'Drop D 降六弦',
    englishName: 'Drop D',
    category: 'drop',
    description: '6 弦降低全音至 D2，适合摇滚、金属与指弹曲风',
    strings: [
      { stringNumber: 6, midi: 38 }, // D2
      { stringNumber: 5, midi: 45 }, // A2
      { stringNumber: 4, midi: 50 }, // D3
      { stringNumber: 3, midi: 55 }, // G3
      { stringNumber: 2, midi: 59 }, // B3
      { stringNumber: 1, midi: 64 }, // E4
    ],
  },
  {
    id: 'half-step-down',
    name: '全体降半音',
    englishName: 'Eb Standard',
    category: 'standard',
    description: '所有琴弦降低半音，降低弦张力并使音色更温暖柔和',
    strings: [
      { stringNumber: 6, midi: 39 }, // Eb2
      { stringNumber: 5, midi: 44 }, // Ab2
      { stringNumber: 4, midi: 49 }, // Db3
      { stringNumber: 3, midi: 54 }, // Gb3
      { stringNumber: 2, midi: 58 }, // Bb3
      { stringNumber: 1, midi: 63 }, // Eb4
    ],
  },
  {
    id: 'd-standard',
    name: '全体降全音',
    englishName: 'D Standard',
    category: 'standard',
    description: '所有琴弦降低一个全音，适合低音浑厚的摇滚与重型演奏',
    strings: [
      { stringNumber: 6, midi: 38 }, // D2
      { stringNumber: 5, midi: 43 }, // G2
      { stringNumber: 4, midi: 48 }, // C3
      { stringNumber: 3, midi: 53 }, // F3
      { stringNumber: 2, midi: 57 }, // A3
      { stringNumber: 1, midi: 62 }, // D4
    ],
  },
  {
    id: 'open-g',
    name: '开放 G 调弦',
    englishName: 'Open G',
    category: 'open',
    description: '空弦拨响即为 G 大三和弦，滑棒吉他与布鲁斯常用',
    strings: [
      { stringNumber: 6, midi: 38 }, // D2
      { stringNumber: 5, midi: 43 }, // G2
      { stringNumber: 4, midi: 50 }, // D3
      { stringNumber: 3, midi: 55 }, // G3
      { stringNumber: 2, midi: 59 }, // B3
      { stringNumber: 1, midi: 62 }, // D4
    ],
  },
  {
    id: 'open-d',
    name: '开放 D 调弦',
    englishName: 'Open D',
    category: 'open',
    description: '空弦拨响即为 D 大三和弦，音色明亮饱满，适合指弹',
    strings: [
      { stringNumber: 6, midi: 38 }, // D2
      { stringNumber: 5, midi: 45 }, // A2
      { stringNumber: 4, midi: 50 }, // D3
      { stringNumber: 3, midi: 54 }, // F#3
      { stringNumber: 2, midi: 57 }, // A3
      { stringNumber: 1, midi: 62 }, // D4
    ],
  },
  {
    id: 'dadgad',
    name: 'DADGAD 凯尔特',
    englishName: 'DADGAD',
    category: 'open',
    description: 'Dsus4 悬留和弦定弦，富有凯尔特民谣与现代指弹色彩',
    strings: [
      { stringNumber: 6, midi: 38 }, // D2
      { stringNumber: 5, midi: 45 }, // A2
      { stringNumber: 4, midi: 50 }, // D3
      { stringNumber: 3, midi: 55 }, // G3
      { stringNumber: 2, midi: 57 }, // A3
      { stringNumber: 1, midi: 62 }, // D4
    ],
  },
];

export function midiToFrequency(midi: number, a4Freq: number = DEFAULT_A4_FREQ): number {
  return a4Freq * Math.pow(2, (midi - 69) / 12);
}

export function frequencyToMidi(freq: number, a4Freq: number = DEFAULT_A4_FREQ): number {
  if (freq <= 0 || a4Freq <= 0) return 0;
  return 69 + 12 * Math.log2(freq / a4Freq);
}

export function getCentsDifference(detectedFreq: number, targetFreq: number): number {
  if (detectedFreq <= 0 || targetFreq <= 0) return 0;
  return 1200 * Math.log2(detectedFreq / targetFreq);
}

export function midiToNoteDisplay(
  midi: number,
  a4Freq: number = DEFAULT_A4_FREQ,
  preferFlats: boolean = false
): NoteDisplay {
  const rounded = Math.round(midi);
  const noteIndex = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  const noteName = preferFlats ? NOTE_NAMES_FLAT[noteIndex] : NOTE_NAMES_SHARP[noteIndex];
  return {
    midi: rounded,
    noteName,
    octave,
    fullLabel: `${noteName}${octave}`,
    frequency: midiToFrequency(rounded, a4Freq),
  };
}

export function applyCapoToMidi(midi: number, capo: number): number {
  return Math.max(MIN_GUITAR_MIDI, Math.min(MAX_GUITAR_MIDI, midi + capo));
}

export function shiftStringMidi(midi: number, delta: number): number {
  return Math.max(MIN_GUITAR_MIDI, Math.min(MAX_GUITAR_MIDI, midi + delta));
}

export function matchChromaticNote(
  detectedFreq: number,
  a4Freq: number = DEFAULT_A4_FREQ,
  preferFlats: boolean = false
): TuningMatch {
  const exactMidi = frequencyToMidi(detectedFreq, a4Freq);
  const nearestMidi = Math.round(exactMidi);
  const display = midiToNoteDisplay(nearestMidi, a4Freq, preferFlats);
  const cents = getCentsDifference(detectedFreq, display.frequency);

  return {
    stringNumber: null,
    targetMidi: nearestMidi,
    targetLabel: display.fullLabel,
    targetFreq: display.frequency,
    detectedFreq,
    cents,
  };
}

export function matchGuitarString(
  detectedFreq: number,
  strings: GuitarStringTarget[],
  a4Freq: number = DEFAULT_A4_FREQ,
  capo: number = 0,
  manualStringNumber: number | null = null,
  preferFlats: boolean = false
): TuningMatch {
  if (manualStringNumber !== null) {
    const selected = strings.find((s) => s.stringNumber === manualStringNumber) ?? strings[0];
    const effectiveMidi = applyCapoToMidi(selected.midi, capo);
    const display = midiToNoteDisplay(effectiveMidi, a4Freq, preferFlats);
    return {
      stringNumber: selected.stringNumber,
      targetMidi: effectiveMidi,
      targetLabel: display.fullLabel,
      targetFreq: display.frequency,
      detectedFreq,
      cents: getCentsDifference(detectedFreq, display.frequency),
    };
  }

  let bestString = strings[0];
  let bestAbsCents = Infinity;
  let bestCents = 0;
  let bestDisplay = midiToNoteDisplay(applyCapoToMidi(strings[0].midi, capo), a4Freq, preferFlats);

  for (const str of strings) {
    const effectiveMidi = applyCapoToMidi(str.midi, capo);
    const display = midiToNoteDisplay(effectiveMidi, a4Freq, preferFlats);
    const cents = getCentsDifference(detectedFreq, display.frequency);
    const absCents = Math.abs(cents);
    if (absCents < bestAbsCents) {
      bestAbsCents = absCents;
      bestCents = cents;
      bestString = str;
      bestDisplay = display;
    }
  }

  return {
    stringNumber: bestString.stringNumber,
    targetMidi: bestDisplay.midi,
    targetLabel: bestDisplay.fullLabel,
    targetFreq: bestDisplay.frequency,
    detectedFreq,
    cents: bestCents,
  };
}

export function getTuningGuidance(cents: number, toleranceCents: number = 4): TuningGuidance {
  const isLarge = Math.abs(cents) > 20;
  if (Math.abs(cents) <= toleranceCents) return { direction: 'in-tune', isLarge: false };
  return { direction: cents < 0 ? 'flat' : 'sharp', isLarge };
}

export function getAllSelectableGuitarNotes(
  a4Freq: number = DEFAULT_A4_FREQ,
  preferFlats: boolean = false
): NoteDisplay[] {
  const notes: NoteDisplay[] = [];
  for (let midi = MIN_GUITAR_MIDI; midi <= MAX_GUITAR_MIDI; midi++) {
    notes.push(midiToNoteDisplay(midi, a4Freq, preferFlats));
  }
  return notes;
}
