弦准吉他调音器 JTune 首个版本。

**在线使用（无需安装）**：https://xuanzhun.pages.dev ，支持添加到主屏幕，离线可用。

## 下载

| 平台 | 文件 |
|---|---|
| Android | `JTune_0.1.0_android.apk` |
| macOS（Apple 芯片和 Intel 通用） | `JTune_0.1.0_universal.dmg` |
| Windows | `JTune_0.1.0_x64-setup.exe` 或 `JTune_0.1.0_x64_en-US.msi` |
| 静态网页 | `JTune_0.1.0_web.zip`（可部署到任意静态服务器，需 HTTPS 才能用麦克风） |

## 安装提示

- **Android**：需要在系统设置里允许"安装未知来源应用"。首次打开会请求麦克风权限。
- **macOS**：应用没有经过 Apple 公证。首次打开如果提示"无法验证开发者"或"已损坏"，在终端执行 `xattr -cr /Applications/JTune.app` 后再打开。
- **Windows**：安装包没有代码签名，SmartScreen 提示时点"更多信息" → "仍要运行"。

## 功能

- 自动识别琴弦 / 手动锁定目标琴弦（下拉框选择）
- 打开即自动监听麦克风
- YIN 音高检测 + 周期倍数精修，安静环境下误差通常小于 1 音分
- 屏蔽冰箱、变压器等持续嗡声，麦克风过载提示
- 多种定弦预设、A4 校准、变调夹、节拍器
