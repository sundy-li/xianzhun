弦准吉他调音器 xianzhun v0.3：新增音准检查，调音时屏幕常亮。

**在线使用（无需安装）**：https://xianzhun.pages.dev ，支持添加到主屏幕，离线可用。

## 下载

| 平台 | 文件 |
|---|---|
| Android | `xianzhun_0.3.0_android.apk` |
| macOS（Apple 芯片和 Intel 通用） | `xianzhun_0.3.0_universal.dmg` |
| Windows | `xianzhun_0.3.0_x64-setup.exe` 或 `xianzhun_0.3.0_x64_en-US.msi` |
| 静态网页 | `xianzhun_0.3.0_web.zip`（可部署到任意静态服务器，需 HTTPS 才能用麦克风） |

从 v0.3 起，应用和安装包都改名为 xianzhun（v0.2 及更早叫 JTune）。Android 可以直接覆盖安装 v0.2；macOS 请先删掉「应用程序」里旧的 JTune.app。

## 安装提示

- **Android**：需要在系统设置里允许"安装未知来源应用"。首次打开会请求麦克风权限。
- **macOS**：应用没有经过 Apple 公证。首次打开如果提示"无法验证开发者"或"已损坏"，在终端执行 `xattr -cr /Applications/xianzhun.app` 后再打开。
- **Windows**：安装包没有代码签名，SmartScreen 提示时点"更多信息" → "仍要运行"。

## 本版更新

- **音准检查**（新标签页）：逐弦比较空弦和 12 品按弦的音高，显示偏差音分，提示琴桥鞍座该往前还是往后移，并估算移动距离（按 648 mm 弦长）
- **屏幕常亮**：监听、节拍器或参考音运行时屏幕不再自动熄灭
- 项目改名为 xianzhun，网页地址改为 https://xianzhun.pages.dev

## 功能

- 自动识别琴弦 / 点弦钮手动锁定目标琴弦
- 打开即自动监听麦克风
- YIN 音高检测 + 周期倍数精修，安静环境下误差通常小于 1 音分
- 屏蔽冰箱、变压器等持续嗡声，麦克风过载提示
- 音准检查（12 品八度对比）
- 多种定弦预设、A4 校准、变调夹、节拍器
