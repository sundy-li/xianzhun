弦准吉他调音器 xianzhun v0.4：中英文界面，Android 屏幕常亮。

**在线使用（无需安装）**：https://xianzhun.pages.dev ，支持添加到主屏幕，离线可用。

## 下载

| 平台 | 文件 |
|---|---|
| Android | `xianzhun_0.4.0_android.apk` |
| macOS（Apple 芯片和 Intel 通用） | `xianzhun_0.4.0_universal.dmg` |
| Windows | `xianzhun_0.4.0_x64-setup.exe` 或 `xianzhun_0.4.0_x64_en-US.msi` |
| 静态网页 | `xianzhun_0.4.0_web.zip`（可部署到任意静态服务器，需 HTTPS 才能用麦克风） |

## 安装提示

- **Android**：需要在系统设置里允许"安装未知来源应用"。首次打开会请求麦克风权限。
- **macOS**：应用没有经过 Apple 公证。首次打开如果提示"无法验证开发者"或"已损坏"，在终端执行 `xattr -cr /Applications/xianzhun.app` 后再打开。
- **Windows**：安装包没有代码签名，SmartScreen 提示时点"更多信息" → "仍要运行"。

## 本版更新

- **中英文界面**：第一次打开时跟随系统语言，顶栏「中 / EN」按钮或「校准设置」里可以切换，选择会被记住
- **Android 屏幕常亮**：应用打开期间屏幕不再自动熄灭
- 手机顶栏更紧凑，窄屏上当前定弦名称不再被截断
- 主屏幕上的应用名改为「弦准 Xianzhun」

## 功能

- 自动识别琴弦 / 点弦钮手动锁定目标琴弦
- 打开即自动监听麦克风
- YIN 音高检测 + 周期倍数精修，安静环境下误差通常小于 1 音分
- 屏蔽冰箱、变压器等持续嗡声，麦克风过载提示
- 音准检查：对比空弦和 12 品，提示鞍座该往哪边调
- 多种定弦预设、A4 校准、变调夹、节拍器
- 中文 / English 界面

---

**English**: Xianzhun v0.4 adds an English interface (follows the system language; switch with the 中 / EN button in the top bar) and keeps the screen on in the Android app. Web version: https://xianzhun.pages.dev
