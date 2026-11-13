import React from 'react';
import { Check, Minus, Plus, Square, Volume2 } from 'lucide-react';
import { useI18n } from '../i18n';
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
  isLoopingTone: boolean;
  onSelectString: (stringNumber: number) => void;
  onShiftStringPitch: (stringNumber: number, delta: number) => void;
  onToggleLoopTone: () => void;
}

// 3+3 headstock: left posts top→bottom are strings 4, 5, 6; right posts are 3, 2, 1.
const LEFT = [4, 5, 6];
const RIGHT = [3, 2, 1];

// Geometry of the drawn headstock. Rows are ROW_H px tall; the SVG is drawn at 1:1 px.
const ROW_H = 64;
const HS_W = 120;
const HS_H = ROW_H * 3;
const POST_L = 20;
const POST_R = HS_W - 20;
const rowCenter = (row: number) => ROW_H * row + ROW_H / 2;
// Nut positions, string 6 (left) to string 1 (right)
const NUT_X: Record<number, number> = { 6: 36, 5: 45.6, 4: 55.2, 3: 64.8, 2: 74.4, 1: 84 };

const Headstock: React.FC<{ isActive: (n: number) => boolean; tunedStrings: number[] }> = ({
  isActive,
  tunedStrings,
}) => {
  const posts = [
    ...LEFT.map((n, row) => ({ n, x: POST_L, y: rowCenter(row), side: 'left' as const })),
    ...RIGHT.map((n, row) => ({ n, x: POST_R, y: rowCenter(row), side: 'right' as const })),
  ];

  return (
    <svg
      width={HS_W}
      height={HS_H}
      viewBox={`0 0 ${HS_W} ${HS_H}`}
      className="block overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hs-wood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7A4E2E" />
          <stop offset="55%" stopColor="#5C3920" />
          <stop offset="100%" stopColor="#3F2715" />
        </linearGradient>
      </defs>

      {/* Tuner shafts reaching out to the round pegs */}
      {posts.map((p) => (
        <line
          key={`shaft-${p.n}`}
          x1={p.side === 'left' ? -2 : HS_W + 2}
          y1={p.y}
          x2={p.x}
          y2={p.y}
          stroke={isActive(p.n) ? '#34D399' : '#4B5563'}
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}

      {/* Headstock body: crown at the top, tapering to the nut */}
      <path
        d={`M 30 ${HS_H} L 8 34 Q 4 10 26 6 Q 60 -6 94 6 Q 116 10 112 34 L 90 ${HS_H} Z`}
        fill="url(#hs-wood)"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="1"
      />
      {/* Nut */}
      <rect x="28" y={HS_H - 6} width="64" height="6" rx="1.5" fill="#E7E2D6" />

      {/* Strings from post to nut; the active one lights up */}
      {posts.map((p) => {
        const active = isActive(p.n);
        const tuned = tunedStrings.includes(p.n);
        return (
          <line
            key={`string-${p.n}`}
            x1={p.x}
            y1={p.y}
            x2={NUT_X[p.n]}
            y2={HS_H - 6}
            stroke={active ? '#34D399' : tuned ? 'rgba(52,211,153,0.55)' : 'rgba(229,231,235,0.55)'}
            strokeWidth={active ? 2 : p.n >= 5 ? 1.6 : p.n >= 3 ? 1.2 : 0.9}
            style={{ transition: 'stroke 150ms ease-out' }}
          />
        );
      })}

      {/* Chrome tuning posts */}
      {posts.map((p) => (
        <g key={`post-${p.n}`}>
          <circle cx={p.x} cy={p.y} r="6" fill="#2A2D33" />
          <circle cx={p.x} cy={p.y} r="4" fill={isActive(p.n) ? '#34D399' : '#C9CDD4'} />
        </g>
      ))}
    </svg>
  );
};

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
  isLoopingTone,
  onSelectString,
  onShiftStringPitch,
  onToggleLoopTone,
}) => {
  const { t } = useI18n();
  const getStringByNum = (num: number) =>
    strings.find((s) => s.stringNumber === num) ?? strings[0];
  const displayOf = (num: number) =>
    midiToNoteDisplay(applyCapoToMidi(getStringByNum(num).midi, capo), a4Freq, preferFlats);

  const isActive = (num: number) =>
    isManualMode && !isChromatic
      ? selectedManualString === num
      : !isManualMode && !isChromatic && activeDetectedString === num;

  const renderPeg = (num: number, row: number, side: 'left' | 'right') => {
    const display = displayOf(num);
    const active = isActive(num);
    const tuned = tunedStrings.includes(num);
    const playing = playingString === num;

    return (
      <button
        key={num}
        type="button"
        onClick={() => onSelectString(num)}
        aria-label={t.pegs.pegAria(num, display.fullLabel, display.frequency.toFixed(1))}
        aria-pressed={active}
        data-testid={`string-peg-${num}`}
        style={{ gridRow: row + 1, gridColumn: side === 'left' ? 1 : 3 }}
        className={`relative justify-self-center w-[52px] h-[52px] rounded-full flex flex-col items-center justify-center border-2 transition-[background-color,border-color,transform] duration-150 active:scale-95 ${
          active
            ? 'bg-emerald-500 border-emerald-300 text-slate-950 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]'
            : playing
              ? 'bg-raised border-amber-400 text-gray-50'
              : tuned
                ? 'bg-raised border-emerald-500/60 text-gray-50'
                : 'bg-raised border-white/15 text-gray-100 hover:border-white/30 hover:bg-control-hover'
        }`}
      >
        <span className="font-display text-[15px] font-bold leading-none tracking-tight">
          {display.fullLabel}
        </span>
        <span
          className={`mt-0.5 font-mono-tabular text-[9px] leading-none ${
            active ? 'text-slate-900/80' : 'text-gray-400'
          }`}
        >
          {display.frequency.toFixed(1)}
        </span>

        {/* Corner badge: speaker while the reference tone plays, check once tuned */}
        {(playing || tuned) && (
          <span
            aria-hidden="true"
            className={`absolute -top-1 ${side === 'left' ? '-left-1' : '-right-1'} w-5 h-5 rounded-full flex items-center justify-center border-2 border-surface ${
              playing ? 'bg-amber-400 text-slate-950' : 'bg-emerald-500 text-slate-950'
            }`}
          >
            {playing ? (
              <Volume2 className="w-3 h-3" />
            ) : (
              <Check className="w-3 h-3" strokeWidth={3} />
            )}
          </span>
        )}
      </button>
    );
  };

  const manualStr =
    isManualMode && !isChromatic && selectedManualString !== null
      ? getStringByNum(selectedManualString)
      : null;
  const manualDisplay = manualStr ? displayOf(manualStr.stringNumber) : null;

  return (
    <div data-testid="headstock" className="w-full">
      <div
        className="grid items-center mx-auto max-w-[320px]"
        style={{
          gridTemplateColumns: `minmax(60px,1fr) ${HS_W}px minmax(60px,1fr)`,
          gridTemplateRows: `repeat(3, ${ROW_H}px)`,
        }}
      >
        {/* Horizontal connector rails from each peg to the headstock edge */}
        {[0, 1, 2].map((row) => (
          <React.Fragment key={`rail-${row}`}>
            <span
              aria-hidden="true"
              style={{ gridRow: row + 1, gridColumn: 1 }}
              className={`justify-self-end h-[3px] w-1/2 rounded-full ${
                isActive(LEFT[row]) ? 'bg-emerald-400' : 'bg-gray-600'
              }`}
            />
            <span
              aria-hidden="true"
              style={{ gridRow: row + 1, gridColumn: 3 }}
              className={`justify-self-start h-[3px] w-1/2 rounded-full ${
                isActive(RIGHT[row]) ? 'bg-emerald-400' : 'bg-gray-600'
              }`}
            />
          </React.Fragment>
        ))}

        <div style={{ gridRow: '1 / 4', gridColumn: 2 }} className="self-stretch">
          <Headstock isActive={isActive} tunedStrings={tunedStrings} />
        </div>

        {LEFT.map((n, row) => renderPeg(n, row, 'left'))}
        {RIGHT.map((n, row) => renderPeg(n, row, 'right'))}
      </div>

      {/* Manual mode only: sustained reference tone + semitone change of the target string */}
      {manualStr && manualDisplay && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onToggleLoopTone}
            data-testid="btn-reference-tone"
            aria-pressed={isLoopingTone}
            className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors ${
              isLoopingTone
                ? 'bg-amber-400/20 border-amber-400/50 text-amber-200'
                : 'bg-control border-white/10 text-gray-200 hover:bg-control-hover'
            }`}
          >
            {isLoopingTone ? (
              <Square className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
            )}
            {isLoopingTone ? t.pegs.stopTone : t.pegs.holdTone}
          </button>

          <div className="flex items-center gap-1" role="group" aria-label={t.pegs.targetPitchAria}>
            <button
              type="button"
              onClick={() => onShiftStringPitch(manualStr.stringNumber, -1)}
              aria-label={t.pegs.semitoneDownAria(manualStr.stringNumber)}
              data-testid="manual-pitch-down"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-control border border-white/10 text-gray-200 hover:bg-control-hover active:scale-95 transition-[background-color,transform]"
            >
              <Minus className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="min-w-[64px] text-center text-xs text-gray-400">
              {t.pegs.stringLabel(manualStr.stringNumber)}{' '}
              <span className="font-mono-tabular font-semibold text-gray-100">
                {manualDisplay.fullLabel}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onShiftStringPitch(manualStr.stringNumber, 1)}
              aria-label={t.pegs.semitoneUpAria(manualStr.stringNumber)}
              data-testid="manual-pitch-up"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-control border border-white/10 text-gray-200 hover:bg-control-hover active:scale-95 transition-[background-color,transform]"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
