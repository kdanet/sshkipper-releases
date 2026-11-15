<p align="center">
  <img src="assets/icon-192.png" width="96" height="96" alt="SSHKipper icon">
</p>

<h1 align="center">SSHKipper</h1>

<p align="center"><b>Many servers. One helm.</b><br>
A native SSH manager for macOS.</p>

<p align="center">
  <a href="https://sshkipper.com">Website</a> ·
  <a href="https://github.com/kdanet/sshkipper-releases/releases/latest/download/SSHKipper.dmg">Download</a> ·
  <a href="https://github.com/kdanet/sshkipper-releases/releases">Releases and what’s new</a> ·
  <a href="https://sshkipper.com/privacy/">Privacy</a>
</p>

SSHKipper opens a server behind any number of bastions (jump hosts) with one double-click and fills in the keys,
passwords and TOTP codes at every hop. Around it, in one window and one encrypted document: a Ghostty terminal with tmux,
an AI agent that asks before anything dangerous, server services (Docker, Nginx, Cron, Supervisor, security), databases,
SFTP and cloud storage, tunnels, web consoles, remote desktops and automations.

**Requirements:** macOS 26 or later, Apple Silicon. Free for up to five servers, no account.

## What’s in this repository

| Path | What it is |
|---|---|
| `index.html`, `features/`, `privacy/`, `404.html` | The website, served by GitHub Pages at [sshkipper.com](https://sshkipper.com) (`CNAME`) |
| `assets/` | Stylesheets, scripts, fonts (served from the site — no third-party requests), icons and link previews |
| `appcast.xml` | The Sparkle update feed the app reads |
| `en/`, `buy/` | Redirects from old addresses |
| [Releases](https://github.com/kdanet/sshkipper-releases/releases) | `SSHKipper.dmg` for each version, signed with Developer ID and notarized by Apple |

The pages are **generated** by `scripts/site/gen.py` in the app’s repository — don’t edit the HTML by hand; change the
generator and run it again. The app’s source code is closed.

To hear about new versions, watch this repository: **Watch → Custom → Releases**.

Questions: support@sshkipper.com

---

**По-русски.** Серверов много, а штурвал один: нативный SSH-менеджер для macOS. Сам проходит цепочки бастионов и
подставляет коды 2FA, а терминал, службы, базы, файлы, туннели и автоматизации держит в одном окне. В этом
репозитории — сайт (GitHub Pages), лента обновлений Sparkle (`appcast.xml`) и релизы с DMG. HTML генерируется скриптом
`scripts/site/gen.py` в репозитории приложения — руками не править. Исходный код приложения закрыт.
