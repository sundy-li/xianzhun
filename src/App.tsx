import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  Activity,
  AlertCircle,
  ChevronDown,
  Guitar,
  Mic,
  Pause,
  RotateCcw,
  Ruler,
  Sliders,
  SlidersHorizontal,
  Timer,
} from 'lucide-react';
import { CalibrationPanel } from './components/CalibrationPanel';
import { HeadstockPegboard } from './components/HeadstockPegboard';
import { IntonationPanel } from './components/IntonationPanel';
import { MetronomePanel } from './components/MetronomePanel';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SimulatorBar } from './components/SimulatorBar';
import { TunerDial } from './components/TunerDial';
import { TuningPresetsPanel } from './components/TuningPresetsPanel';
import { useTunerAudio } from './hooks/useTunerAudio';
import { useWakeLock } from './hooks/useWakeLock';
import { presetText, useI18n } from './i18n';
import { DEFAULT_BPM, getTimeSignatureById } from './utils/metronome';
import { MetronomeEngine } from './utils/metronomeEngine';
import {
  DEFAULT_A4_FREQ,
  GuitarStringTarget,
  STANDARD_TUNINGS,
  TuningPreset,
  applyCapoToMidi,
  midiToFrequency,
  shiftStringMidi,
} from './utils/musicTheory';
import { referenceTonePlayer } from './utils/toneGenerator';

type MobileTab = 'tuner' | 'tunings' | 'intonation' | 'metronome' | 'settings';
type DesktopSideTab = 'tunings' | 'intonation' | 'metronome' | 'settings';

// Same breakpoint as Tailwind `lg`, where the side panel sits next to the tuner
const DESKTOP_QUERY = '(min-width: 1024px)';
const subscribeDesktop = (onChange: () => void) => {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};
const getIsDesktop = () => window.matchMedia(DESKTOP_QUERY).matches;

