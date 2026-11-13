import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Guitar,
  Mic,
  MicOff,
  RotateCcw,
  Sliders,
  SlidersHorizontal,
  Square,
  Timer,
  Volume2,
} from 'lucide-react';
import { CalibrationPanel } from './components/CalibrationPanel';
import { HeadstockPegboard } from './components/HeadstockPegboard';
import { MetronomePanel } from './components/MetronomePanel';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SimulatorBar } from './components/SimulatorBar';
import { TunerDial } from './components/TunerDial';
import { TuningPresetsPanel } from './components/TuningPresetsPanel';
import { useTunerAudio } from './hooks/useTunerAudio';
import { DEFAULT_BPM, getTimeSignatureById } from './utils/metronome';
import { MetronomeEngine } from './utils/metronomeEngine';
import {
  DEFAULT_A4_FREQ,
  GuitarStringTarget,
  STANDARD_TUNINGS,
  TuningPreset,
  applyCapoToMidi,
  midiToFrequency,
  midiToNoteDisplay,
  shiftStringMidi,
} from './utils/musicTheory';
import { referenceTonePlayer } from './utils/toneGenerator';

type MobileTab = 'tuner' | 'tunings' | 'metronome' | 'settings';
type DesktopSideTab = 'tunings' | 'metronome' | 'settings';

const STORAGE_KEY = 'xuanzhun_guitar_tuner_v1';

interface PersistedState {
  activePresetId: string;
  workingStrings: GuitarStringTarget[];
  customPresets: TuningPreset[];
  isManualMode: boolean;
  selectedManualString: number;
  isChromatic: boolean;
  a4Freq: number;
  capo: number;
  toleranceCents: number;
  preferFlats: boolean;
  metronomeBpm: number;
  metronomeTimeSigId: string;
  metronomeAccentFirstBeat: boolean;
}

function loadInitialState(): PersistedState {
  const fallback: PersistedState = {
    activePresetId: STANDARD_TUNINGS[0].id,
    workingStrings: STANDARD_TUNINGS[0].strings,
    customPresets: [],
    isManualMode: false,
    selectedManualString: 6,
    isChromatic: false,
    a4Freq: DEFAULT_A4_FREQ,
    capo: 0,
    toleranceCents: 4,
    preferFlats: false,
    metronomeBpm: DEFAULT_BPM,
    metronomeTimeSigId: '4/4',
    metronomeAccentFirstBeat: true,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      ...fallback,
      ...parsed,
      workingStrings:
        Array.isArray(parsed.workingStrings) && parsed.workingStrings.length === 6
          ? parsed.workingStrings
          : fallback.workingStrings,
      customPresets: Array.isArray(parsed.customPresets) ? parsed.customPresets : [],
    };
  } catch {
    return fallback;
  }
}

