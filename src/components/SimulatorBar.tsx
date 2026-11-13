import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { GuitarStringTarget, applyCapoToMidi, midiToNoteDisplay } from '../utils/musicTheory';
import { useI18n } from '../i18n';

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
  const { t } = useI18n();
  return (
    <section
      aria-label={t.simulator.aria}
      data-testid="simulator-bar"
      className="rounded-2xl bg-surface border border-amber-500/30 p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
          <SlidersHorizontal className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{t.simulator.title}</span>
        </div>
        <button
          type="button"
          onClick={onStopSimulator}
          aria-label={t.simulator.closeAria}
          data-testid="btn-sim-close"
          className="min-h-[44px] min-w-[44px] -my-2 -mr-2 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
        >
          <X className="w-4 h-4" aria-hidden="true" />
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
                  : 'bg-inset border-white/10 text-gray-300 hover:bg-control'
              }`}
            >
              {t.simulator.stringNote(s.stringNumber, disp.noteName)}
            </button>
          );
        })}
      </div>

      {/* Detune Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="sim-detune-slider" className="text-gray-400">
            {t.simulator.detune}
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
            className="min-h-[36px] rounded-lg bg-control text-xs text-amber-300 hover:bg-control-hover"
          >
            {t.simulator.flat}
          </button>
          <button
            type="button"
            onClick={() => onChangeSimDetune(0)}
            data-testid="sim-detune-zero"
            className="min-h-[36px] rounded-lg bg-control text-xs text-emerald-300 hover:bg-control-hover"
          >
            {t.simulator.exact}
          </button>
          <button
            type="button"
            onClick={() => onChangeSimDetune(24)}
            data-testid="sim-detune-sharp"
            className="min-h-[36px] rounded-lg bg-control text-xs text-rose-300 hover:bg-control-hover"
          >
            {t.simulator.sharp}
          </button>
        </div>
      </div>
    </section>
  );
};