const STORAGE_KEY = 'xianzhun_guitar_tuner_v1';

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
  const { t, lang, setLang } = useI18n();
  const [persisted, setPersisted] = useState<PersistedState>(loadInitialState);
  const [mobileTab, setMobileTab] = useState<MobileTab>('tuner');
  const [desktopSideTab, setDesktopSideTab] = useState<DesktopSideTab>('tunings');
  const [playingString, setPlayingString] = useState<number | null>(null);
  const [isLoopingTone, setIsLoopingTone] = useState(false);
  const isDesktop = useSyncExternalStore(subscribeDesktop, getIsDesktop);
  const isIntonationVisible = isDesktop
    ? desktopSideTab === 'intonation'
    : mobileTab === 'intonation';
  // While an intonation check runs the tuner follows any note: the 12th fret is an octave above the string
  const [isIntonationActive, setIsIntonationActive] = useState(false);
  const isChromaticEffective = persisted.isChromatic || isIntonationActive;

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
    isChromatic: isChromaticEffective,
    manualStringNumber: persisted.isManualMode ? persisted.selectedManualString : null,
    preferFlats: persisted.preferFlats,
    simStringNumber,
    simDetuneCents,
  });

  useWakeLock(audioState.source !== 'idle' || isMetronomePlaying || isLoopingTone);

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

  // Tapping a peg locks that string as the manual target and plays its reference tone.
  const handleSelectPeg = useCallback(
    (stringNumber: number) => {
      setPersisted((prev) => ({
        ...prev,
        isManualMode: true,
        isChromatic: false,
        selectedManualString: stringNumber,
      }));
      setSimStringNumber(stringNumber);
      playStringTone(stringNumber, false);
    },
    [playStringTone]
  );

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
      description: '',
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
    ? t.app.chromaticSummary(persisted.a4Freq)
    : `${presetText(activePreset, t).name}${isStringsModified ? t.app.modifiedSuffix : ''} · ${persisted.a4Freq}Hz${
        persisted.capo > 0 ? ` · Capo ${persisted.capo}` : ''
      }`;

  const openTuningsPanel = () => {
    setMobileTab('tunings');
    setDesktopSideTab('tunings');
  };

  return (
    <div className="min-h-screen desk:h-dvh desk:min-h-0 desk:overflow-hidden bg-app text-gray-100 flex flex-col">
      {/* Sticky top bar: brand, current tuning (tap to change), utility actions */}
      <header className="sticky top-0 z-30 bg-app/90 backdrop-blur-md border-b border-white/[0.08] pt-safe">
        <div className="h-14 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Guitar className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
          <h1 className="font-display text-base sm:text-lg font-bold tracking-tight whitespace-nowrap">
            <span className="sm:hidden">{t.app.brandShort}</span>
            <span className="hidden sm:inline">{t.app.brandFull}</span>
          </h1>
        </div>

        <button
          type="button"
          onClick={openTuningsPanel}
          data-testid="header-tuning-chip"
          aria-label={t.app.tuningChipAria(activeHeaderSummary)}
          className="min-w-0 h-9 flex items-center gap-1.5 rounded-full bg-raised border border-white/10 pl-3 pr-2 text-xs text-gray-300 hover:text-white hover:border-white/20 transition-colors"
        >
          <span className="truncate font-mono-tabular">{activeHeaderSummary}</span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-gray-400" aria-hidden="true" />
        </button>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            aria-label={t.app.switchLanguageAria}
            data-testid="header-lang-toggle"
            className="min-h-[36px] min-w-[40px] rounded-lg bg-raised border border-white/10 px-2 text-xs font-semibold text-gray-300 hover:text-white"
          >
            {lang === 'zh' ? 'EN' : '中'}
          </button>
          <PWAInstallButton variant="compact" />
          {audioState.tunedStrings.length > 0 && (
            <button
              type="button"
              onClick={resetTunedProgress}
              aria-label={t.app.resetProgressAria}
              className="min-h-[36px] flex items-center gap-1 rounded-lg bg-raised border border-white/10 px-2.5 text-xs text-gray-300 hover:text-white whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t.app.resetProgress(audioState.tunedStrings.length)}</span>
              <span className="sm:hidden">{audioState.tunedStrings.length}/6</span>
            </button>
          )}
        </div>
        </div>
      </header>

      {/* Main Responsive Workspace */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 lg:pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-5 desk:min-h-0 desk:flex desk:flex-col">
        {/* Microphone Error Banner with 1-tap Simulator Fallback */}
        {audioState.error && (
          <div
            role="alert"
            className="mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-2.5 text-xs sm:text-sm text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{t.errors[audioState.error]}</span>
            </div>
            <button
              type="button"
              onClick={handleStartSimulator}
              className="min-h-[40px] rounded-xl bg-amber-400 px-3.5 text-xs font-semibold text-slate-950 hover:bg-amber-300 whitespace-nowrap shrink-0"
            >
              {t.app.useSimulator}
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
            <span>{t.app.tapToListen}</span>
          </button>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 desk:grid-rows-[minmax(0,1fr)] gap-5 lg:gap-6 items-start desk:items-stretch desk:flex-1 desk:min-h-0">
          {/* Left / Primary Column (Always visible on Desktop, visible on 'tuner' tab on Mobile) */}
          <div
            className={`relative lg:col-span-7 lg:sticky lg:top-[76px] desk:static desk:min-h-0 lg:flex-col desk:overflow-y-auto scroll-thin space-y-4 lg:space-y-0 lg:gap-2 ${
              mobileTab === 'tuner' ? 'block lg:flex' : 'hidden lg:flex'
            }`}
          >
            {/* Precision Tuner Dial */}
            <TunerDial
              source={audioState.source}
              match={audioState.match}
              isSignalActive={audioState.isSignalActive}
              isLockedInTune={audioState.isLockedInTune}
              toleranceCents={persisted.toleranceCents}
              isChromatic={isChromaticEffective}
              manualStringNumber={
                persisted.isManualMode ? persisted.selectedManualString : null
              }
              strings={persisted.workingStrings}
              a4Freq={persisted.a4Freq}
              capo={persisted.capo}
              preferFlats={persisted.preferFlats}
              waveformRef={waveformRef}
              isClipping={audioState.source === 'mic' && audioState.isClipping}
              statusControl={
                audioState.source === 'mic' ? (
                  <button
                    type="button"
                    onClick={handleStopMic}
                    data-testid="btn-mic-toggle"
                    aria-label={t.app.pauseMicAria}
                    className="min-h-[44px] -my-1.5 -ml-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 text-emerald-400 font-medium hover:bg-emerald-500/10 transition-colors"
                  >
                    <span className="relative flex w-2 h-2" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping" />
                      <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
                    </span>
                    {t.app.listening}
                    <Pause className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
                  </button>
                ) : undefined
              }
              modeControl={
                <button
                  type="button"
                  role="switch"
                  aria-checked={!persisted.isManualMode}
                  aria-label={t.app.autoModeAria}
                  data-testid="mode-switch"
                  onClick={() => handleToggleMode(!persisted.isManualMode)}
                  className="min-h-[44px] -my-1.5 -mr-1.5 inline-flex items-center gap-2 rounded-full pl-2.5 pr-1.5 hover:bg-white/[0.04] transition-colors"
                >
                  <span
                    className={`text-xs font-semibold ${
                      persisted.isManualMode ? 'text-gray-400' : 'text-emerald-400'
                    }`}
                  >
                    {persisted.isManualMode ? t.app.manual : t.app.auto}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                      persisted.isManualMode ? 'bg-control-hover' : 'bg-emerald-500'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                        persisted.isManualMode ? 'translate-x-0' : 'translate-x-5'
                      }`}
                    />
                  </span>
                </button>
              }
              className="desk:flex-1"
              idleAction={
                <button
                  type="button"
                  onClick={handleStartMic}
                  data-testid="btn-mic-toggle"
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 active:scale-[0.98] transition-[background-color,transform]"
                >
                  <Mic className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {t.app.startListening}
                </button>
              }
            >
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
                isLoopingTone={isLoopingTone}
                onSelectString={handleSelectPeg}
                onShiftStringPitch={handleShiftStringMidi}
                onToggleLoopTone={() =>
                  isLoopingTone
                    ? stopReferenceTone()
                    : playStringTone(persisted.selectedManualString, true)
                }
              />
            </TunerDial>

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

            {/* Secondary entry: test without a guitar */}
            {audioState.source !== 'simulator' && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleStartSimulator}
                  data-testid="btn-sim-toggle"
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-3 text-xs text-gray-400 hover:text-amber-300 transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                  {t.app.trySimulator}
                </button>
              </div>
            )}
          </div>

          {/* Right / Studio Configuration Column (Desktop) & Mobile Sub-Tabs */}
          <div className="lg:col-span-5 desk:min-h-0 lg:flex lg:flex-col lg:gap-4">
            {/* Desktop Studio Panel Tab Switcher */}
            <div className="hidden lg:grid shrink-0 grid-cols-4 gap-1.5 p-1 rounded-2xl bg-surface border border-white/[0.08]">
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
                {t.tabs.tuningsDesktop}
              </button>
              <button
                type="button"
                onClick={() => setDesktopSideTab('intonation')}
                data-testid="desktop-tab-intonation"
                className={`min-h-[44px] rounded-xl text-xs xl:text-sm font-semibold transition-colors whitespace-nowrap px-2 ${
                  desktopSideTab === 'intonation'
                    ? 'bg-control-hover text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {t.tabs.intonation}
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
                {t.tabs.metronome}{isMetronomePlaying ? ` · ${persisted.metronomeBpm}` : ''}
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
                {t.tabs.settings}
              </button>
            </div>

            {/* Only this pane scrolls on desktop; the tuner stays in view */}
            <div className="relative desk:flex-1 desk:min-h-0 desk:overflow-y-auto scroll-thin desk:-mr-2 desk:pr-2 desk:pb-6 desk:[mask-image:linear-gradient(to_bottom,black_calc(100%-24px),transparent)]">
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

            {/* Intonation check */}
            <div
              className={
                mobileTab === 'intonation'
                  ? 'block'
                  : desktopSideTab === 'intonation'
                    ? 'hidden lg:block'
                    : 'hidden'
              }
            >
              <IntonationPanel
                visible={isIntonationVisible}
                source={audioState.source}
                match={audioState.match}
                isSignalActive={audioState.isSignalActive}
                strings={persisted.workingStrings}
                a4Freq={persisted.a4Freq}
                capo={persisted.capo}
                preferFlats={persisted.preferFlats}
                onStartMic={handleStartMic}
                onActiveChange={setIsIntonationActive}
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
        </div>
      </main>

      {/* Mobile Bottom Tab Bar (64px height, Natural Thumb Zone, <= 15% total sticky height) */}
      <nav
        aria-label={t.app.mobileNavAria}
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-nav/95 backdrop-blur-md border-t border-white/[0.08] pb-safe"
      >
        <div className="grid grid-cols-5 h-16 items-center">
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
            <span className="text-[11px] font-medium">{t.tabs.tuner}</span>
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
            <span className="text-[11px] font-medium">{t.tabs.tunings}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('intonation')}
            data-testid="mobile-nav-intonation"
            aria-current={mobileTab === 'intonation' ? 'page' : undefined}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
              mobileTab === 'intonation' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Ruler className="w-5 h-5" aria-hidden="true" />
            <span className="text-[11px] font-medium">{t.tabs.intonation}</span>
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
            <span className="text-[11px] font-medium">{t.tabs.metronome}</span>
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
            <span className="text-[11px] font-medium">{t.tabs.settings}</span>
          </button>
        </div>
      </nav>

      <OfflineIndicator />
    </div>
  );
}
