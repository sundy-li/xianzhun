import React, { useRef } from 'react';
import { Hand, Minus, Play, Plus, Square, Volume2 } from 'lucide-react';
import {
  MAX_BPM,
  MIN_BPM,
  TIME_SIGNATURES,
  TimeSignature,
  clampBpm,
  computeTapTempoBpm,
  getBeatEmphasis,
  getTempoMarking,
} from '../utils/metronome';
import { useI18n } from '../i18n';

interface MetronomePanelProps {
  bpm: number;
  timeSignature: TimeSignature;
  accentFirstBeat: boolean;
  isPlaying: boolean;
  activeBeatIndex: number | null;
  barNumber: number;
  onChangeBpm: (bpm: number) => void;
  onChangeTimeSignature: (id: string) => void;
  onChangeAccentFirstBeat: (accent: boolean) => void;
  onTogglePlay: () => void;
}

export const MetronomePanel: React.FC<MetronomePanelProps> = ({
  bpm,
  timeSignature,
  accentFirstBeat,
  isPlaying,
  activeBeatIndex,
  barNumber,
  onChangeBpm,
  onChangeTimeSignature,
  onChangeAccentFirstBeat,
  onTogglePlay,
}) => {
  const tapTimesRef = useRef<number[]>([]);
  const { t } = useI18n();

  const handleTapTempo = () => {
    const now = performance.now();
    const recent = tapTimesRef.current.filter((t) => now - t <= 2500);
    recent.push(now);
    tapTimesRef.current = recent;

    const computed = computeTapTempoBpm(recent);
    if (computed !== null) {
      onChangeBpm(computed);
    }
  };

  const beats = Array.from({ length: timeSignature.beatsPerBar }, (_, idx) => idx);

  return (
    <div className="space-y-4">
      {/* Beat Pulse Visualizer + BPM Hero */}
      <section
        aria-label={t.metronome.panelAria}
        data-testid="metronome-panel"
        data-playing={isPlaying ? 'true' : 'false'}
        className="rounded-2xl bg-surface border border-white/[0.08] p-4 sm:p-5 space-y-4"
      >
        <div className="flex items-center justify-between gap-2 text-xs text-gray-400">
          <span className="font-medium text-gray-300">
            {t.metronome.header(timeSignature.label)}
          </span>
          <span data-testid="metronome-bar-counter" className="font-mono-tabular">
            {isPlaying ? t.metronome.barN(barNumber) : t.metronome.tempo[getTempoMarking(bpm)]}
          </span>
        </div>

        {/* Visual Beat Indicators */}
        <div
          aria-label={t.metronome.beatsAria}
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${timeSignature.beatsPerBar}, minmax(0, 1fr))` }}
        >
          {beats.map((idx) => {
            const emphasis = getBeatEmphasis(idx, timeSignature, accentFirstBeat);
            const isCurrent = isPlaying && activeBeatIndex === idx;
            const isStrong = emphasis === 'accent';
            const isSecondary = emphasis === 'secondary';

            return (
              <div
                key={idx}
                data-testid={`beat-indicator-${idx + 1}`}
                data-active={isCurrent ? 'true' : 'false'}
                className={`min-h-[48px] rounded-xl border flex flex-col items-center justify-center transition-all duration-100 ${
                  isCurrent
                    ? isStrong
                      ? 'bg-amber-400 border-amber-300 text-slate-950 scale-[1.03]'
                      : 'bg-emerald-500 border-emerald-400 text-slate-950 scale-[1.02]'
                    : isStrong
                      ? 'bg-raised border-amber-400/30 text-amber-300'
                      : isSecondary
                        ? 'bg-raised border-white/15 text-gray-200'
                        : 'bg-nav border-white/[0.06] text-gray-400'
                }`}
              >
                <span className="font-mono-tabular text-sm font-bold">{idx + 1}</span>
                <span className="text-[10px] font-medium">
                  {isStrong ? t.metronome.strong : isSecondary ? t.metronome.secondary : t.metronome.weak}
                </span>
              </div>
            );
          })}
        </div>

        {/* BPM Readout & Fine Steppers */}
        <div className="pt-2 flex flex-col items-center">
          <div className="flex items-baseline gap-2">
            <span
              data-testid="metronome-bpm-value"
              className="font-display text-5xl font-bold tracking-tight text-white tabular-nums"
            >
              {bpm}
            </span>
            <span className="font-mono-tabular text-sm font-medium text-gray-400">BPM</span>
          </div>
          <span className="text-xs text-gray-400 mt-1">{t.metronome.tempo[getTempoMarking(bpm)]}</span>

          {/* Slider */}
          <div className="w-full mt-4">
            <label htmlFor="metronome-bpm-slider" className="sr-only">
              {t.metronome.bpmSliderLabel}
            </label>
            <input
              id="metronome-bpm-slider"
              type="range"
              min={MIN_BPM}
              max={MAX_BPM}
              step={1}
              value={bpm}
              onChange={(e) => onChangeBpm(clampBpm(Number(e.target.value)))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono-tabular text-gray-500 mt-1">
              <span>{MIN_BPM}</span>
              <span>120</span>
              <span>{MAX_BPM}</span>
            </div>
          </div>

          {/* Stepper Buttons + Tap Tempo */}
          <div className="w-full mt-3 grid grid-cols-5 gap-1.5">
            <button
              type="button"
              onClick={() => onChangeBpm(clampBpm(bpm - 5))}
              disabled={bpm <= MIN_BPM}
              aria-label={t.metronome.minusAria(5)}
              data-testid="bpm-minus-5"
              className="min-h-[44px] rounded-xl bg-control border border-white/10 text-xs font-mono-tabular font-semibold text-gray-200 hover:bg-control-hover disabled:opacity-40"
            >
              -5
            </button>
            <button
              type="button"
              onClick={() => onChangeBpm(clampBpm(bpm - 1))}
              disabled={bpm <= MIN_BPM}
              aria-label={t.metronome.minusAria(1)}
              data-testid="bpm-minus-1"
              className="min-h-[44px] flex items-center justify-center rounded-xl bg-control border border-white/10 text-gray-200 hover:bg-control-hover disabled:opacity-40"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleTapTempo}
              aria-label={t.metronome.tapAria}
              data-testid="btn-tap-tempo"
              className="min-h-[44px] flex items-center justify-center gap-1 rounded-xl bg-control border border-white/10 px-2 text-xs font-semibold text-amber-300 hover:bg-control-hover active:scale-95 transition-all whitespace-nowrap"
            >
              <Hand className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t.metronome.tap}</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeBpm(clampBpm(bpm + 1))}
              disabled={bpm >= MAX_BPM}
              aria-label={t.metronome.plusAria(1)}
              data-testid="bpm-plus-1"
              className="min-h-[44px] flex items-center justify-center rounded-xl bg-control border border-white/10 text-gray-200 hover:bg-control-hover disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onChangeBpm(clampBpm(bpm + 5))}
              disabled={bpm >= MAX_BPM}
              aria-label={t.metronome.plusAria(5)}
              data-testid="bpm-plus-5"
              className="min-h-[44px] rounded-xl bg-control border border-white/10 text-xs font-mono-tabular font-semibold text-gray-200 hover:bg-control-hover disabled:opacity-40"
            >
              +5
            </button>
          </div>
        </div>

        {/* Start / Stop CTA */}
        <button
          type="button"
          onClick={onTogglePlay}
          data-testid="btn-metronome-toggle"
          className={`w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
            isPlaying
              ? 'bg-rose-500/20 border border-rose-500/40 text-rose-200 hover:bg-rose-500/30'
              : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
          }`}
        >
          {isPlaying ? (
            <>
              <Square className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t.metronome.stop}</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t.metronome.start}</span>
            </>
          )}
        </button>
      </section>

      {/* Time Signature Selector */}
      <section className="rounded-2xl bg-surface border border-white/[0.08] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-100">{t.metronome.timeSigTitle}</h2>
          <span className="text-xs text-gray-400 text-right">{t.metronome.timeSigDesc[timeSignature.id]}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {TIME_SIGNATURES.map((ts) => {
            const active = ts.id === timeSignature.id;
            return (
              <button
                key={ts.id}
                type="button"
                onClick={() => onChangeTimeSignature(ts.id)}
                data-testid={`timesig-${ts.id}`}
                aria-pressed={active}
                className={`min-h-[44px] rounded-xl font-mono-tabular text-sm font-semibold border transition-colors ${
                  active
                    ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-300'
                    : 'bg-raised border-white/[0.08] text-gray-300 hover:bg-control'
                }`}
              >
                {ts.label}
              </button>
            );
          })}
        </div>

        {/* Accent First Beat Toggle */}
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-4 h-4 text-amber-300 shrink-0" aria-hidden="true" />
            <div>
              <div className="text-sm font-medium text-gray-100">{t.metronome.accentTitle}</div>
              <div className="text-xs text-gray-400">{t.metronome.accentDesc}</div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={accentFirstBeat}
            aria-label={t.metronome.accentAria}
            data-testid="metronome-accent-toggle"
            onClick={() => onChangeAccentFirstBeat(!accentFirstBeat)}
            className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors ${
              accentFirstBeat
                ? 'bg-emerald-500 border-emerald-400'
                : 'bg-control-hover border-white/10'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                accentFirstBeat ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </section>
    </div>
  );
};
