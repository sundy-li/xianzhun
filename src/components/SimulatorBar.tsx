import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { GuitarStringTarget, applyCapoToMidi, midiToNoteDisplay } from '../utils/musicTheory';

interface SimulatorBarProps {
  strings: GuitarStringTarget[];
  a4Freq: number;
  capo: number;
  preferFlats: boolean;
  simStringNumber: number;
  simDetuneCents: number;
  onChangeSimString: (strNum: number) => void;
  onChangeSimDetune: (cents: number) => void;
  onStopSimulator: () => void;
}

export const SimulatorBar: React.FC<SimulatorBarProps> = ({
  strings,
  a4Freq,
  capo,
  preferFlats,
  simStringNumber,
  simDetuneCents,
  onChangeSimString,
  onChangeSimDetune,
  onStopSimulator,
}) => {
  return (
    <section
      aria-label="内置吉他信号模拟器"
      data-testid="simulator-bar"
      className="rounded-2xl bg-[#181A1F] border border-amber-500/30 p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
          <SlidersHorizontal className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>吉他信号模拟测试（直连 YIN 音高引擎）</span>
        </div>
        <button
          type="button"
          onClick={onStopSimulator}
          aria-label="停止试音模拟"
          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* String selector */}
      <div className="grid grid-cols-6 gap-1.5">
        {strings.map((s) => {
          const disp = midiToNoteDisplay(applyCapoToMidi(s.midi, capo), a4Freq, preferFlats);
          const active = simStringNumber === s.stringNumber;
          return (
            <button
              key={s.stringNumber}
              type="button"
              onClick={() => onChangeSimString(s.stringNumber)}
              data-testid={`sim-string-${s.stringNumber}`}
              className={`min-h-[40px] rounded-lg text-xs font-semibold border transition-colors ${
                active
                  ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                  : 'bg-[#121316] border-white/10 text-gray-300 hover:bg-[#23262E]'
              }`}
            >
              {s.stringNumber}弦 {disp.noteName}
            </button>
          );
        })}
      </div>

      {/* Detune Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="sim-detune-slider" className="text-gray-400">
            模拟弦钮松紧偏差
          </label>
          <span className="font-mono-tabular font-semibold text-gray-100">
            {simDetuneCents > 0 ? `+${simDetuneCents}` : simDetuneCents} ¢
          </span>
        </div>
        <input
          id="sim-detune-slider"
          type="range"
          min={-40}
          max={40}
          step={1}
          value={simDetuneCents}
          onChange={(e) => onChangeSimDetune(Number(e.target.value))}
          className="w-full accent-amber-400 cursor-pointer"
        />
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onChangeSimDetune(-22)}
            data-testid="sim-detune-flat"
            className="min-h-[36px] rounded-lg bg-[#23262E] text-xs text-amber-300 hover:bg-[#2C303A]"
          >
            偏低 -22¢
          </button>
          <button
            type="button"
            onClick={() => onChangeSimDetune(0)}
            data-testid="sim-detune-zero"
            className="min-h-[36px] rounded-lg bg-[#23262E] text-xs text-emerald-300 hover:bg-[#2C303A]"
          >
            精准 0¢
          </button>
          <button
            type="button"
            onClick={() => onChangeSimDetune(24)}
            data-testid="sim-detune-sharp"
            className="min-h-[36px] rounded-lg bg-[#23262E] text-xs text-rose-300 hover:bg-[#2C303A]"
          >
            偏高 +24¢
          </button>
        </div>
      </div>
    </section>
  );
};
