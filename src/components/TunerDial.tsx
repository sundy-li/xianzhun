import React, { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, Lock, Radio } from 'lucide-react';
import { InputSource } from '../hooks/useTunerAudio';
import {
  TuningMatch,
  getTuningGuidance,
  midiToNoteDisplay,
  applyCapoToMidi,
  GuitarStringTarget,
} from '../utils/musicTheory';

interface TunerDialProps {
  source: InputSource;
  match: TuningMatch | null;
  isSignalActive: boolean;
  isLockedInTune: boolean;
  toleranceCents: number;
  isChromatic: boolean;
  manualStringNumber: number | null;
  strings: GuitarStringTarget[];
  a4Freq: number;
  capo: number;
  preferFlats: boolean;
  waveformRef: React.MutableRefObject<Float32Array>;
}

export const TunerDial: React.FC<TunerDialProps> = ({
  source,
  match,
  isSignalActive,
  isLockedInTune,
  toleranceCents,
  isChromatic,
  manualStringNumber,
  strings,
  a4Freq,
  capo,
  preferFlats,
  waveformRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Draw crisp live oscillogram waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const samples = waveformRef.current;
      const midY = height / 2;

      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      if (source !== 'idle') {
        ctx.strokeStyle = isLockedInTune
          ? '#10B981'
          : isSignalActive
            ? '#EAB308'
            : 'rgba(156, 163, 175, 0.35)';
        ctx.lineWidth = 1.75;
        ctx.beginPath();

        for (let i = 0; i < samples.length; i++) {
          const x = (i / (samples.length - 1)) * width;
          const amp = isSignalActive ? samples[i] : 0;
          const y = midY + Math.max(-1, Math.min(1, amp * 1.6)) * (height * 0.42);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [source, isSignalActive, isLockedInTune, waveformRef]);

  // Determine fallback target display when manual mode is selected but no signal is active yet
  const manualTarget =
    manualStringNumber !== null && !isChromatic
      ? strings.find((s) => s.stringNumber === manualStringNumber) ?? strings[0]
      : null;

  const manualTargetDisplay = manualTarget
    ? midiToNoteDisplay(applyCapoToMidi(manualTarget.midi, capo), a4Freq, preferFlats)
    : null;

  const activeCents = match && isSignalActive ? Math.max(-50, Math.min(50, match.cents)) : 0;
  // Map -50..+50 cents to -62deg..+62deg arc sweep
  const needleAngle = (activeCents / 50) * 62;

  const guidance =
    match && isSignalActive ? getTuningGuidance(match.cents, toleranceCents) : null;

  const noteText =
    match && isSignalActive
      ? match.targetLabel
      : manualTargetDisplay
        ? manualTargetDisplay.fullLabel
        : '--';

  const targetFreqText =
    match && isSignalActive
      ? `${match.targetFreq.toFixed(2)} Hz`
      : manualTargetDisplay
        ? `${manualTargetDisplay.frequency.toFixed(2)} Hz`
        : '-- Hz';

  const detectedFreqText =
    match && isSignalActive ? `${match.detectedFreq.toFixed(2)} Hz` : '-- Hz';

  const centsFormatted =
    match && isSignalActive
      ? `${match.cents > 0 ? '+' : ''}${match.cents.toFixed(1)} ¢`
      : '0.0 ¢';

  // Color state paired with explicit text & icons (no hue-only signaling)
  const accentColor = !isSignalActive
    ? 'text-gray-400'
    : guidance?.direction === 'in-tune'
      ? 'text-emerald-400'
      : guidance?.direction === 'flat'
        ? 'text-amber-400'
        : 'text-rose-400';

  const needleColor = !isSignalActive
    ? '#6B7280'
    : guidance?.direction === 'in-tune'
      ? '#10B981'
      : guidance?.direction === 'flat'
        ? '#F59E0B'
        : '#F43F5E';

  const ticks = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];

  return (
    <section
      aria-label="音准仪表盘"
      data-testid="tuner-dial"
      data-signal-active={isSignalActive ? 'true' : 'false'}
      data-locked={isLockedInTune ? 'true' : 'false'}
      data-direction={guidance?.direction ?? 'idle'}
      className="relative rounded-2xl bg-surface border border-white/[0.08] p-4 sm:p-6 flex flex-col items-center"
    >
      {/* Top Status Line (Clean unboxed metadata) */}
      <div className="w-full flex items-center justify-between text-xs text-gray-400 mb-2">
        <div className="flex items-center gap-2">
          {source !== 'idle' ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
              <Radio className="w-3.5 h-3.5" aria-hidden="true" />
              {source === 'mic' ? '麦克风实时监听中' : '内置吉他信号模拟中'}
            </span>
          ) : (
            <span>待机中 · 点击下方开始调音</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 font-mono-tabular">
          {manualStringNumber !== null && !isChromatic ? (
            <span className="inline-flex items-center gap-1 text-amber-300 font-medium">
              <Lock className="w-3 h-3" aria-hidden="true" />
              手动锁定 · 第 {manualStringNumber} 弦
            </span>
          ) : isChromatic ? (
            <span>十二平均律全音域</span>
          ) : (
            <span>自动识别琴弦</span>
          )}
        </div>
      </div>

      {/* Precision SVG Arc Gauge */}
      <div className="relative w-full max-w-[330px] aspect-[16/9] flex items-end justify-center mt-1">
        {(() => {
          const cx = 160;
          const cy = 158;
          const R = 126;
          const maxSweepDeg = 64;
          const polar = (degFromTop: number, radius: number) => {
            const rad = ((degFromTop - 90) * Math.PI) / 180;
            return {
              x: cx + Math.cos(rad) * radius,
              y: cy + Math.sin(rad) * radius,
            };
          };
          const arcPath = (startDeg: number, endDeg: number, radius: number) => {
            const s = polar(startDeg, radius);
            const e = polar(endDeg, radius);
            const largeArc = endDeg - startDeg > 180 ? 1 : 0;
            return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
          };
          const sweetHalfDeg = (Math.min(10, Math.max(3, toleranceCents)) / 50) * maxSweepDeg;

          return (
            <svg viewBox="0 0 320 176" className="w-full h-full overflow-visible" aria-hidden="true">
              {/* Outer concentric track arc */}
              <path
                d={arcPath(-maxSweepDeg, maxSweepDeg, R)}
                fill="none"
                stroke="#262A32"
                strokeWidth="10"
                strokeLinecap="round"
              />
              {/* Center emerald sweet-spot arc */}
              <path
                d={arcPath(-sweetHalfDeg, sweetHalfDeg, R)}
                fill="none"
                stroke={isLockedInTune ? '#10B981' : 'rgba(16, 185, 129, 0.4)'}
                strokeWidth="10"
                strokeLinecap="round"
              />

              {/* Graduated Tick Marks along exact same concentric circle */}
              {ticks.map((tick) => {
                const deg = (tick / 50) * maxSweepDeg;
                const pInner = polar(deg, tick === 0 ? R - 14 : R - 11);
                const pOuter = polar(deg, tick === 0 ? R + 12 : tick % 25 === 0 ? R + 10 : R + 6);
                const pLabel = polar(deg, R + 24);

                return (
                  <g key={tick}>
                    <line
                      x1={pInner.x}
                      y1={pInner.y}
                      x2={pOuter.x}
                      y2={pOuter.y}
                      stroke={tick === 0 ? '#10B981' : '#4B5563'}
                      strokeWidth={tick === 0 ? 3 : tick % 25 === 0 ? 2 : 1.25}
                      strokeLinecap="round"
                    />
                    {(tick === -50 || tick === -25 || tick === 0 || tick === 25 || tick === 50) && (
                      <text
                        x={pLabel.x}
                        y={pLabel.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={tick === 0 ? '#10B981' : '#6B7280'}
                        fontSize="10"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {tick > 0 ? `+${tick}` : tick}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Smooth Outer-Rim Sweeping Needle (leaves center dial open for note display) */}
              <g
                style={{
                  transform: `rotate(${needleAngle}deg)`,
                  transformOrigin: `${cx}px ${cy}px`,
                  transition: 'transform 120ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <line
                  x1={cx}
                  y1={cy - (R - 28)}
                  x2={cx}
                  y2={cy - (R + 4)}
                  stroke={needleColor}
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle cx={cx} cy={cy - (R - 28)} r="4" fill={needleColor} />
              </g>
            </svg>
          );
        })()}

        {/* Center Note Readout in Unobstructed Hub Cavity */}
        <div className="absolute bottom-2 flex flex-col items-center pointer-events-none">
          <div
            data-testid="detected-note"
            className={`font-display text-5xl sm:text-6xl font-bold tracking-tight leading-none ${
              isSignalActive || manualTargetDisplay ? 'text-gray-50' : 'text-gray-600'
            }`}
          >
            {noteText}
          </div>
          {match?.stringNumber && isSignalActive && (
            <span className="mt-1.5 text-xs font-medium text-gray-400">
              第 {match.stringNumber} 弦
            </span>
          )}
        </div>
      </div>

      {/* Explicit Guidance Strip (Icon + Text, WCAG AA contrast) */}
      <div
        data-testid="tuning-guidance"
        className={`mt-2 min-h-[36px] flex items-center justify-center gap-2 text-sm font-semibold ${accentColor}`}
      >
        {!isSignalActive || !guidance ? (
          <span className="text-gray-400 font-normal">
            {source === 'idle'
              ? '请点击“开启麦克风”或“试音模拟”并拨动琴弦'
              : '正在等待稳定的琴弦音频信号…'}
          </span>
        ) : guidance.direction === 'in-tune' ? (
          <>
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {guidance.label} · {guidance.actionHint}
            </span>
          </>
        ) : guidance.direction === 'flat' ? (
          <>
            <ArrowUp className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {guidance.label} · {guidance.actionHint}
            </span>
          </>
        ) : (
          <>
            <ArrowDown className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {guidance.label} · {guidance.actionHint}
            </span>
          </>
        )}
      </div>

      {/* Precision Telemetry Readout Row (Tabular Numerals) */}
      <div className="w-full mt-4 pt-3.5 border-t border-white/[0.06] grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[11px] text-gray-400">实测频率</div>
          <div data-testid="detected-freq" className="mt-0.5 font-mono-tabular text-sm font-semibold text-gray-100">
            {detectedFreqText}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-gray-400">音分偏差</div>
          <div data-testid="detected-cents" className={`mt-0.5 font-mono-tabular text-sm font-semibold ${accentColor}`}>
            {centsFormatted}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-gray-400">目标频率</div>
          <div data-testid="target-freq" className="mt-0.5 font-mono-tabular text-sm font-semibold text-gray-300">
            {targetFreqText}
          </div>
        </div>
      </div>

      {/* Live Micro-Oscilloscope Strip */}
      <div className="w-full mt-3 rounded-xl bg-inset border border-white/[0.05] px-2 py-1">
        <canvas
          ref={canvasRef}
          width={480}
          height={36}
          className="w-full h-7 block"
          aria-label="实时音频波形"
        />
      </div>
    </section>
  );
};
