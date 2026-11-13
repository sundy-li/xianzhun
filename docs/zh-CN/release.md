# 发布与部署

[← README](../../README.zh-CN.md) · [English](../en/release.md)

## 网页：Cloudflare Pages

每次推送到 `main` 都会运行 `.github/workflows/ci.yml`：类型检查、测试、构建，然后把 `dist/` 部署到 Cloudflare Pages 项目 `xianzhun`（<https://xianzhun.pages.dev>）。Pull Request 只跑检查，不部署。

手动部署：

```bash
bun run build
npx wrangler pages deploy dist --project-name xianzhun --branch main
```

`public/_headers` 设置了麦克风权限策略，并保证每次部署后浏览器能拿到新的 Service Worker。

## 原生应用：GitHub Release

推送 `v` 开头的标签时会运行 `.github/workflows/release.yml`，它会：

1. 以应用名和标签命名，创建一个草稿 Release，正文取自 `.github/release-notes.md`。
2. 构建 macOS 通用 `.dmg`、Windows `.exe` 和 `.msi`、签名的 Android `.apk`，以及网页 `.zip`。
3. 所有构建都成功后，正式发布并标记为最新版本。

### 步骤

1. 修改版本号：`package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`，以及 `src-tauri/Cargo.lock` 里 `xianzhun` 那一项。安装包文件名取自 `tauri.conf.json`。
2. 更新 `.github/release-notes.md`（文件名和本版改动）。
3. 提交、推送，然后打标签：

   ```bash
   git tag -a v0.4 -m "xianzhun v0.4"
   git push origin v0.4
   ```

完整跑一次大约 15 分钟。要重新构建已有的标签，在 Actions 页面手动运行 *Release* workflow 并填入标签，它会复用已有的 Release 并覆盖其中的文件。

`release-notes.md` 只在第一次创建 Release 时读取。已发布的 Release 要改说明，在 GitHub 页面上改，或用 `gh release edit`。

## 密钥

在仓库设置 *Secrets and variables → Actions* 里配置：

| Secret | 使用者 | 用途 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | ci.yml | 带 *Cloudflare Pages: Edit* 权限的 API Token |
| `CLOUDFLARE_ACCOUNT_ID` | ci.yml | Pages 项目所在的 Cloudflare 账号 |
| `ANDROID_KEY_BASE64` | release.yml | 发布用 keystore（`.jks`）的 base64 编码 |
| `ANDROID_KEY_PASSWORD` | release.yml | keystore 和密钥的密码 |
| `ANDROID_KEY_ALIAS` | release.yml | keystore 里的密钥别名 |

请备份好 Android keystore。Android 只接受同一个密钥签名的更新，丢了它，用户就得先卸载旧版才能装新版。
