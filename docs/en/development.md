# Development

[← README](../../README.md) · [简体中文](../zh-CN/development.md)

## Requirements

| For | Needs |
|---|---|
| Web app | [Bun](https://bun.sh) and Node.js 20+ (the tests run on Node via `tsx`) |
| Desktop app | Rust stable and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS |
| Android app | Additionally JDK 17, Android SDK and NDK (`NDK_HOME` set), and Rust targets `aarch64-linux-android armv7-linux-androideabi` |

## Commands

```bash
bun install          # install dependencies
bun run dev          # dev server on http://localhost:3000 (also on the LAN)
bun run lint         # TypeScript type check (tsc --noEmit)
bun run test         # unit tests in src/utils/*.test.ts
bun run build        # production build into dist/, including the service worker
bun run preview      # serve dist/ locally
```

Phones only allow the microphone on `https://` pages. To test the dev server on a phone, put it behind an HTTPS tunnel, for example `tailscale serve --https=8443 3000`, and add the tunnel host name to `server.allowedHosts` in `vite.config.ts`.

## Native apps (Tauri)

The Tauri project lives in `src-tauri/`. It wraps the same web build (`dist/`).

```bash
bun run tauri dev                                    # desktop app with hot reload
bun run tauri build                                  # desktop installers for this OS
bun run tauri build --target universal-apple-darwin  # macOS universal build
bun run tauri android build --apk --target aarch64 armv7
```

- The macOS microphone prompt text is set in `src-tauri/Info.plist` (`NSMicrophoneUsageDescription`).
- Android release builds are signed only when `src-tauri/gen/android/keystore.properties` exists. CI writes it from secrets; without it, release APKs stay unsigned. See [Release & deploy](release.md).

## Project layout

```text
src/
├── App.tsx                    # layout, tabs, persisted state
├── components/
│   ├── TunerDial.tsx          # gauge, readouts, waveform; hosts the headstock
│   ├── HeadstockPegboard.tsx  # 3+3 headstock pegs, manual-mode tools
│   ├── SimulatorBar.tsx       # built-in test signal controls
│   ├── TuningPresetsPanel.tsx # presets, chromatic mode, per-string pitch
│   ├── CalibrationPanel.tsx   # A4, capo, tolerance, note names
│   ├── MetronomePanel.tsx     # BPM, tap tempo, time signatures
│   ├── PWAInstallButton.tsx
│   └── OfflineIndicator.tsx
├── hooks/
│   ├── useTunerAudio.ts       # mic / simulator input, filtering, detection loop
│   ├── usePWAInstall.ts
│   └── useOnlineStatus.ts
└── utils/
    ├── pitchDetection.ts      # YIN detector, period refinement, test waveforms
    ├── signalGate.ts          # pluck-onset gate against hum, clipping monitor
    ├── musicTheory.ts         # notes, MIDI, cents, tunings, string matching
    ├── toneGenerator.ts       # reference tone synthesis
    ├── metronome.ts           # metronome logic (BPM, tap tempo, time signatures)
    ├── metronomeEngine.ts     # Web Audio lookahead scheduler
    └── *.test.ts              # unit tests
public/                        # PWA icons, Cloudflare Pages _headers
src-tauri/                     # Tauri config, Rust entry point, Android project
.github/workflows/             # ci.yml (test + deploy), release.yml (installers)
```

## Conventions

- The UI is dark-only. Use the surface tokens in `src/index.css` (`bg-surface`, `bg-raised`, `bg-control`…) instead of raw colors.
- The `desk:` variant (width ≥ 1024 px and height ≥ 780 px) switches to the desktop layout that fits the window. Shorter windows scroll normally.
- Keep pure logic in `src/utils/` with tests next to it. Audio code that needs a browser stays in hooks.
