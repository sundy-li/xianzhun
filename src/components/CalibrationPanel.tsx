import React from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { DEFAULT_A4_FREQ, MAX_A4_FREQ, MIN_A4_FREQ } from '../utils/musicTheory';
import { PWAInstallButton } from './PWAInstallButton';
import { LANGS, useI18n } from '../i18n';

interface CalibrationPanelProps {
  a4Freq: number;
  capo: number;
  toleranceCents: number;
  preferFlats: boolean;
  onChangeA4: (freq: number) => void;
  onChangeCapo: (capo: number) => void;
  onChangeTolerance: (cents: number) => void;
  onChangePreferFlats: (preferFlats: boolean) => void;
}

export const CalibrationPanel: React.FC<CalibrationPanelProps> = ({
  a4Freq,
  capo,
  toleranceCents,
  preferFlats,
  onChangeA4,
  onChangeCapo,
  onChangeTolerance,
  onChangePreferFlats,
}) => {
  const clampA4 = (val: number) => Math.max(MIN_A4_FREQ, Math.min(MAX_A4_FREQ, val));
  const { t, lang, setLang } = useI18n();

  return (
    <div className="space-y-4">
      {/* Interface language */}
      <section className="rounded-2xl bg-surface border border-white/[0.08] p-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-100">{t.calibration.languageTitle}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{t.calibration.languageDesc}</p>
        </div>
        <div
          role="radiogroup"
          aria-label={t.calibration.languageTitle}
          className="flex items-center gap-1 p-1 rounded-xl bg-inset border border-white/[0.08]"
        >
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={lang === l}
              data-testid={`lang-${l}`}
              onClick={() => setLang(l)}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors ${
                lang === l ? 'bg-control-hover text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {l === 'zh' ? '中文' : 'English'}
            </button>
          ))}
        </div>
      </section>

      {/* A4 Reference Calibration */}
      <section className="rounded-2xl bg-surface border border-white/[0.08] p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-100">{t.calibration.a4Title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {t.calibration.a4Desc}
            </p>
          </div>
          {a4Freq !== DEFAULT_A4_FREQ && (
            <button
              type="button"
              onClick={() => onChangeA4(DEFAULT_A4_FREQ)}
              className="min-h-[36px] flex items-center gap-1 rounded-lg bg-control px-2.5 text-xs text-gray-300 hover:text-white whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.calibration.reset440}</span>
            </button>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onChangeA4(clampA4(a4Freq - 1))}
            disabled={a4Freq <= MIN_A4_FREQ}
            aria-label={t.calibration.a4MinusAria}
            data-testid="a4-minus"
            className="min-h-[44px] min-w-[48px] flex items-center justify-center rounded-xl bg-control border border-white/10 text-gray-100 hover:bg-control-hover disabled:opacity-40"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="text-center">
            <div data-testid="a4-value" className="font-mono-tabular text-2xl font-bold text-white">
              {a4Freq} Hz
            </div>
          </div>

          <button
            type="button"
            onClick={() => onChangeA4(clampA4(a4Freq + 1))}
            disabled={a4Freq >= MAX_A4_FREQ}
            aria-label={t.calibration.a4PlusAria}
            data-testid="a4-plus"
            className="min-h-[44px] min-w-[48px] flex items-center justify-center rounded-xl bg-control border border-white/10 text-gray-100 hover:bg-control-hover disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[432, 440, 442].map((presetHz) => (
            <button
              key={presetHz}
              type="button"
              onClick={() => onChangeA4(presetHz)}
              data-testid={`a4-preset-${presetHz}`}
              className={`min-h-[40px] rounded-lg font-mono-tabular text-xs font-semibold border transition-colors ${
                a4Freq === presetHz
                  ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-300'
                  : 'bg-raised border-white/[0.08] text-gray-300 hover:bg-control'
              }`}
            >
              {presetHz} Hz
            </button>
          ))}
        </div>
      </section>

      {/* Capo Offset */}
      <section className="rounded-2xl bg-surface border border-white/[0.08] p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-100">{t.calibration.capoTitle}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{t.calibration.capoDesc}</p>
          </div>
          <span className="font-mono-tabular text-xs font-semibold text-amber-300">
            {capo === 0 ? t.calibration.noCapo : t.calibration.capoFret(capo)}
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((fret) => (
            <button
              key={fret}
              type="button"
              onClick={() => onChangeCapo(fret)}
              data-testid={`capo-${fret}`}
              className={`min-h-[40px] rounded-lg font-mono-tabular text-xs font-semibold border transition-colors ${
                capo === fret
                  ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-300'
                  : 'bg-raised border-white/[0.08] text-gray-300 hover:bg-control'
              }`}
            >
              {fret === 0 ? '0' : `+${fret}`}
            </button>
          ))}
        </div>
      </section>

      {/* Tolerance & Notation */}
      <section className="rounded-2xl bg-surface border border-white/[0.08] p-4 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-100">{t.calibration.toleranceTitle}</h2>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {[
              { value: 2, label: t.calibration.tolPro },
              { value: 4, label: t.calibration.tolStandard },
              { value: 8, label: t.calibration.tolLoose },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChangeTolerance(opt.value)}
                className={`min-h-[42px] rounded-xl text-xs font-semibold border transition-colors ${
                  toleranceCents === opt.value
                    ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-300'
                    : 'bg-raised border-white/[0.08] text-gray-300 hover:bg-control'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-100">{t.calibration.notationTitle}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{t.calibration.notationDesc}</p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-inset border border-white/[0.08]">
            <button
              type="button"
              onClick={() => onChangePreferFlats(false)}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors ${
                !preferFlats ? 'bg-control-hover text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t.calibration.sharps}
            </button>
            <button
              type="button"
              onClick={() => onChangePreferFlats(true)}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors ${
                preferFlats ? 'bg-control-hover text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t.calibration.flats}
            </button>
          </div>
        </div>
      </section>

      {/* Android PWA Install Card */}
      <section className="rounded-2xl bg-surface border border-white/[0.08] p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-100">{t.calibration.installTitle}</h2>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            {t.calibration.installDesc}
          </p>
        </div>
        <PWAInstallButton variant="card" />
      </section>
    </div>
  );
};
