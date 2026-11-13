import React from 'react';
import { Check, Minus, Plus, Volume2 } from 'lucide-react';
import {
  GuitarStringTarget,
  applyCapoToMidi,
  midiToNoteDisplay,
} from '../utils/musicTheory';

interface HeadstockPegboardProps {
  strings: GuitarStringTarget[];
  a4Freq: number;
  capo: number;
  preferFlats: boolean;
  isManualMode: boolean;
  isChromatic: boolean;
  selectedManualString: number | null;
  activeDetectedString: number | null;
  tunedStrings: number[];
  playingString: number | null;
  onSelectString: (stringNumber: number) => void;
  onShiftStringPitch: (stringNumber: number, delta: number) => void;
}

export const HeadstockPegboard: React.FC<HeadstockPegboardProps> = ({
  strings,
  a4Freq,
  capo,
  preferFlats,
  isManualMode,
  isChromatic,
  selectedManualString,
  activeDetectedString,
  tunedStrings,
  playingString,
  onSelectString,
  onShiftStringPitch,
}) => {
  // Traditional 3+3 Acoustic/LP Headstock layout:
  // Left column (top to bottom): String 4 (D3), String 5 (A2), String 6 (E2)
  // Right column (top to bottom): String 3 (G3), String 2 (B3), String 1 (E4)
  const leftColumnOrder = [4, 5, 6];
  const rightColumnOrder = [3, 2, 1];

  const getStringByNum = (num: number) =>
    strings.find((s) => s.stringNumber === num) ?? strings[0];

  const selectedStringObj =
    selectedManualString !== null ? getStringByNum(selectedManualString) : null;
  const selectedDisplay = selectedStringObj
    ? midiToNoteDisplay(applyCapoToMidi(selectedStringObj.midi, capo), a4Freq, preferFlats)
    : null;

  const renderPegButton = (strNum: number, align: 'left' | 'right') => {
    const str = getStringByNum(strNum);
    const effectiveMidi = applyCapoToMidi(str.midi, capo);
    const display = midiToNoteDisplay(effectiveMidi, a4Freq, preferFlats);
    const isSelectedManual = isManualMode && !isChromatic && selectedManualString === strNum;
    const isDetectedAuto = !isManualMode && !isChromatic && activeDetectedString === strNum;
    const isActive = isSelectedManual || isDetectedAuto;
    const isTuned = tunedStrings.includes(strNum);
    const isPlaying = playingString === strNum;

    return (
      <button
        key={strNum}
        type="button"
        onClick={() => onSelectString(strNum)}
        aria-label={`选择第 ${strNum} 弦 ${display.fullLabel} (${display.frequency.toFixed(1)} Hz)`}
        aria-pressed={isActive}
        data-testid={`string-peg-${strNum}`}
        className={`group relative min-h-[54px] w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 border transition-all active:scale-[0.98] ${
          isActive
            ? 'bg-emerald-500/15 border-emerald-400/60 text-white'
            : isTuned
              ? 'bg-[#1E2229] border-emerald-500/30 text-gray-100'
              : 'bg-[#1D1F25] border-white/[0.08] text-gray-200 hover:bg-[#252830] hover:border-white/15'
        } ${align === 'right' ? 'flex-row-reverse text-right' : 'text-left'}`}
      >
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-base font-bold tracking-tight">
              {display.fullLabel}
            </span>
            {isTuned && (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
            )}
          </div>
          <span className="font-mono-tabular text-[11px] text-gray-400">
            {strNum}弦 · {display.frequency.toFixed(1)}Hz
          </span>
        </div>

        <span
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            isPlaying
              ? 'bg-amber-400 text-slate-950'
              : isActive
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-[#2A2E37] text-gray-400 group-hover:text-gray-200'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
        </span>
      </button>
    );
  };

  return (
    <section
      aria-label="琴头弦钮选择"
      className="rounded-2xl bg-[#181A1F] border border-white/[0.08] p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-100">琴弦与参考音</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {isChromatic
              ? '当前为十二平均律模式 · 点击弦钮可播放参考音'
              : isManualMode
                ? '点击任意弦钮锁定目标音高并听音参考'
                : '自动识别中 · 点击弦钮可试听标准音'}
          </p>
        </div>
        {capo > 0 && (
          <span className="text-xs font-mono-tabular text-amber-300 font-medium whitespace-nowrap">
            Capo +{capo}
          </span>
        )}
      </div>

      {/* Headstock 3+3 Visual Grid */}
      <div className="relative grid grid-cols-[1fr_44px_1fr] sm:grid-cols-[1fr_60px_1fr] items-center gap-2">
        {/* Left Pegs (4, 5, 6) */}
        <div className="flex flex-col gap-2.5">
          {leftColumnOrder.map((num) => renderPegButton(num, 'left'))}
        </div>

        {/* Central Guitar Neck & String Gauge Visualization */}
        <div
          aria-hidden="true"
          className="h-full min-h-[180px] rounded-xl bg-[#121316] border border-white/[0.06] flex items-center justify-evenly px-1.5 py-2"
        >
          {[6, 5, 4, 3, 2, 1].map((strNum) => {
            const isSelected =
              (!isChromatic && isManualMode && selectedManualString === strNum) ||
              (!isChromatic && !isManualMode && activeDetectedString === strNum);
            const isTuned = tunedStrings.includes(strNum);
            // String 6 thickest, String 1 thinnest
            const widthPx = strNum >= 5 ? 3 : strNum >= 3 ? 2 : 1.25;
            return (
              <div
                key={strNum}
                style={{ width: `${widthPx}px` }}
                className={`h-full rounded-full transition-colors ${
                  isSelected
                    ? 'bg-emerald-400'
                    : isTuned
                      ? 'bg-emerald-500/50'
                      : 'bg-gray-600/70'
                }`}
              />
            );
          })}
        </div>

        {/* Right Pegs (3, 2, 1) */}
        <div className="flex flex-col gap-2.5">
          {rightColumnOrder.map((num) => renderPegButton(num, 'right'))}
        </div>
      </div>

      {/* Quick Manual Semitone Adjustment Strip when a string is selected in Manual Mode */}
      {isManualMode && !isChromatic && selectedStringObj && selectedDisplay && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
          <div className="text-xs text-gray-300">
            <span className="text-gray-400">手动微调第 {selectedStringObj.stringNumber} 弦音高：</span>
            <span className="font-mono-tabular font-semibold text-white">
              {selectedDisplay.fullLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onShiftStringPitch(selectedStringObj.stringNumber, -1)}
              aria-label={`降低第 ${selectedStringObj.stringNumber} 弦半音`}
              data-testid="manual-pitch-down"
              className="min-h-[40px] min-w-[44px] flex items-center justify-center gap-1 rounded-lg bg-[#23262E] border border-white/10 px-2.5 text-xs font-medium text-gray-200 hover:bg-[#2C303A] active:scale-95 transition-all"
            >
              <Minus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>半音</span>
            </button>
            <button
              type="button"
              onClick={() => onShiftStringPitch(selectedStringObj.stringNumber, 1)}
              aria-label={`升高第 ${selectedStringObj.stringNumber} 弦半音`}
              data-testid="manual-pitch-up"
              className="min-h-[40px] min-w-[44px] flex items-center justify-center gap-1 rounded-lg bg-[#23262E] border border-white/10 px-2.5 text-xs font-medium text-gray-200 hover:bg-[#2C303A] active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>半音</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
