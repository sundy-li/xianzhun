# 安装

[← README](../../README.zh-CN.md) · [English](../en/install.md)

安装包在 [Releases](https://github.com/sundy-li/xianzhun/releases) 页面下载。文件名以应用名和版本号开头，例如 `xianzhun_<版本>_android.apk`。v0.2 及更早的版本用的是旧名字 `JTune_`。

| 平台 | 文件 |
|---|---|
| 网页 / PWA | 不用下载：<https://xianzhun.pages.dev> |
| Android | `*_android.apk` |
| macOS（Apple 芯片和 Intel 通用） | `*_universal.dmg` |
| Windows | `*_x64-setup.exe`（安装程序）或 `*_x64_en-US.msi` |
| 自行部署网页 | `*_web.zip`，可以放到任意支持 HTTPS 的静态服务器 |

## 网页 / PWA

用较新的浏览器打开 <https://xianzhun.pages.dev>，允许使用麦克风。

安装成应用：

- **Android（Chrome、Edge）**：点页面里的安装按钮，或浏览器菜单 →「添加到主屏幕」。
- **iPhone / iPad（Safari）**：分享 →「添加到主屏幕」。
- **桌面（Chrome、Edge）**：点地址栏里的安装图标。

第一次打开后即可离线使用。

## Android

1. 在手机上下载 `.apk`。
2. 系统提示时，允许浏览器或文件管理器「安装未知应用」。
3. 打开应用，允许使用麦克风。

## macOS

1. 打开 `.dmg`，把应用拖进「应用程序」。
2. 应用没有经过 Apple 公证。如果提示「无法验证开发者」或「已损坏」，在终端执行下面的命令后再打开：

   ```bash
   xattr -cr /Applications/xianzhun.app   # v0.2 及更早版本是 JTune.app
   ```

3. 系统询问时允许使用麦克风。

## Windows

运行 `-setup.exe` 或 `.msi`。安装包没有代码签名，SmartScreen 拦截时点「更多信息」→「仍要运行」。

## 自行部署网页

解压 `*_web.zip`，把里面的文件放到任意静态服务器上。麦克风只能在 `https://` 或 `localhost` 下使用。

## 麦克风问题排查

| 现象 | 处理 |
|---|---|
| 一直没有弹出麦克风授权 | 页面必须通过 `https://` 或 `localhost` 打开 |
| 授权被拒绝 | 在浏览器的网站设置，或系统隐私设置（macOS / Windows / Android）里重新打开麦克风权限 |
| 显示「轻触屏幕任意位置开始监听」 | 浏览器在用户操作前不允许播放和采集音频，点一下页面即可 |
| 显示「声音过大」 | 让设备离吉他远一点，或弹轻一点 |
| 没有麦克风或手边没有吉他 | 用调音页底部的「试音模拟」，或弦钮的参考音 |
