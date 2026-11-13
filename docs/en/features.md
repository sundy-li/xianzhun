# Features

[← README](../../README.md) · [简体中文](../zh-CN/features.md)

The interface is in Chinese. Labels are quoted below with an English gloss.

## Tuner

The tuner page is one card: a needle gauge on top and a 3+3 headstock below it. The left pegs are strings 4, 5 and 6, and the right pegs are strings 3, 2 and 1.

### Auto and manual

The switch in the top-right corner (自动 / 手动, auto / manual) picks the mode. The default is **auto**.

- **Auto**: pluck any string. The app finds the nearest string of the current tuning and lights up its peg.
- **Manual**: tap a peg. The app switches to manual, locks that string as the target, and plays its reference tone. Flip the switch to go back to auto.

In manual mode, a row under the headstock offers:

- **Sustained reference tone**: plays the target note until you stop it.
- **− / +**: changes the target string by one semitone.

### Reading the gauge

| Element | Meaning |
|---|---|
| Needle | Offset from the target, −50 to +50 cents |
| Green band | The in-tune range, set by the tolerance |
| Guidance line | 音偏低 (flat, tighten), 音准已校准 (in tune) or 音偏高 (sharp, loosen), with an arrow icon |
| Measured / Cents / Target | Detected frequency, offset in cents, target frequency |
| Waveform strip | Live input signal |

A string that stays in tune is marked with a check on its peg. The progress counter in the top bar resets all marks.

### Listening controls

- The microphone starts when the app opens. Tap **● 监听中** (listening) in the gauge to pause it, and **开始监听** (start listening) to resume.
- The app releases the microphone when it goes to the background and picks it up again when you return.
- If the input clips, the guidance line shows 声音过大 (too loud).
- **没有吉他？试试内置试音模拟** (no guitar? try the simulator) at the bottom feeds a synthetic guitar signal into the same detector. You can pick the string and the detune amount.

## Tunings

The **定弦方案 / 定弦与设音** (tunings) panel, a tab on mobile and the right column on desktop, contains:

- **Presets**: Standard, Drop D, Half step down (Eb), Whole step down (D), Open G, Open D, DADGAD.
- **Chromatic mode**: matches any note of the 12-tone scale instead of the six strings.
- **Per-string pitch**: set each string to any note from E1 to E5. Save the result as a custom preset, or reset it to the selected preset.

Settings and custom presets are saved in the browser (`localStorage`).

## Calibration

| Setting | Range |
|---|---|
| A4 reference | 430–450 Hz in 1 Hz steps, quick picks 432 / 440 / 442 Hz |
| Capo | 0–7 frets. Target notes move up by the same number of semitones |
| Tolerance | ±2 ¢ (strict), ±4 ¢ (standard), ±8 ¢ (relaxed) |
| Note names | Sharps (`#`) or flats (`b`) |

## Metronome

- 30–240 BPM with a slider and −5 / −1 / +1 / +5 buttons, default 90.
- Tap tempo, plus the tempo term (Largo, Andante, Allegro…) for the current speed.
- Time signatures 4/4, 3/4, 2/4, 6/8, 5/4, 7/8, with a beat indicator and an optional accent on beat one.
- Clicks are scheduled ahead on `AudioContext.currentTime`, so the tempo does not drift when the UI is busy.

## How detection works

1. The microphone signal goes through a band-pass filter (65–1150 Hz). This removes wind noise, low hum and pick scratch.
2. A YIN pitch detector estimates the fundamental frequency. The period is then refined at its multiples, and candidates are checked to avoid octave errors on low strings.
3. A level gate (`src/utils/signalGate.ts`) only starts a new reading right after a pluck. Steady background sounds never produce a pluck onset, so they are ignored.
4. The frequency is matched to the nearest target string (or chromatic note), taking A4 and capo into account.

## Offline and install

The web app is a PWA with a service worker. After the first visit it works offline and can be installed to the home screen. See [Installation](install.md).