export default function App() {
  const [persisted, setPersisted] = useState<PersistedState>(loadInitialState);
  const [mobileTab, setMobileTab] = useState<MobileTab>('tuner');
  const [desktopSideTab, setDesktopSideTab] = useState<DesktopSideTab>('tunings');
  const [playingString, setPlayingString] = useState<number | null>(null);
  const [isLoopingTone, setIsLoopingTone] = useState(false);

  // Metronome state & engine
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false);
  const [metronomeBeatIndex, setMetronomeBeatIndex] = useState<number | null>(null);
  const [metronomeBarNumber, setMetronomeBarNumber] = useState<number>(1);
  const metronomeTimeSig = useMemo(
    () => getTimeSignatureById(persisted.metronomeTimeSigId),
    [persisted.metronomeTimeSigId]
  );
  const metronomeEngineRef = React.useRef<MetronomeEngine | null>(null);
  if (!metronomeEngineRef.current) {
    metronomeEngineRef.current = new MetronomeEngine(metronomeTimeSig);
  }

  useEffect(() => {
    metronomeEngineRef.current?.updateConfig(
      persisted.metronomeBpm,
      metronomeTimeSig,
      persisted.metronomeAccentFirstBeat
    );
  }, [persisted.metronomeBpm, metronomeTimeSig, persisted.metronomeAccentFirstBeat]);

  const handleToggleMetronome = useCallback(() => {
    const engine = metronomeEngineRef.current;
    if (!engine) return;
    if (isMetronomePlaying) {
      engine.stop();
      setIsMetronomePlaying(false);
      setMetronomeBeatIndex(null);
      setMetronomeBarNumber(1);
    } else {
      engine.updateConfig(
        persisted.metronomeBpm,
        metronomeTimeSig,
        persisted.metronomeAccentFirstBeat
      );
      setIsMetronomePlaying(true);
      engine.start((info) => {
        setMetronomeBeatIndex(info.beatIndex);
        setMetronomeBarNumber(info.barNumber);
      });
    }
  }, [
    isMetronomePlaying,
    persisted.metronomeBpm,
    metronomeTimeSig,
    persisted.metronomeAccentFirstBeat,
  ]);

  // Simulator controls
  const [simStringNumber, setSimStringNumber] = useState<number>(6);
  const [simDetuneCents, setSimDetuneCents] = useState<number>(-18);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // Ignore storage quota issues
    }
  }, [persisted]);

  const allPresets = useMemo(
    () => [...STANDARD_TUNINGS, ...persisted.customPresets],
    [persisted.customPresets]
  );

  const activePreset = useMemo(
    () => allPresets.find((p) => p.id === persisted.activePresetId) ?? STANDARD_TUNINGS[0],
    [allPresets, persisted.activePresetId]
  );

  const isStringsModified = useMemo(() => {
    return persisted.workingStrings.some(
      (s, idx) => s.midi !== activePreset.strings[idx]?.midi
    );
  }, [persisted.workingStrings, activePreset]);

  const {
    state: audioState,
    waveformRef,
    startMicrophone,
    startSimulator,
    stopAll,
    resetTunedProgress,
  } = useTunerAudio({
    strings: persisted.workingStrings,
    a4Freq: persisted.a4Freq,
    capo: persisted.capo,
    toleranceCents: persisted.toleranceCents,
    isChromatic: persisted.isChromatic,
    manualStringNumber: persisted.isManualMode ? persisted.selectedManualString : null,
    preferFlats: persisted.preferFlats,
    simStringNumber,
    simDetuneCents,
  });

  // Stop looping reference tone & metronome cleanly on unmount
  useEffect(() => {
    return () => {
      referenceTonePlayer.stop();
      metronomeEngineRef.current?.stop();
    };
  }, []);

  // Microphone listens by default. wantMicRef records whether the user still wants it, so that
  // an explicit stop or the simulator is respected when the app comes back from the background.
  const wantMicRef = React.useRef(true);
  const audioSourceRef = React.useRef(audioState.source);
  audioSourceRef.current = audioState.source;

  const handleStartMic = useCallback(() => {
    wantMicRef.current = true;
    void startMicrophone();
  }, [startMicrophone]);

  const handleStopMic = useCallback(() => {
    wantMicRef.current = false;
    stopAll();
  }, [stopAll]);

  const handleStartSimulator = useCallback(() => {
    wantMicRef.current = false;
    startSimulator();
  }, [startSimulator]);

  const handleStopSimulator = useCallback(() => {
    wantMicRef.current = true;
    void startMicrophone();
  }, [startMicrophone]);

  useEffect(() => {
    void startMicrophone();
    // Release the mic in the background (privacy, battery; iOS cuts it anyway) and
    // pick it up again when the app is shown.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (audioSourceRef.current === 'mic') stopAll();
      } else if (wantMicRef.current && audioSourceRef.current !== 'mic') {
        void startMicrophone();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    // Mount-only: startMicrophone and stopAll are stable callbacks
  }, []);

  const playStringTone = useCallback(
    (stringNumber: number, loop: boolean = false) => {
      const targetStr =
        persisted.workingStrings.find((s) => s.stringNumber === stringNumber) ??
        persisted.workingStrings[0];
      const effectiveMidi = applyCapoToMidi(targetStr.midi, persisted.capo);
      const freq = midiToFrequency(effectiveMidi, persisted.a4Freq);

      setPlayingString(stringNumber);
      if (loop) {
        setIsLoopingTone(true);
        referenceTonePlayer.startLoop(freq);
      } else {
        setIsLoopingTone(false);
        referenceTonePlayer.stop();
        referenceTonePlayer.playPluck(freq, 1.6);
        window.setTimeout(() => {
          setPlayingString((curr) => (curr === stringNumber ? null : curr));
        }, 1200);
      }
    },
    [persisted.workingStrings, persisted.capo, persisted.a4Freq]
  );

  const stopReferenceTone = useCallback(() => {
    referenceTonePlayer.stop();
    setIsLoopingTone(false);
    setPlayingString(null);
  }, []);

  const handleSelectPeg = useCallback(
    (stringNumber: number) => {
      if (persisted.isManualMode) {
        setPersisted((prev) => ({ ...prev, selectedManualString: stringNumber }));
        setSimStringNumber(stringNumber);
      }
      playStringTone(stringNumber, false);
    },
    [persisted.isManualMode, playStringTone]
  );

  const manualStringSelectRef = React.useRef<HTMLSelectElement | null>(null);

  // Open the string dropdown right after tapping "手动定弦". showPicker() needs the tap's user
  // activation (still valid on the next frame); browsers without it just show the dropdown.
  const openManualStringPicker = () => {
    requestAnimationFrame(() => {
      const select = manualStringSelectRef.current;
      if (!select) return;
      try {
        (select as HTMLSelectElement & { showPicker?: () => void }).showPicker?.();
      } catch {
        select.focus();
      }
    });
  };

  const handleToggleMode = (manual: boolean) => {
    stopReferenceTone();
    setPersisted((prev) => ({
      ...prev,
      isManualMode: manual,
      isChromatic: manual ? false : prev.isChromatic,
    }));
  };

  const handleSelectPreset = (preset: TuningPreset) => {
    stopReferenceTone();
    resetTunedProgress();
    setPersisted((prev) => ({
      ...prev,
      activePresetId: preset.id,
      workingStrings: preset.strings.map((s) => ({ ...s })),
      isChromatic: false,
    }));
  };

  const handleSetStringMidi = (stringNumber: number, midi: number) => {
    stopReferenceTone();
    resetTunedProgress();
    setPersisted((prev) => ({
      ...prev,
      workingStrings: prev.workingStrings.map((s) =>
        s.stringNumber === stringNumber ? { ...s, midi } : s
      ),
    }));
  };

  const handleShiftStringMidi = (stringNumber: number, delta: number) => {
    stopReferenceTone();
    resetTunedProgress();
    setPersisted((prev) => ({
      ...prev,
      workingStrings: prev.workingStrings.map((s) =>
        s.stringNumber === stringNumber
          ? { ...s, midi: shiftStringMidi(s.midi, delta) }
          : s
      ),
    }));
  };

  const handleResetToPreset = () => {
    stopReferenceTone();
    resetTunedProgress();
    setPersisted((prev) => ({
      ...prev,
      workingStrings: activePreset.strings.map((s) => ({ ...s })),
    }));
  };

  const handleSaveCustomPreset = (name: string) => {
    const newPreset: TuningPreset = {
      id: `custom-${Date.now()}`,
      name,
      englishName: 'Custom',
      category: 'custom',
      description: '用户手动设定的自定义定弦方案',
      strings: persisted.workingStrings.map((s) => ({ ...s })),
    };
    setPersisted((prev) => ({
      ...prev,
      customPresets: [...prev.customPresets, newPreset],
      activePresetId: newPreset.id,
    }));
  };

  const handleDeleteCustomPreset = (id: string) => {
    setPersisted((prev) => {
      const remaining = prev.customPresets.filter((p) => p.id !== id);
      const deletingActive = prev.activePresetId === id;
      return {
        ...prev,
        customPresets: remaining,
        activePresetId: deletingActive ? STANDARD_TUNINGS[0].id : prev.activePresetId,
        workingStrings: deletingActive
          ? STANDARD_TUNINGS[0].strings.map((s) => ({ ...s }))
          : prev.workingStrings,
      };
    });
  };

  const activeHeaderSummary = persisted.isChromatic
    ? `十二平均律 · A4 = ${persisted.a4Freq} Hz`
    : `${activePreset.name}${isStringsModified ? ' (已微调)' : ''} · A4 = ${persisted.a4Freq} Hz${
        persisted.capo > 0 ? ` · Capo +${persisted.capo}` : ''
      }`;

  const selectedStringObj =
    persisted.workingStrings.find((s) => s.stringNumber === persisted.selectedManualString) ??
    persisted.workingStrings[0];
  const selectedStringDisplay = midiToNoteDisplay(
    applyCapoToMidi(selectedStringObj.midi, persisted.capo),
    persisted.a4Freq,
    persisted.preferFlats
  );

  return (
    <div className="min-h-screen bg-app text-gray-100 flex flex-col">
      {/* Compact Sticky Top Bar (52px mobile, 3-zone desktop) */}
      <header className="sticky top-0 z-30 h-[52px] bg-app/90 backdrop-blur-md border-b border-white/[0.08] px-4 lg:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 shrink-0">
          <Guitar className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
          <span className="font-display text-base sm:text-lg font-bold tracking-tight whitespace-nowrap">
            弦准吉他调音器
          </span>
        </div>

        {/* Unboxed clean metadata summary on tablet/desktop */}
        <div className="hidden md:flex items-center gap-2 text-xs text-gray-400 font-mono-tabular truncate">
          <span>{activeHeaderSummary}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton variant="compact" />
          {audioState.tunedStrings.length > 0 && (
            <button
              type="button"
              onClick={resetTunedProgress}
              aria-label="重置已调准琴弦进度"
              className="min-h-[36px] flex items-center gap-1 rounded-lg bg-raised border border-white/10 px-2.5 text-xs text-gray-300 hover:text-white whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">重置进度 ({audioState.tunedStrings.length}/6)</span>
              <span className="sm:hidden">{audioState.tunedStrings.length}/6</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Responsive Workspace */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-24 lg:pb-10">
        {/* Mobile Active Preset Summary */}
        <div className="md:hidden mb-3 flex items-center justify-between gap-2 text-xs text-gray-400 font-mono-tabular">
          <span className="truncate">{activeHeaderSummary}</span>
          <button
            type="button"
            onClick={() => setMobileTab('tunings')}
            className="text-emerald-400 font-medium whitespace-nowrap shrink-0"
          >
            切换定弦
          </button>
        </div>

        {/* Microphone Error Banner with 1-tap Simulator Fallback */}
        {audioState.error && (
          <div
            role="alert"
            className="mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-2.5 text-xs sm:text-sm text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{audioState.error}</span>
            </div>
            <button
              type="button"
              onClick={handleStartSimulator}
              className="min-h-[40px] rounded-xl bg-amber-400 px-3.5 text-xs font-semibold text-slate-950 hover:bg-amber-300 whitespace-nowrap shrink-0"
            >
              使用试音模拟
            </button>
          </div>
        )}

        {audioState.source === 'mic' && audioState.needsUserGesture && (
          <button
            type="button"
            data-testid="tap-to-listen"
            className="mb-4 w-full rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 flex items-center justify-center gap-2.5 text-sm text-emerald-100"
          >
            <Mic className="w-4 h-4 text-emerald-300 shrink-0" aria-hidden="true" />
            <span>浏览器需要先点一下：轻触屏幕任意位置开始监听</span>
          </button>
        )}

        {audioState.source === 'mic' && audioState.isClipping && (
          <div
            role="status"
            data-testid="clipping-warning"
            className="mb-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 p-3.5 flex items-start gap-2.5 text-xs sm:text-sm text-amber-100"
          >
            <AlertCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
            <span>声音太大，麦克风已过载，读数可能跳动。请让手机离琴远一点，或弹轻一些。</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left / Primary Column (Always visible on Desktop, visible on 'tuner' tab on Mobile) */}
          <div
            className={`lg:col-span-7 space-y-4 ${
              mobileTab === 'tuner' ? 'block' : 'hidden lg:block'
            }`}
          >
            {/* Mode Switcher: Auto vs Manual */}
            <div
              role="tablist"
              aria-label="调音模式切换"
              className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-surface border border-white/[0.08]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={!persisted.isManualMode}
                data-testid="mode-auto"
                onClick={() => handleToggleMode(false)}
                className={`min-h-[44px] rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                  !persisted.isManualMode
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                自动调弦（智能识别）
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={persisted.isManualMode}
                data-testid="mode-manual"
                onClick={() => {
                  handleToggleMode(true);
                  openManualStringPicker();
                }}
                className={`min-h-[44px] rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                  persisted.isManualMode
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                手动定弦（锁定音调）
              </button>
            </div>

            {/* Target string picker, right under the mode switch so no scrolling to the headstock */}
            {persisted.isManualMode && (
              <label className="flex items-center gap-3 rounded-2xl bg-surface border border-white/[0.08] px-3.5 py-2">
                <span className="text-sm text-gray-300 whitespace-nowrap">目标琴弦</span>
                <select
                  ref={manualStringSelectRef}
                  data-testid="manual-string-select"
                  value={persisted.selectedManualString}
                  onChange={(e) => handleSelectPeg(Number(e.target.value))}
                  className="flex-1 min-w-0 min-h-[44px] rounded-xl bg-control border border-white/10 px-3 text-sm font-semibold text-gray-100 font-mono-tabular [color-scheme:dark]"
                >
                  {[...persisted.workingStrings]
                    .sort((a, b) => b.stringNumber - a.stringNumber)
                    .map((s) => {
                      const d = midiToNoteDisplay(
                        applyCapoToMidi(s.midi, persisted.capo),
                        persisted.a4Freq,
                        persisted.preferFlats
                      );
                      return (
                        <option key={s.stringNumber} value={s.stringNumber}>
                          {s.stringNumber} 弦 · {d.fullLabel} · {d.frequency.toFixed(1)} Hz
                        </option>
                      );
                    })}
                </select>
              </label>
            )}

            {/* Precision Tuner Dial */}
            <TunerDial
              source={audioState.source}
              match={audioState.match}
              isSignalActive={audioState.isSignalActive}
              isLockedInTune={audioState.isLockedInTune}
              toleranceCents={persisted.toleranceCents}
              isChromatic={persisted.isChromatic}
              manualStringNumber={
                persisted.isManualMode ? persisted.selectedManualString : null
              }
              strings={persisted.workingStrings}
              a4Freq={persisted.a4Freq}
              capo={persisted.capo}
              preferFlats={persisted.preferFlats}
              waveformRef={waveformRef}
            />

            {/* Primary Audio & Reference Tone Action Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {audioState.source === 'mic' ? (
                <button
                  type="button"
                  onClick={handleStopMic}
                  data-testid="btn-mic-toggle"
                  className="min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-rose-500/20 border border-rose-500/40 px-4 text-sm font-semibold text-rose-200 hover:bg-rose-500/30 active:scale-[0.98] transition-all"
                >
                  <MicOff className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>停止麦克风监听</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartMic}
                  data-testid="btn-mic-toggle"
                  className="min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-slate-950 hover:bg-emerald-400 active:scale-[0.98] transition-all"
                >
                  <Mic className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>开启麦克风调音</span>
                </button>
              )}

              {persisted.isManualMode && !persisted.isChromatic ? (
                isLoopingTone ? (
                  <button
                    type="button"
                    onClick={stopReferenceTone}
                    data-testid="btn-reference-tone"
                    className="min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-amber-400/20 border border-amber-400/50 px-4 text-sm font-semibold text-amber-200 hover:bg-amber-400/30 active:scale-[0.98] transition-all"
                  >
                    <Square className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>停止持续参考音 ({selectedStringDisplay.fullLabel})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => playStringTone(persisted.selectedManualString, true)}
                    data-testid="btn-reference-tone"
                    className="min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-control border border-white/10 px-4 text-sm font-semibold text-gray-100 hover:bg-control-hover active:scale-[0.98] transition-all"
                  >
                    <Volume2 className="w-4 h-4 shrink-0 text-amber-300" aria-hidden="true" />
                    <span>持续播放参考音 ({selectedStringDisplay.fullLabel})</span>
                  </button>
                )
              ) : audioState.source === 'simulator' ? (
                <button
                  type="button"
                  onClick={handleStopSimulator}
                  data-testid="btn-sim-toggle"
                  className="min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-amber-400/20 border border-amber-400/50 px-4 text-sm font-semibold text-amber-200 hover:bg-amber-400/30 active:scale-[0.98] transition-all"
                >
                  <Square className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>关闭试音模拟</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartSimulator}
                  data-testid="btn-sim-toggle"
                  className="min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-control border border-white/10 px-4 text-sm font-semibold text-gray-100 hover:bg-control-hover active:scale-[0.98] transition-all"
                >
                  <SlidersHorizontal className="w-4 h-4 shrink-0 text-amber-300" aria-hidden="true" />
                  <span>内置吉他试音模拟</span>
                </button>
              )}
            </div>

            {/* Simulator Bar when simulator is active */}
            {audioState.source === 'simulator' && (
              <SimulatorBar
                strings={persisted.workingStrings}
                a4Freq={persisted.a4Freq}
                capo={persisted.capo}
                preferFlats={persisted.preferFlats}
                simStringNumber={simStringNumber}
                simDetuneCents={simDetuneCents}
                onChangeSimString={setSimStringNumber}
                onChangeSimDetune={setSimDetuneCents}
                onStopSimulator={handleStopSimulator}
              />
            )}

            {/* Quick Simulator trigger when in Manual mode */}
            {persisted.isManualMode && audioState.source !== 'simulator' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleStartSimulator}
                  data-testid="btn-sim-toggle"
                  className="text-xs text-gray-400 hover:text-amber-300 underline underline-offset-4 transition-colors"
                >
                  没有实体吉他？开启内置信号模拟测试
                </button>
              </div>
            )}

            {/* Interactive 3+3 Guitar Headstock */}
            <HeadstockPegboard
              strings={persisted.workingStrings}
              a4Freq={persisted.a4Freq}
              capo={persisted.capo}
              preferFlats={persisted.preferFlats}
              isManualMode={persisted.isManualMode}
              isChromatic={persisted.isChromatic}
              selectedManualString={persisted.selectedManualString}
              activeDetectedString={
                audioState.isSignalActive ? audioState.match?.stringNumber ?? null : null
              }
              tunedStrings={audioState.tunedStrings}
              playingString={playingString}
              onSelectString={handleSelectPeg}
              onShiftStringPitch={handleShiftStringMidi}
            />
          </div>

          {/* Right / Studio Configuration Column (Desktop) & Mobile Sub-Tabs */}
          <div className="lg:col-span-5 space-y-4">
            {/* Desktop Studio Panel Tab Switcher */}
            <div className="hidden lg:grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-surface border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setDesktopSideTab('tunings')}
                data-testid="desktop-tab-tunings"
                className={`min-h-[44px] rounded-xl text-xs xl:text-sm font-semibold transition-colors whitespace-nowrap px-2 ${
                  desktopSideTab === 'tunings'
                    ? 'bg-control-hover text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                定弦与设音
              </button>
              <button
                type="button"
                onClick={() => setDesktopSideTab('metronome')}
                data-testid="desktop-tab-metronome"
                className={`min-h-[44px] rounded-xl text-xs xl:text-sm font-semibold transition-colors whitespace-nowrap px-2 ${
                  desktopSideTab === 'metronome'
                    ? 'bg-control-hover text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                节拍器{isMetronomePlaying ? ` · ${persisted.metronomeBpm}` : ''}
              </button>
              <button
                type="button"
                onClick={() => setDesktopSideTab('settings')}
                data-testid="desktop-tab-settings"
                className={`min-h-[44px] rounded-xl text-xs xl:text-sm font-semibold transition-colors whitespace-nowrap px-2 ${
                  desktopSideTab === 'settings'
                    ? 'bg-control-hover text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                校准设置
              </button>
            </div>

            {/* Tunings & Manual Pitch Editor */}
            <div
              className={
                mobileTab === 'tunings'
                  ? 'block'
                  : desktopSideTab === 'tunings'
                    ? 'hidden lg:block'
                    : 'hidden'
              }
            >
              <TuningPresetsPanel
                activePresetId={persisted.activePresetId}
                customPresets={persisted.customPresets}
                workingStrings={persisted.workingStrings}
                isModified={isStringsModified}
                isChromatic={persisted.isChromatic}
                a4Freq={persisted.a4Freq}
                preferFlats={persisted.preferFlats}
                onSelectPreset={handleSelectPreset}
                onToggleChromatic={(enabled) =>
                  setPersisted((prev) => ({
                    ...prev,
                    isChromatic: enabled,
                    isManualMode: enabled ? false : prev.isManualMode,
                  }))
                }
                onSetStringMidi={handleSetStringMidi}
                onShiftStringMidi={handleShiftStringMidi}
                onResetToPreset={handleResetToPreset}
                onSaveCustomPreset={handleSaveCustomPreset}
                onDeleteCustomPreset={handleDeleteCustomPreset}
              />
            </div>

            {/* Metronome */}
            <div
              className={
                mobileTab === 'metronome'
                  ? 'block'
                  : desktopSideTab === 'metronome'
                    ? 'hidden lg:block'
                    : 'hidden'
              }
            >
              <MetronomePanel
                bpm={persisted.metronomeBpm}
                timeSignature={metronomeTimeSig}
                accentFirstBeat={persisted.metronomeAccentFirstBeat}
                isPlaying={isMetronomePlaying}
                activeBeatIndex={metronomeBeatIndex}
                barNumber={metronomeBarNumber}
                onChangeBpm={(metronomeBpm) =>
                  setPersisted((prev) => ({ ...prev, metronomeBpm }))
                }
                onChangeTimeSignature={(metronomeTimeSigId) =>
                  setPersisted((prev) => ({ ...prev, metronomeTimeSigId }))
                }
                onChangeAccentFirstBeat={(metronomeAccentFirstBeat) =>
                  setPersisted((prev) => ({ ...prev, metronomeAccentFirstBeat }))
                }
                onTogglePlay={handleToggleMetronome}
              />
            </div>

            {/* Calibration & Settings */}
            <div
              className={
                mobileTab === 'settings'
                  ? 'block'
                  : desktopSideTab === 'settings'
                    ? 'hidden lg:block'
                    : 'hidden'
              }
            >
              <CalibrationPanel
                a4Freq={persisted.a4Freq}
                capo={persisted.capo}
                toleranceCents={persisted.toleranceCents}
                preferFlats={persisted.preferFlats}
                onChangeA4={(a4Freq) => setPersisted((prev) => ({ ...prev, a4Freq }))}
                onChangeCapo={(capo) => setPersisted((prev) => ({ ...prev, capo }))}
                onChangeTolerance={(toleranceCents) =>
                  setPersisted((prev) => ({ ...prev, toleranceCents }))
                }
                onChangePreferFlats={(preferFlats) =>
                  setPersisted((prev) => ({ ...prev, preferFlats }))
                }
              />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Tab Bar (64px height, Natural Thumb Zone, <= 15% total sticky height) */}
      <nav
        aria-label="移动端主导航"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-nav/95 backdrop-blur-md border-t border-white/[0.08] pb-safe"
      >
        <div className="grid grid-cols-4 h-16 items-center">
          <button
            type="button"
            onClick={() => setMobileTab('tuner')}
            data-testid="mobile-nav-tuner"
            aria-current={mobileTab === 'tuner' ? 'page' : undefined}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
              mobileTab === 'tuner' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Activity className="w-5 h-5" aria-hidden="true" />
            <span className="text-[11px] font-medium">调音器</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('tunings')}
            data-testid="mobile-nav-tunings"
            aria-current={mobileTab === 'tunings' ? 'page' : undefined}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
              mobileTab === 'tunings' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Guitar className="w-5 h-5" aria-hidden="true" />
            <span className="text-[11px] font-medium">定弦方案</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('metronome')}
            data-testid="mobile-nav-metronome"
            aria-current={mobileTab === 'metronome' ? 'page' : undefined}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
              mobileTab === 'metronome'
                ? 'text-emerald-400'
                : isMetronomePlaying
                  ? 'text-amber-300'
                  : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Timer className="w-5 h-5" aria-hidden="true" />
            <span className="text-[11px] font-medium">节拍器</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('settings')}
            data-testid="mobile-nav-settings"
            aria-current={mobileTab === 'settings' ? 'page' : undefined}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
              mobileTab === 'settings' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sliders className="w-5 h-5" aria-hidden="true" />
            <span className="text-[11px] font-medium">校准设置</span>
          </button>
        </div>
      </nav>

      <OfflineIndicator />
    </div>
  );
}
