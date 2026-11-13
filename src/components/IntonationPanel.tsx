import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Mic, RotateCcw, SkipForward, X } from 'lucide-react';
import { InputSource } from '../hooks/useTunerAudio';
import {
  GuitarStringTarget,
  TuningMatch,
  getCentsDifference,
  midiToFrequency,
  midiToNoteDisplay,
} from '../utils/musicTheory';
import {
  INTONATION_OK_CENTS,
  IntonationResult,
  StableReadingCapture,
  assessIntonation,
  isNearExpected,
} from '../utils/intonation';
import { type Messages } from '../i18n/zh';
import { useI18n } from '../i18n';

type Step = 'idle' | 'open' | 'fretted' | 'done';

interface IntonationPanelProps {
  /** The panel is on screen; leaving it cancels a check in progress. */
  visible: boolean;
  source: InputSource;
  match: TuningMatch | null;
  isSignalActive: boolean;
  strings: GuitarStringTarget[];
  a4Freq: number;
  capo: number;
  preferFlats: boolean;
  onStartMic: () => void;
  /** A check is running, so the tuner should follow any note (chromatic). */
  onActiveChange: (active: boolean) => void;
}

/** The open string reading may be off its target by this much and still count as that string. */
const OPEN_MAX_CENTS = 150;
/** The 12th fret note must be within this of the octave (rejects 11th / 13th fret). */
const FRETTED_MAX_CENTS = 70;
/** Open string more than this off its target: suggest tuning first. */
const OPEN_TUNE_WARN_CENTS = 10;
/** A wrong note must persist this long before we say so (a ringing open string is not a mistake). */
const WRONG_NOTE_WARN_MS = 450;

const formatCents = (c: number) => `${c > 0 ? '+' : c < 0 ? '−' : '±'}${Math.abs(c).toFixed(1)}¢`;

