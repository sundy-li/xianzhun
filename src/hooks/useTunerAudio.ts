import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GuitarStringTarget,
  TuningMatch,
  applyCapoToMidi,
  matchChromaticNote,
  matchGuitarString,
  midiToFrequency,
} from '../utils/musicTheory';
import {
  detectPitchYin,
  filterStableFrequency,
  generateGuitarWaveform,
} from '../utils/pitchDetection';

export type InputSource = 'idle' | 'mic' | 'simulator';

export interface TunerAudioState {
  source: InputSource;
  match: TuningMatch | null;
  clarity: number;
  rms: number;
  isSignalActive: boolean;
  isLockedInTune: boolean;
  error: string | null;
  tunedStrings: number[];
}

export interface UseTunerAudioOptions {
  strings: GuitarStringTarget[];
  a4Freq: number;
  capo: number;
  toleranceCents: number;
  isChromatic: boolean;
  manualStringNumber: number | null; // null = Auto, 1..6 = Manual locked string
  preferFlats: boolean;
  simStringNumber: number;
  simDetuneCents: number;
}

export function useTunerAudio(options: UseTunerAudioOptions) {
  const {
    strings,
    a4Freq,
    capo,
    toleranceCents,
    isChromatic,
    manualStringNumber,
    preferFlats,
    simStringNumber,
    simDetuneCents,
  } = options;

  const [state, setState] = useState<TunerAudioState>({
    source: 'idle',
    match: null,
    clarity: 0,
    rms: 0,
    isSignalActive: false,
    isLockedInTune: false,
    error: null,
    tunedStrings: [],
  });

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const waveformRef = useRef<Float32Array>(new Float32Array(256));

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const sourceRef = useRef<InputSource>('idle');

  const freqHistoryRef = useRef<number[]>([]);
  const smoothedFreqRef = useRef<number | null>(null);
  const pendingJumpRef = useRef<{ freq: number; count: number } | null>(null);
  const prevRmsRef = useRef<number>(0);
  const lastSignalTimeRef = useRef<number>(0);
  const inTuneSinceRef = useRef<number | null>(null);
  const simTimeRef = useRef<number>(0);
  const tunedSetRef = useRef<Set<number>>(new Set());

  const stopAll = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    sourceRef.current = 'idle';
    freqHistoryRef.current = [];
    smoothedFreqRef.current = null;
    pendingJumpRef.current = null;
    prevRmsRef.current = 0;
    inTuneSinceRef.current = null;
    waveformRef.current.fill(0);

    setState((prev) => ({
      ...prev,
      source: 'idle',
      match: null,
      clarity: 0,
      rms: 0,
      isSignalActive: false,
      isLockedInTune: false,
    }));
  }, []);

  const resetTunedProgress = useCallback(() => {
    tunedSetRef.current = new Set();
    setState((prev) => ({ ...prev, tunedStrings: [] }));
  }, []);

  const processBuffer = useCallback((buffer: Float32Array, sampleRate: number, nowMs: number) => {
    const opts = optionsRef.current;

    // Copy downsampled waveform for visual oscillogram
    const targetLen = waveformRef.current.length;
    const step = Math.max(1, Math.floor(buffer.length / targetLen));
    for (let i = 0; i < targetLen; i++) {
      waveformRef.current[i] = buffer[Math.min(buffer.length - 1, i * step)];
    }

    const result = detectPitchYin(buffer, sampleRate, {
      minFrequency: 60,
      maxFrequency: 1100,
      threshold: 0.11,
      minRms: 0.009,
    });

    // Reject pick-attack transient spikes (sudden >2.4x energy jump in mic mode)
    const isAttackTransient =
      sourceRef.current === 'mic' &&
      result !== null &&
      prevRmsRef.current > 0.01 &&
      result.rms > prevRmsRef.current * 2.4 &&
      result.clarity < 0.9;

    if (result) {
      prevRmsRef.current = prevRmsRef.current * 0.5 + result.rms * 0.5;
    } else {
      prevRmsRef.current *= 0.8;
    }

    const minClarity = sourceRef.current === 'mic' ? 0.82 : 0.72;

    if (result && result.clarity >= minClarity && !isAttackTransient) {
      const candidateMatch = opts.isChromatic
        ? matchChromaticNote(result.frequency, opts.a4Freq, opts.preferFlats)
        : matchGuitarString(
            result.frequency,
            opts.strings,
            opts.a4Freq,
            opts.capo,
            opts.manualStringNumber,
            opts.preferFlats
          );

      // Cent-range gating in Auto Guitar Mode: reject non-guitar sounds (>280 cents from every string)
      const isOutOfGuitarRange =
        !opts.isChromatic &&
        opts.manualStringNumber === null &&
        Math.abs(candidateMatch.cents) > 280;

      if (!isOutOfGuitarRange) {
        lastSignalTimeRef.current = nowMs;

        const currentSmooth = smoothedFreqRef.current;
        if (currentSmooth !== null) {
          const relDiff = Math.abs(result.frequency - currentSmooth) / currentSmooth;

          if (relDiff < 0.06) {
            pendingJumpRef.current = null;
            freqHistoryRef.current.push(result.frequency);
            if (freqHistoryRef.current.length > 5) {
              freqHistoryRef.current.shift();
            }
            const stable = filterStableFrequency(freqHistoryRef.current);
            smoothedFreqRef.current = currentSmooth * 0.45 + stable * 0.55;
          } else {
            const pending = pendingJumpRef.current;
            if (
              pending &&
              Math.abs(result.frequency - pending.freq) / pending.freq < 0.04
            ) {
              pending.count += 1;
              if (pending.count >= 2) {
                freqHistoryRef.current = [pending.freq, result.frequency];
                smoothedFreqRef.current = (pending.freq + result.frequency) / 2;
                pendingJumpRef.current = null;
                inTuneSinceRef.current = null;
              }
            } else {
              pendingJumpRef.current = { freq: result.frequency, count: 1 };
            }
          }
        } else {
          freqHistoryRef.current = [result.frequency];
          smoothedFreqRef.current = result.frequency;
        }

        const freq = smoothedFreqRef.current ?? result.frequency;
        const match = opts.isChromatic
          ? matchChromaticNote(freq, opts.a4Freq, opts.preferFlats)
          : matchGuitarString(
              freq,
              opts.strings,
              opts.a4Freq,
              opts.capo,
              opts.manualStringNumber,
              opts.preferFlats
            );

        const isWithinTolerance = Math.abs(match.cents) <= opts.toleranceCents;
        if (isWithinTolerance) {
          if (inTuneSinceRef.current === null) {
            inTuneSinceRef.current = nowMs;
          }
        } else {
          inTuneSinceRef.current = null;
        }

        const isLocked =
          isWithinTolerance &&
          inTuneSinceRef.current !== null &&
          nowMs - inTuneSinceRef.current >= 320;

        if (isLocked && match.stringNumber !== null && !tunedSetRef.current.has(match.stringNumber)) {
          tunedSetRef.current.add(match.stringNumber);
        }

        setState({
          source: sourceRef.current,
          match,
          clarity: result.clarity,
          rms: result.rms,
          isSignalActive: true,
          isLockedInTune: isLocked,
          error: null,
          tunedStrings: Array.from(tunedSetRef.current),
        });
        return;
      }
    }

    // Hold last reading briefly (500ms) so needle doesn't flicker between plucks
    const sinceLast = nowMs - lastSignalTimeRef.current;
    if (sinceLast > 500) {
      freqHistoryRef.current = [];
      smoothedFreqRef.current = null;
      pendingJumpRef.current = null;
      inTuneSinceRef.current = null;
      setState((prev) => {
        if (!prev.isSignalActive && prev.rms === 0) return prev;
        return {
          ...prev,
          isSignalActive: false,
          isLockedInTune: false,
          rms: 0,
          clarity: 0,
        };
      });
    }
  }, []);

  const startMicrophone = useCallback(async () => {
    stopAll();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setState((prev) => ({
        ...prev,
        error: '当前浏览器环境不支持麦克风音频采集，请使用“试音模拟”或更换 Chrome / Android WebView。',
      }));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      });
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const source = ctx.createMediaStreamSource(stream);

      // GuitarTuna-style bandpass filtering: strip sub-65Hz wind/hum & >1150Hz pick scratch
      const highPass = ctx.createBiquadFilter();
      highPass.type = 'highpass';
      highPass.frequency.value = 65;
      highPass.Q.value = 0.707;

      const lowPass = ctx.createBiquadFilter();
      lowPass.type = 'lowpass';
      lowPass.frequency.value = 1150;
      lowPass.Q.value = 0.707;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 8192; // 85ms half-buffer at 48kHz for rock-solid low E2/D2 detection
      analyser.smoothingTimeConstant = 0;

      source.connect(highPass);
      highPass.connect(lowPass);
      lowPass.connect(analyser);

      audioCtxRef.current = ctx;
      streamRef.current = stream;
      analyserRef.current = analyser;
      sourceRef.current = 'mic';

      const buffer = new Float32Array(analyser.fftSize);
      let lastTick = 0;

      setState((prev) => ({ ...prev, source: 'mic', error: null }));

      const loop = (time: number) => {
        if (sourceRef.current !== 'mic' || !analyserRef.current || !audioCtxRef.current) return;
        // ~35Hz cadence fills 5-sample median filter rapidly while keeping mobile CPU low
        if (time - lastTick >= 28) {
          lastTick = time;
          analyserRef.current.getFloatTimeDomainData(buffer);
          processBuffer(buffer, audioCtxRef.current.sampleRate, time);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      const message =
        err instanceof Error && err.name === 'NotAllowedError'
          ? '麦克风权限被拒绝。请在浏览器或系统设置中允许麦克风访问，或点击“试音模拟”体验自动识别。'
          : '未检测到可用麦克风设备。您可以使用下方的“试音模拟”或手动“听音定弦”功能。';
      setState((prev) => ({ ...prev, source: 'idle', error: message }));
    }
  }, [processBuffer, stopAll]);

  const startSimulator = useCallback(() => {
    stopAll();
    sourceRef.current = 'simulator';
    setState((prev) => ({ ...prev, source: 'simulator', error: null }));

    const sampleRate = 48000;
    let lastTick = 0;

    const loop = (time: number) => {
      if (sourceRef.current !== 'simulator') return;
      if (time - lastTick >= 40) {
        lastTick = time;
        const opts = optionsRef.current;
        const targetStr =
          opts.strings.find((s) => s.stringNumber === opts.simStringNumber) ?? opts.strings[0];
        const effectiveMidi = applyCapoToMidi(targetStr.midi, opts.capo);
        const baseFreq = midiToFrequency(effectiveMidi, opts.a4Freq);
        const detunedFreq = baseFreq * Math.pow(2, opts.simDetuneCents / 1200);

        simTimeRef.current += 0.04;
        const buffer = generateGuitarWaveform(
          detunedFreq,
          sampleRate,
          8192,
          0.36,
          simTimeRef.current,
          true
        );
        processBuffer(buffer, sampleRate, time);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [processBuffer, stopAll]);

  // Re-evaluate matched display immediately when manual string / preset / calibration changes during active signal
  useEffect(() => {
    if (state.source !== 'idle' && smoothedFreqRef.current !== null) {
      const freq = smoothedFreqRef.current;
      const match = isChromatic
        ? matchChromaticNote(freq, a4Freq, preferFlats)
        : matchGuitarString(freq, strings, a4Freq, capo, manualStringNumber, preferFlats);
      setState((prev) => ({ ...prev, match }));
    }
  }, [strings, a4Freq, capo, isChromatic, manualStringNumber, preferFlats, state.source, simStringNumber, simDetuneCents]);

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  return {
    state,
    waveformRef,
    startMicrophone,
    startSimulator,
    stopAll,
    resetTunedProgress,
  };
}
