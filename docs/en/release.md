# Release & deploy

[← README](../../README.md) · [简体中文](../zh-CN/release.md)

## Web: Cloudflare Pages

Every push to `main` runs `.github/workflows/ci.yml`: lint, tests and build, then deploys `dist/` to the Cloudflare Pages project `xianzhun` (<https://xianzhun.pages.dev>). Pull requests run the checks without deploying.

Manual deploy:

```bash
bun run build
npx wrangler pages deploy dist --project-name xianzhun --branch main
```

`public/_headers` sets the microphone permission policy and makes sure a new service worker is picked up after each deploy.

## Native apps: GitHub release

`.github/workflows/release.yml` runs when a tag starting with `v` is pushed. It:

1. Creates a draft release named after the app and tag, using `.github/release-notes.md` as the body.
2. Builds the macOS universal `.dmg`, the Windows `.exe` and `.msi`, the signed Android `.apk`, and the web `.zip`.
3. Publishes the release and marks it latest once every build succeeds.

### Steps

1. Bump the version in `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` and the `xianzhun` entry in `src-tauri/Cargo.lock`. Asset names come from `tauri.conf.json`.
2. Update `.github/release-notes.md` (file names and the changes).
3. Commit, push, then tag:

   ```bash
   git tag -a v0.4 -m "xianzhun v0.4"
   git push origin v0.4
   ```

A full run takes about 15 minutes. To rebuild an existing tag, run the *Release* workflow manually from the Actions tab and enter the tag. It reuses the existing release and replaces its files.

The release notes file is only read when the release is first created. To change the notes of a published release, edit them on GitHub or with `gh release edit`.

## Secrets

Set these in the repository settings under *Secrets and variables → Actions*.

| Secret | Used by | Purpose |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | ci.yml | Token with *Cloudflare Pages: Edit* permission |
| `CLOUDFLARE_ACCOUNT_ID` | ci.yml | Cloudflare account that owns the Pages project |
| `ANDROID_KEY_BASE64` | release.yml | Release keystore (`.jks`), base64-encoded |
| `ANDROID_KEY_PASSWORD` | release.yml | Keystore and key password |
| `ANDROID_KEY_ALIAS` | release.yml | Key alias inside the keystore |

Keep a backup of the Android keystore. Android only installs updates signed with the same key, so losing it means users must uninstall before installing a new version.