export const IntonationPanel: React.FC<IntonationPanelProps> = ({
  visible,
  source,
  match,
  isSignalActive,
  strings,
  a4Freq,
  capo,
  preferFlats,
  onStartMic,
  onActiveChange,
}) => {
  const { t } = useI18n();
  const [stringNumber, setStringNumber] = useState<number>(6);
  const [step, setStep] = useState<Step>('idle');
  const [openFreq, setOpenFreq] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, IntonationResult>>({});
  const [progress, setProgress] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);

  const captureRef = useRef(new StableReadingCapture());
  const wrongSinceRef = useRef<number | null>(null);

  const target = strings.find((s) => s.stringNumber === stringNumber) ?? strings[0];
  const targetFreq = midiToFrequency(target.midi, a4Freq);
  const targetLabel = midiToNoteDisplay(target.midi, a4Freq, preferFlats).fullLabel;
  const isMeasuring = step === 'open' || step === 'fretted';
  const result = results[stringNumber];

  useEffect(() => {
    onActiveChange(visible && isMeasuring);
  }, [visible, isMeasuring, onActiveChange]);

  // Leaving the panel abandons the current measurement
  useEffect(() => {
    if (!visible && isMeasuring) setStep(results[stringNumber] ? 'done' : 'idle');
  }, [visible]);

  // Results belong to one tuning and reference pitch
  useEffect(() => {
    setResults({});
    setStep('idle');
  }, [strings, a4Freq]);

  const resetCapture = () => {
    captureRef.current.reset();
    wrongSinceRef.current = null;
    setProgress(0);
    setWarning(null);
  };

  const startCheck = (n: number) => {
    setStringNumber(n);
    setOpenFreq(null);
    resetCapture();
    setStep('open');
  };

  useEffect(() => {
    if (!isMeasuring || source !== 'mic') return;
    const now = performance.now();
    if (!isSignalActive || !match) {
      captureRef.current.reset();
      wrongSinceRef.current = null;
      setProgress(0);
      return;
    }
    const freq = match.detectedFreq;

    const expected = step === 'open' ? targetFreq : (openFreq ?? targetFreq) * 2;
    const maxCents = step === 'open' ? OPEN_MAX_CENTS : FRETTED_MAX_CENTS;
    if (!isNearExpected(freq, expected, maxCents)) {
      captureRef.current.reset();
      setProgress(0);
      // The open string still ringing after step 1 is expected, not a mistake
      const isRingingOpen =
        step === 'fretted' && openFreq !== null && isNearExpected(freq, openFreq, 50);
      if (isRingingOpen) {
        wrongSinceRef.current = null;
        return;
      }
      wrongSinceRef.current ??= now;
      if (now - wrongSinceRef.current >= WRONG_NOTE_WARN_MS) {
        setWarning(
          step === 'open' ? t.intonation.wrongOpen(stringNumber, targetLabel) : t.intonation.wrongFretted
        );
      }
      return;
    }
    wrongSinceRef.current = null;

    const captured = captureRef.current.push(freq, now);
    setProgress(captureRef.current.progress(now));
    if (captured === null) return;

    if (step === 'open') {
      const off = getCentsDifference(captured, targetFreq);
      setOpenFreq(captured);
      resetCapture();
      if (Math.abs(off) > OPEN_TUNE_WARN_CENTS) {
        setWarning(t.intonation.openOff(off > 0, Math.round(Math.abs(off))));
      }
      setStep('fretted');
    } else if (openFreq !== null) {
      setResults((prev) => ({ ...prev, [stringNumber]: assessIntonation(openFreq, captured) }));
      resetCapture();
      setStep('done');
    }
  }, [match, isSignalActive]);

  // Only show a reading for the note we are waiting for (not the open string still ringing)
  const liveExpected = step === 'open' ? targetFreq : openFreq !== null ? openFreq * 2 : null;
  const liveCents =
    isMeasuring &&
    isSignalActive &&
    match &&
    liveExpected !== null &&
    isNearExpected(
      match.detectedFreq,
      liveExpected,
      step === 'open' ? OPEN_MAX_CENTS : FRETTED_MAX_CENTS
    )
      ? getCentsDifference(match.detectedFreq, liveExpected)
      : null;

  const nextString = stringNumber > 1 ? stringNumber - 1 : 6;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-surface border border-white/[0.08] p-4">
        <h2 className="text-sm font-semibold text-gray-100">{t.intonation.title}</h2>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
          {t.intonation.intro}
        </p>
        {capo > 0 && (
          <p className="mt-2 text-xs text-amber-300">{t.intonation.removeCapo}</p>
        )}

        {/* String picker with last results */}
        <div className="mt-4 grid grid-cols-6 gap-1.5" role="radiogroup" aria-label={t.intonation.pickStringAria}>
          {[6, 5, 4, 3, 2, 1].map((n) => {
            const s = strings.find((x) => x.stringNumber === n);
            const r = results[n];
            const selected = n === stringNumber;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={selected}
                data-testid={`intonation-string-${n}`}
                onClick={() => {
                  setStringNumber(n);
                  if (isMeasuring) startCheck(n);
                  else setStep(results[n] ? 'done' : 'idle');
                }}
                className={`min-h-[52px] rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  selected
                    ? 'bg-emerald-500/15 border-emerald-400/60'
                    : 'bg-raised border-white/[0.08] hover:bg-control'
                }`}
              >
                <span className={`text-xs font-semibold ${selected ? 'text-emerald-300' : 'text-gray-200'}`}>
                  {t.intonation.stringShort(n)}
                </span>
                <span
                  className={`font-mono-tabular text-[10px] ${
                    r
                      ? r.verdict === 'ok'
                        ? 'text-emerald-400'
                        : 'text-amber-300'
                      : 'text-gray-500'
                  }`}
                >
                  {r ? formatCents(r.cents) : s ? midiToNoteDisplay(s.midi, a4Freq, preferFlats).fullLabel : ''}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-surface border border-white/[0.08] p-4" aria-live="polite">
        {source !== 'mic' ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <p className="text-xs text-gray-400">
              {source === 'simulator' ? t.intonation.needRealGuitar : t.intonation.needMic}
            </p>
            <button
              type="button"
              onClick={onStartMic}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              <Mic className="w-4 h-4" aria-hidden="true" />
              {t.intonation.enableMic}
            </button>
          </div>
        ) : isMeasuring ? (
          <div className="space-y-4">
            <ol className="grid grid-cols-2 gap-2 text-xs">
              {[
                { key: 'open', label: t.intonation.stepOpen(stringNumber) },
                { key: 'fretted', label: t.intonation.stepFretted },
              ].map((s) => {
                const isCurrent = step === s.key;
                const isDone = s.key === 'open' && step === 'fretted';
                return (
                  <li
                    key={s.key}
                    className={`rounded-lg px-2.5 py-2 border ${
                      isCurrent
                        ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200 font-semibold'
                        : isDone
                          ? 'border-white/[0.08] text-emerald-400'
                          : 'border-white/[0.08] text-gray-500'
                    }`}
                  >
                    {isDone ? '✓ ' : ''}
                    {s.label}
                  </li>
                );
              })}
            </ol>

            <div className="text-center">
              <div className="text-xs text-gray-400">
                {step === 'open' ? t.intonation.liveOpen(targetLabel) : t.intonation.liveFretted}
              </div>
              <div
                data-testid="intonation-live-cents"
                className="mt-1 font-mono-tabular text-4xl font-bold text-white"
              >
                {liveCents === null ? '—' : formatCents(liveCents)}
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-inset overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-[width] duration-100"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <div className="mt-1.5 text-[11px] text-gray-500">
                {progress > 0 ? t.intonation.reading : t.intonation.pluckHint}
              </div>
            </div>

            {warning && (
              <p className="flex items-start gap-2 text-xs text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                {warning}
              </p>
            )}

            <button
              type="button"
              onClick={() => setStep(result ? 'done' : 'idle')}
              className="min-h-[40px] w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-raised border border-white/10 text-xs text-gray-300 hover:text-white"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              {t.intonation.cancel}
            </button>
          </div>
        ) : step === 'done' && result ? (
          <div className="space-y-4">
            <ResultView result={result} stringNumber={stringNumber} t={t} />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => startCheck(stringNumber)}
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-raised border border-white/10 text-sm text-gray-200 hover:text-white"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                {t.intonation.remeasure}
              </button>
              <button
                type="button"
                onClick={() => startCheck(nextString)}
                data-testid="intonation-next"
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                <SkipForward className="w-4 h-4" aria-hidden="true" />
                {t.intonation.checkString(nextString)}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => startCheck(stringNumber)}
            data-testid="intonation-start"
            className="min-h-[48px] w-full rounded-xl bg-emerald-500 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            {t.intonation.start(stringNumber, targetLabel)}
          </button>
        )}
      </section>
    </div>
  );
};

const ResultView: React.FC<{ result: IntonationResult; stringNumber: number; t: Messages }> = ({
  result,
  stringNumber,
  t,
}) => {
  const mm = Math.abs(result.saddleMoveMm);
  return (
    <div data-testid="intonation-result">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-gray-400">{t.intonation.resultHeader(stringNumber)}</span>
        <span
          className={`font-mono-tabular text-3xl font-bold ${
            result.verdict === 'ok' ? 'text-emerald-400' : 'text-amber-300'
          }`}
        >
          {formatCents(result.cents)}
        </span>
      </div>

      {result.verdict === 'ok' ? (
        <p className="mt-3 flex items-start gap-2 text-sm text-emerald-200">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          {t.intonation.ok(INTONATION_OK_CENTS)}
        </p>
      ) : (
        <div className="mt-3 space-y-2 text-sm text-gray-200">
          <p>
            {t.intonation.offPrefix(result.verdict === 'sharp')}
            <span className="font-semibold text-white">
              {t.intonation.moveSaddle(result.verdict === 'sharp')}
            </span>
            {t.intonation.estimate(mm < 0.1 ? '0.1' : mm.toFixed(1))}
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">
            {t.intonation.notes}
          </p>
        </div>
      )}
    </div>
  );
};
