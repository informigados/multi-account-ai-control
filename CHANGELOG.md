# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] — 2026-04-15

### Security
- **[CRITICAL]** Fixed Next.js 16 proxy convention: renamed security file to `proxy.ts` with proper `proxy` export — route protection at edge now actually executes
- Removed `isSystemAdmin` and `email` fields from the login API JSON response — reduces sensitive data exposure
- Changed session cookie `sameSite` from `"lax"` to `"strict"` for stronger CSRF protection
- Added `Strict-Transport-Security` (HSTS) response header (`max-age=31536000; includeSubDomains`)
- Wrapped `decryptSecret` in `try/catch` — prevents stack trace leakage from corrupted blobs
- Fixed `/reset-password/*` paths: now correctly treated as public (no redirect to login)
- Moved account `tag` filter from in-memory post-filter to the Prisma `WHERE` clause (fixes cursor-based pagination correctness)

### UX / Accessibility
- Fixed mobile menu close button: replaced literal `"X"` text with `<X />` icon from lucide-react + proper `aria-label`
- Header is now `sticky top-0 z-40` with stronger `backdrop-blur` — stays visible during scroll
- "Idle Protection" badge label is now fully i18n — uses `t.idleLock.badgeLabel` (pt_BR, pt_PT, en, es, zh_CN)
- Login page now detects the user's preferred language via `Accept-Language` header instead of always showing pt_BR
- Added `loading.tsx` for `/settings` and `/about` routes
- Fixed root `loading.tsx` skeleton layout to match actual dashboard layout (eliminates CLS)
- `error.tsx` now shows generic message in production, detailed message only in development; also displays `error.digest`

### Visual / Design
- Added CSS transitions for theme switching (`background-color 0.3s ease`)
- Added `card-hover` premium elevation effect (translateY + box-shadow) on account cards
- Added `progress-fill` smooth animation (0.6s cubic-bezier) on usage progress bars
- Added `badge-critical` pulsing animation for danger status badges
- Added `page-enter` fade-in animation for page content areas
- Improved progress bar from `h-full` to `rounded-full` for more polished look
- Elevated status badge text to `font-medium`
- Improved `not-found.tsx` to premium design: centered layout, giant gradient "404" number, link with primary color styling
- Added shimmer animation class (`.animate-shimmer`) for future skeleton upgrades
- Added `scroll-behavior: smooth` on `html`
- Enhanced `:focus-visible` ring with primary color at 0.7 opacity

### Architecture
- Added `badgeLabel` to `idleLock` type and all 5 locale dictionaries in `i18n.ts`
- Added `setInterval(60s)` to `DashboardCommandCenter` reset countdown — updates in real time
- Added `src/hooks/**` and `src/schemas/**` to Tailwind content paths
- Fixed `resetCountdown` to depend on the tick state for re-computation each minute

---

## [0.1.0] — Initial Release

- Local-first Next.js 16 + Prisma + SQLite application
- Multi-account AI provider management
- Session-based authentication with HMAC verification
- AES-256-GCM secret encryption at rest
- Rate limiting, CSRF protection, audit logging
- 5-language i18n (pt_BR, pt_PT, en, es, zh_CN)
- Idle lock screen with configurable timeout
- Dashboard with real-time usage metrics
- Accounts, Providers, Data, Audit, Settings modules
- Dark/light theme with CSS design tokens
- Desktop shell (Tauri) scaffolding
