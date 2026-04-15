# 🚀 Multi Account AI Control

![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)
[![Release](https://img.shields.io/badge/release-1.2.0-blue)](https://github.com/informigados/multi-account-ai-control/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/informigados/multi-account-ai-control)

A **local-first** operations panel for managing multiple AI accounts with strong security, traceability, and day-to-day productivity.

## ✨ Current Capabilities

- 🔐 Local authentication with secure `httpOnly` session cookies and CSRF protection
- 🧩 Full CRUD for Providers and Accounts
- 📊 Operational dashboard with risk metrics and quick usage updates
- 📝 Account notes + global audit trail
- 📦 Import (`JSON/CSV`), export (`JSON/CSV`), and encrypted backup
- ♻️ Backup restore with `dryRun` and explicit confirmation phrase
- ⏱️ Cursor pagination for heavy endpoints (accounts/logs/notes/usage/providers/imports)
- 🛡️ Re-authentication required to reveal secrets
- 🏷️ Account tags (up to 10 per account) for filtering and differentiation
- ☑️ Multi-select batch operations: archive, delete, and export selected accounts
- 🔄 Auto-refresh quota polling (configurable interval, default 10 min)
- 🚨 In-app quota alerts when usage exceeds configurable threshold
- 📂 Account groups with CRUD and filter-by-group support
- 🖥️ Desktop baseline (Tauri) with local session import (desktop-only, see below)
- 🌐 Language support: **Portuguese (Brazil) `pt-BR`**, **Portuguese (Portugal) `pt-PT`**, **English `en`**, **Spanish `es`**, and **Chinese (Simplified) `zh-CN`**

---

## 🖥️ Desktop vs Web — Feature Matrix

The system runs in two modes:

| Mode | How to run |
|---|---|
| **Web (dev/server)** | `npm run dev` or any server via PowerShell |
| **Desktop (installable)** | Install the `.msi` / `.exe` from `releases/desktop/` |

Some features **only work in the installable desktop app** because they require native OS access (file system, notifications, etc.) that a web server cannot provide:

### ✅ Works in both Web and Desktop

| Feature | Notes |
|---|---|
| Full CRUD (Providers, Accounts, Usage, Notes) | ✅ |
| Dashboard metrics, charts and filters | ✅ |
| Batch operations (select, archive, delete, export) | ✅ |
| Auto-refresh quota polling (frontend timer) | ✅ |
| In-app quota alert banner | ✅ |
| Account groups / folders | ✅ |
| Import JSON/CSV (manual paste) | ✅ |
| Export JSON / encrypted backup | ✅ |
| Audit logs, notes, account detail workspace | ✅ |
| Multi-language UI | ✅ |
| Password reset by email (requires SMTP config) | ✅ |
| Idle-lock screen (configurable timeout) | ✅ |

### 🔒 Desktop executable only (`.msi` / `.exe`)

| Feature | Why it requires desktop | Status |
|---|---|---|
| **Import local session** (Gemini CLI, Zed, Cursor, Codex) | Reads credential files from local disk (e.g. `~/.gemini/oauth_creds.json`, `state.vscdb`) — impossible from a web server which cannot access the user's file system | ✅ Implemented (Rust connectors) |
| **Native OS quota alerts** (system notifications) | Uses Tauri `notification` plugin to push native OS notifications | 🔜 Planned (F.3) |
| **Scheduled backup manager** | Background daemon that runs a daily automated backup | 🔜 Planned (F.6) |
| **Real-time log tail** (app.log viewer) | Tail native log files on disk | 🔜 Planned (F.6+) |
| **2FA / TOTP Manager** | Generates OTP codes from Base32 secrets stored locally | 🔜 Planned (F.7) |
| **OAuth browser flow** (silent token capture) | Opens embedded browser + captures redirect locally | 🔜 Future (high complexity) |

> **Important:** When you click "Importar do app local" in web mode, the system shows an informative notice explaining the feature is exclusive to the desktop executable, and guides the user to download the installer.

---

## 🔒 Authentication and Default Admin

The system includes a **protected default admin** user:

- Username is fixed as `admin`
- Cannot be deleted
- Username cannot be changed
- Only email and password can be changed

You can still create and manage additional users from the **Settings** page (admin-only user management).

## 🧱 Tech Stack

- Next.js 16 + React 19 + TypeScript
- Prisma + SQLite
- Tailwind CSS
- Zod (payload validation)
- AES-256-GCM (encryption)
- HMAC-SHA256 (session signing)
- bcryptjs (password hashing)

## ⚙️ Local Setup

### 1) Prerequisites

- Node.js 20+
- npm 10+

### 2) Configure environment

From the project root:

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
```

Windows PowerShell alternative:

```powershell
Copy-Item .env.example .env
Copy-Item apps/web/.env.example apps/web/.env.local
```

Set the required values in `.env`:

- `APP_MASTER_KEY` (32-byte base64 or 64-char hex)
- `SESSION_SECRET` (at least 32 chars)

Optional (password reset by email):

- `APP_BASE_URL` (default: `http://localhost:3000`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

Optional default admin seed values:

- `DEFAULT_ADMIN_EMAIL` (required, e.g. `admin@example.com`)
- `DEFAULT_ADMIN_PASSWORD` (required for seed; must include uppercase, lowercase, number, and special character)
- `SEED_ADMIN_LOCALE` (default: `pt_BR`; supported values: `pt_BR`, `pt_PT`, `en`, `es`, `zh_CN`)
- `SEED_UPDATE_ADMIN_PASSWORD` (default: `false`; set `true` to force updating existing system admin password hash on seed runs)
- `BCRYPT_SALT_ROUNDS` (default: `12`; valid range: `4` to `31`)

### 3) Install dependencies

```bash
npm install
```

### 4) Prepare the database

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 5) (Optional) Reset protected admin credentials

```bash
npm run auth:bootstrap-admin -- --email admin@local --password "ChangeThisNow!123"
```

### 6) Start development server

```bash
npm run dev
```

Open: `http://localhost:3000`

If port `3000` is busy, Next.js automatically starts on the next available port (for example, `3001`).

### 7) Troubleshooting (Turbopack cache warning)

If you see this warning:

`Turbopack's filesystem cache has been deleted because we previously detected an internal error in Turbopack.`

It means Next.js already cleaned a corrupted cache. You can also clean it manually:

```bash
rm -rf apps/web/.next apps/web/tsconfig.tsbuildinfo
npm run dev
```

Windows PowerShell:

```powershell
Remove-Item -Recurse -Force apps/web/.next, apps/web/tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npm run dev
```

## ✅ Quality Checks

```bash
npm run lint
npm run test:critical
npm run build
```

## 🧪 Main Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — production start
- `npm run lint` — lint checks
- `npm run typecheck` — type checks
- `npm run test:critical` — critical test suite (unit + API integration)
- `npm run security:audit` — dependency vulnerability gate (`npm audit` + `cargo audit`; advisory warnings are reported and tracked)
- `npm run desktop:preflight` — desktop baseline checks

## 🗂️ Project Structure

```text
multi-account-ai-control/
├─ apps/web
├─ prisma
├─ desktop
├─ scripts
├─ CONTRIBUTING.md
├─ SECURITY.md
└─ package.json
```

## 🤝 Contribution and Security

- Contribution guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security policy: [SECURITY.md](SECURITY.md)

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full history.

### v1.2.0 — 2026-04-15 (Phase F — Premium Suite)

- **Batch operations:** floating batch action bar for multi-select archive, delete, and export
- **Auto-refresh:** background quota polling (configurable interval, persisted per session)
- **Quota alerts:** in-app alert banner when any account exceeds the configured usage threshold
- **Account groups:** create/rename/delete groups and filter the accounts list by group
- **Sort persistence:** account list sort order saved to `localStorage` across sessions
- **Local import (desktop):** Tauri `detect_local_accounts` command implemented in Rust for Gemini CLI, Codex, Zed, and Cursor; graceful web fallback with download prompt
- **UX fixes:** Edit button now scrolls-to and highlights the form panel; archived accounts show an inline banner with a one-click Unarchive button; the archived filter is now a visible toggle button; JSON import has smart provider matching by slug/name

### v1.1.0 — 2026-04-14 (Hardening & Premium UX)

- **Security:** Fixed edge-layer route protection (proxy.ts convention), removed sensitive fields from login response, added HSTS header, improved cookie security, hardened decryptSecret, fixed tag filter to prevent pagination corruption, fixed public paths for password reset
- **UX:** Mobile menu close button now accessible, sticky header, full i18n for idle lock screen, login auto-detects Accept-Language, proper loading skeletons for all routes
- **Visual:** Premium card hover elevations, animated usage progress bars, pulsing critical badges, page-entry animations, polished 404 page with gradient number, smooth theme transition

### v1.0.0 — 2026-04-12

- Initial release.

## 👥 Authors

- INformigados: [github.com/informigados](https://github.com/informigados/)
- Alex Brito: [github.com/alexbritodev](https://github.com/alexbritodev)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
