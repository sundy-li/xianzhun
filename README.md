# 弦准吉他调音器 (Guitar Tuner & Metronome)

**在线使用**：<https://xuanzhun.pages.dev>（可添加到主屏幕，离线可用）
**安装包**：Android / macOS / Windows 见 [Releases](https://github.com/sundy-li/JTune/releases)

## 开发与发布

```bash
bun install
bun run dev        # 本地开发 http://localhost:3000
bun run test       # 单元测试
bun run build      # 构建静态站点到 dist/

# 发布：推送 v 开头的 tag，GitHub Actions 会构建 Android / macOS / Windows 安装包并创建 Release
git tag v0.2 && git push origin v0.2

# 部署网页到 Cloudflare Pages
bun run build && npx wrangler pages deploy dist --project-name xuanzhun --branch main
```

桌面端和 Android 由 [Tauri 2](https://tauri.app) 打包（`src-tauri/`）。Android 发布签名的 keystore 保存在 GitHub Secrets（`ANDROID_KEY_BASE64`、`ANDROID_KEY_PASSWORD`、`ANDROID_KEY_ALIAS`）。

---

一款面向 **Android 移动设备（PWA 可安装应用）** 与桌面端设计的专业吉他调音器与节拍练习应用。采用 Web Audio API 实时采集音频，内置 **YIN 基频检测算法**、**自动识别 / 手动设定音调调弦**、**原声参考音合成**以及**高精度前瞻调度节拍器**。

---

## 核心功能

### 1. 自动调弦（智能识别）
- **YIN 基频检测引擎**：针对吉他低频基音与丰富泛音优化，结合均方根（RMS）静音门限与抛物线插值，实现高灵敏度、防八度误判的实时音高追踪。
- **弧形音准仪表盘**：实时展示目标音名、弦序、实测频率（Hz）、音分偏差（¢）以及实时音频波形（Oscillogram）。
- **多维度引导**：通过指针角度、方向箭头、文字提示（偏低拧紧 / 音准已校准 / 偏高放松）与色彩同步反馈，稳定准音后自动标记该弦已完成校准。
- **内置吉他信号试音模拟**：无实体吉他或未开启麦克风权限时，可开启内置谐波模拟信号，直接驱动 YIN 引擎进行全流程测试。

### 2. 手动定弦（锁定目标音调）
- **交互式 3+3 琴头弦钮**：在手动模式下点击任意弦钮即可锁定目标琴弦，并自动触发**合成原声吉他拨弦参考音**（支持单次拨弦或持续循环播放，用于听音定弦）。
- **逐弦自由设音**：支持在琴头下方通过 `- / + 半音` 快捷微调，或在「定弦与设音」面板中为 1–6 弦独立指定任意音高（`E1`–`E5`），并支持保存/删除自定义定弦方案（自动持久化至 `localStorage`）。
- **常用定弦预设**：内置 `Standard`、`Drop D`、`全体降半音 (Eb)`、`全体降全音 (D)`、`开放 G`、`开放 D`、`DADGAD`，并支持开启 **十二平均律（半音阶全音域）** 模式。

### 3. 专业校准设置
- **A4 基准音校准**：支持 `430 Hz – 450 Hz` 连续步进调节，内置 `432 Hz`、`440 Hz`、`442 Hz` 快捷预设。
- **变调夹（Capo）品位偏移**：支持 `0 – +7 品` 偏移，自动换算夹上变调夹后的各弦目标频率。
- **判定容差与记号偏好**：支持 `±2 ¢（专业）`、`±4 ¢（标准）`、`±8 ¢（宽松）` 三档音准容差，以及升号（`#`）/ 降号（`b`）显示切换。

### 4. 节拍器练习模块
- **Web Audio Lookahead 调度器**：基于 `AudioContext.currentTime` 前瞻调度强拍、次强拍与弱拍音效，确保节奏稳定不漂移。
- **BPM 与测速**：支持 `30 – 240 BPM` 滑块与 `-5 / -1 / +1 / +5` 步进调节，内置 **点击测速（Tap Tempo）** 与速度表情术语提示。
- **多拍号支持**：支持 `4/4`、`3/4`、`2/4`、`6/8`、`5/4`、`7/8` 六种常用节拍类型，提供小节节拍可视化指示与第一拍强音开关。

### 5. Android PWA 独立应用体验
- 完整配置 `vite-plugin-pwa`、Web App Manifest、Service Worker 离线缓存与多尺寸图标（含 `192x192`、`512x512`、`maskable` 与 `apple-touch-icon`）。
- 支持在 Android Chrome / Edge 中一键安装到桌面，以 `standalone` 全屏模式离线运行。

---

## 技术栈

- **前端框架**：React 19 + TypeScript + Vite 8
- **样式方案**：Tailwind CSS v4 + Lucide Icons
- **音频与信号处理**：原生 Web Audio API（`AudioContext`、`AnalyserNode`、Lookahead 节拍调度、多谐波拨弦合成）+ 纯 TypeScript 实现的 YIN 音高检测模块
- **PWA 支持**：`vite-plugin-pwa` + Workbox
- **单元测试**：Node.js 内置 `node:test` + `tsx`

---

## 目录结构

```text
├── public/                     # PWA 图标资源 (SVG / PNG / Maskable / Apple Touch)
├── src/
│   ├── components/
│   │   ├── CalibrationPanel.tsx    # A4 校准、Capo 偏移、容差与 PWA 安装卡片
│   │   ├── HeadstockPegboard.tsx   # 交互式 3+3 吉他琴头与手动微调控件
│   │   ├── MetronomePanel.tsx      # 节拍器控制、拍号选择与 Tap Tempo 面板
│   │   ├── OfflineIndicator.tsx    # 离线状态提示条
│   │   ├── PWAInstallButton.tsx    # 应用内 PWA 安装引导组件
│   │   ├── SimulatorBar.tsx        # 内置吉他信号模拟调试条
│   │   ├── TunerDial.tsx           # 弧形音准表盘、实时波形与调音指引
│   │   └── TuningPresetsPanel.tsx  # 常用定弦预设与逐弦手动设音编辑器
│   ├── hooks/
│   │   ├── useOnlineStatus.ts      # 在线/离线状态监听
│   │   ├── usePWAInstall.ts        # beforeinstallprompt 与独立模式检测
│   │   └── useTunerAudio.ts        # 麦克风采集 / 模拟器信号与 YIN 追踪 Hook
│   ├── utils/
│   │   ├── metronome.ts            # 节拍器纯逻辑（拍号、强弱拍、BPM、Tap Tempo）
│   │   ├── metronome.test.ts       # 节拍器单元测试
│   │   ├── metronomeEngine.ts      # Web Audio Lookahead 节拍调度器
│   │   ├── musicTheory.ts          # 频率/MIDI/音分换算、吉他定弦库与匹配算法
│   │   ├── musicTheory.test.ts     # 乐理与匹配算法单元测试
│   │   ├── pitchDetection.ts       # YIN 基频估计算法与谐波测试信号生成
│   │   ├── pitchDetection.test.ts  # YIN 算法单元测试
│   │   └── toneGenerator.ts        # 原声吉他参考音合成播放器
│   ├── App.tsx                     # 主界面布局与持久化状态管理
│   ├── index.css                   # Tailwind CSS v4 全局样式与字体配置
│   └── main.tsx                    # 应用入口
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 本地开发与构建

### 环境要求
- Node.js `>= 20`
- npm

### 安装与启动

```bash
# 安装依赖
npm install

# 启动开发服务器（默认监听端口 3000）
npm run dev
```

### 类型检查、测试与生产构建

```bash
# 运行全部核心算法单元测试（乐理、YIN 音高检测、节拍器）
npx tsx --test src/utils/musicTheory.test.ts src/utils/pitchDetection.test.ts src/utils/metronome.test.ts

# TypeScript 静态类型检查
npm run lint

# 构建生产包（输出至 dist/，含 PWA Service Worker 与 Manifest）
npm run build
```

---

## 注意事项

- **麦克风权限**：浏览器仅在 `https://` 或 `localhost` 安全上下文中允许调用 `navigator.mediaDevices.getUserMedia` 获取麦克风音频；若当前设备无麦克风或未授权，可使用界面内置的「吉他信号试音模拟」或手动「播放参考音」功能。
- **Android 安装**：在 Android 手机使用 Chrome / Edge 访问部署后的 HTTPS 地址，点击页面内「安装到桌面」或浏览器菜单「添加到主屏幕」，即可离线使用调音器与节拍器。
