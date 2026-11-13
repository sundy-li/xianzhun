import React from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { DEFAULT_A4_FREQ, MAX_A4_FREQ, MIN_A4_FREQ } from '../utils/musicTheory';
import { PWAInstallButton } from './PWAInstallButton';

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

  return (
    <div className="space-y-4">
      {/* A4 Reference Calibration */}
      <section className="rounded-2xl bg-surface border border-white/[0.08] p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-100">A4 基准音校准</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              国际标准音高为 440 Hz，古典/管弦乐常用 442 Hz 或 432 Hz
            </p>
          </div>
          {a4Freq !== DEFAULT_A4_FREQ && (
            <button
              type="button"
              onClick={() => onChangeA4(DEFAULT_A4_FREQ)}
              className="min-h-[36px] flex items-center gap-1 rounded-lg bg-control px-2.5 text-xs text-gray-300 hover:text-white whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>重置 440</span>
            </button>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onChangeA4(clampA4(a4Freq - 1))}
            disabled={a4Freq <= MIN_A4_FREQ}
            aria-label="降低 A4 基准频率 1 Hz"
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
            aria-label="升高 A4 基准频率 1 Hz"
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
            <h2 className="text-sm font-semibold text-gray-100">变调夹（Capo）品位偏移</h2>
            <p className="text-xs text-gray-400 mt-0.5">夹上变调夹后可直接按夹后空弦音高调音</p>
          </div>
          <span className="font-mono-tabular text-xs font-semibold text-amber-300">
            {capo === 0 ? '无变调夹' : `第 ${capo} 品`}
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
          <h2 className="text-sm font-semibold text-gray-100">音准判定精度</h2>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {[
              { value: 2, label: '±2 ¢ 专业' },
              { value: 4, label: '±4 ¢ 标准' },
              { value: 8, label: '±8 ¢ 宽松' },
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
            <h2 className="text-sm font-semibold text-gray-100">半音记号偏好</h2>
            <p className="text-xs text-gray-400 mt-0.5">切换升号（C#）或降号（Db）显示</p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-inset border border-white/[0.08]">
            <button
              type="button"
              onClick={() => onChangePreferFlats(false)}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors ${
                !preferFlats ? 'bg-control-hover text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              升号 #
            </button>
            <button
              type="button"
              onClick={() => onChangePreferFlats(true)}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors ${
                preferFlats ? 'bg-control-hover text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              降号 b
            </button>
          </div>
        </div>
      </section>

      {/* Android PWA Install Card */}
      <section className="rounded-2xl bg-surface border border-white/[0.08] p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-100">安装至 Android 手机桌面</h2>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            本应用采用离线 PWA 架构，安装到 Android 手机后可全屏独立运行，无需网络即可随时调音。
          </p>
        </div>
        <PWAInstallButton variant="card" />
      </section>
    </div>
  );
};
