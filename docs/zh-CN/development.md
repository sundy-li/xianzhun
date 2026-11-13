# 开发

[← README](../../README.zh-CN.md) · [English](../en/development.md)

## 环境要求

| 用途 | 需要 |
|---|---|
| 网页版 | [Bun](https://bun.sh)，以及 Node.js 20+（测试通过 `tsx` 在 Node 上运行） |
| 桌面应用 | Rust stable，以及对应系统的 [Tauri 依赖](https://tauri.app/start/prerequisites/) |
| Android 应用 | 另外需要 JDK 17、Android SDK 和 NDK（设置 `NDK_HOME`），以及 Rust 目标 `aarch64-linux-android armv7-linux-androideabi` |

## 常用命令

```bash
bun install          # 安装依赖
bun run dev          # 开发服务器 http://localhost:3000（局域网也可访问）
bun run lint         # TypeScript 类型检查（tsc --noEmit）
bun run test         # 运行 src/utils/*.test.ts 单元测试
bun run build        # 生产构建到 dist/，包含 Service Worker
bun run preview      # 本地预览 dist/
```

手机只在 `https://` 页面上允许使用麦克风。要在手机上测试开发服务器，需要套一层 HTTPS 隧道，例如 `tailscale serve --https=8443 3000`，并把隧道域名加到 `vite.config.ts` 的 `server.allowedHosts`。

## 原生应用（Tauri）

Tauri 工程在 `src-tauri/`，打包的是同一份网页构建产物（`dist/`）。

```bash
bun run tauri dev                                    # 桌面应用，带热更新
bun run tauri build                                  # 打包当前系统的桌面安装包
bun run tauri build --target universal-apple-darwin  # macOS 通用包
bun run tauri android build --apk --target aarch64 armv7
```

- macOS 麦克风授权弹窗的文字在 `src-tauri/Info.plist`（`NSMicrophoneUsageDescription`）。
- 只有存在 `src-tauri/gen/android/keystore.properties` 时，Android release 包才会签名。CI 会用密钥生成这个文件；本地没有它时，release APK 不签名。见[发布与部署](release.md)。

## 目录结构

```text
src/
├── App.tsx                    # 页面布局、标签页、持久化状态
├── components/
│   ├── TunerDial.tsx          # 表盘、读数、波形，内嵌琴头
│   ├── HeadstockPegboard.tsx  # 3+3 琴头弦钮，手动模式工具
│   ├── SimulatorBar.tsx       # 内置试音模拟控制
│   ├── TuningPresetsPanel.tsx # 定弦预设、十二平均律、逐弦设音
│   ├── CalibrationPanel.tsx   # A4、变调夹、容差、记号
│   ├── MetronomePanel.tsx     # BPM、点击测速、拍号
│   ├── PWAInstallButton.tsx
│   └── OfflineIndicator.tsx
├── hooks/
│   ├── useTunerAudio.ts       # 麦克风 / 模拟输入、滤波、检测循环
│   ├── usePWAInstall.ts
│   └── useOnlineStatus.ts
└── utils/
    ├── pitchDetection.ts      # YIN 检测、周期精修、测试波形
    ├── signalGate.ts          # 拨弦起音门限（防嗡声）、过载检测
    ├── musicTheory.ts         # 音名、MIDI、音分、定弦库、琴弦匹配
    ├── toneGenerator.ts       # 参考音合成
    ├── metronome.ts           # 节拍器逻辑（BPM、点击测速、拍号）
    ├── metronomeEngine.ts     # Web Audio 前瞻调度
    └── *.test.ts              # 单元测试
public/                        # PWA 图标、Cloudflare Pages 的 _headers
src-tauri/                     # Tauri 配置、Rust 入口、Android 工程
.github/workflows/             # ci.yml（测试 + 部署）、release.yml（安装包）
```

## 约定

- 界面只有深色主题。颜色用 `src/index.css` 里的语义变量（`bg-surface`、`bg-raised`、`bg-control` 等），不要直接写色值。
- `desk:` 变体（宽 ≥ 1024 px 且高 ≥ 780 px）切换到占满窗口的桌面布局。窗口更矮时页面照常滚动。
- 纯逻辑放在 `src/utils/`，测试文件放在旁边。需要浏览器的音频代码放在 hooks 里。
