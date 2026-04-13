# 🚀 Multi Account AI Control

![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)
[![Release](https://img.shields.io/badge/release-1.0.0-blue)](https://github.com/informigados/multi-account-ai-control/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

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
- 🖥️ Desktop baseline (Tauri) with preflight checks
- 🌐 Language support: **Portuguese (Brazil) `pt-BR`** and **English `en`** only

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

- `DEFAULT_ADMIN_EMAIL` (default: `admin@local`)
- `DEFAULT_ADMIN_PASSWORD` (default: `ChangeThisNow!123`, must include uppercase, lowercase, number, and special character)
- `SEED_ADMIN_LOCALE` (default: `pt_BR`; supported values: `pt_BR`, `en`)

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

### 2026-04-12 (1.0.0)

- Initial release.

## 👥 Authors

- INformigados: https://github.com/informigados/
- Alex Brito: https://github.com/alexbritodev

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
