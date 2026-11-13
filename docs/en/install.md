# Installation

[← README](../../README.md) · [简体中文](../zh-CN/install.md)

Download installers from the [Releases](https://github.com/sundy-li/xianzhun/releases) page. File names start with the app name and version, for example `Xianzhun_<version>_android.apk`. Releases up to v0.2 use the old name `JTune_`.

| Platform | File |
|---|---|
| Web / PWA | No download: <https://xianzhun.pages.dev> |
| Android | `*_android.apk` |
| macOS (Apple silicon and Intel) | `*_universal.dmg` |
| Windows | `*_x64-setup.exe` (installer) or `*_x64_en-US.msi` |
| Self-hosted web | `*_web.zip`, a static site for any HTTPS web server |

## Web / PWA

Open <https://xianzhun.pages.dev> in a current browser and allow microphone access.

To install it as an app:

- **Android (Chrome, Edge)**: tap the install button in the app, or use the browser menu → *Add to Home screen*.
- **iPhone / iPad (Safari)**: Share → *Add to Home Screen*.
- **Desktop (Chrome, Edge)**: click the install icon in the address bar.

After the first visit the app works offline.

## Android

1. Download the `.apk` on the phone.
2. Allow *Install unknown apps* for the browser or file manager when Android asks.
3. Open the app and allow microphone access.

## macOS

1. Open the `.dmg` and drag the app into *Applications*.
2. The app is not notarized by Apple. If macOS says the developer cannot be verified or the app is damaged, run this in Terminal and open it again:

   ```bash
   xattr -cr /Applications/Xianzhun.app   # JTune.app for v0.2 and earlier
   ```

3. Allow microphone access when asked.

## Windows

Run the `-setup.exe` or the `.msi`. The installers are not code-signed, so SmartScreen may block them: click *More info* → *Run anyway*.

## Self-hosting the web build

Unzip `*_web.zip` and serve the files from any static host. The microphone only works over `https://` or on `localhost`.

## Microphone troubleshooting

| Problem | What to try |
|---|---|
| "Allow microphone" never appears | The page must be served over `https://` or from `localhost` |
| Permission denied | Re-enable the microphone in the site settings (browser) or system privacy settings (macOS / Windows / Android) |
| Banner 轻触屏幕任意位置开始监听 (tap anywhere to start) | The browser blocked audio until a user gesture. Tap the page once |
| 声音过大 (too loud) | Move the device away from the guitar or play softer |
| No device or no guitar | Use 试音模拟 (simulator) at the bottom of the tuner, or the reference tones |
