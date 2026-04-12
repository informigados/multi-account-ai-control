# 🤝 Contributing Guide

Thank you for contributing to **Multi Account AI Control**.

## 🧭 Project Principles

- 🔒 Security first (no secret leakage)
- ✅ Quality enforced by tests and lint
- 🧩 Small, cohesive, review-friendly changes
- 📝 Documentation updated alongside code

## 🛠️ Quick Setup

1. Install dependencies:
   - `npm install`
2. Configure environment:
   - `cp .env.example .env`
   - `cp apps/web/.env.example apps/web/.env.local`
3. Prepare the database:
   - `npm run db:generate`
   - `npm run db:migrate`
   - `npm run db:seed`
4. Start the app:
   - `npm run dev`

## 🌱 Contribution Flow

1. Create a branch from `main`.
2. Implement your change with tests.
3. Run local validation.
4. Open a PR with a clear description and checklist.

## 🧪 Required PR Checklist

- [ ] `npm run lint` passes with no errors
- [ ] `npm run test:critical` passes
- [ ] `npm run build` passes
- [ ] Documentation updated (`README`, `docs/`, `ROADMAP` when applicable)
- [ ] No secrets, tokens, or sensitive data committed

## 🧱 Code Standards

- Strict TypeScript with clear typing
- Server-side validation with Zod
- CSRF protection on mutable endpoints
- Consistent success/error feedback in UI
- No API contract breaking changes without migration and documentation

## 📝 Commit Messages (recommended)

Suggested format:

- `feat: ...`
- `fix: ...`
- `refactor: ...`
- `test: ...`
- `docs: ...`
- `chore: ...`

Examples:

- `feat: add cursor pagination to providers API`
- `fix: harden backup restore validation`
- `docs: update API docs for imports history endpoint`

## 🔍 Pull Request Content

Include the following in each PR:

- Change objective
- Exact scope of what was modified
- Risks and expected impact
- Validation evidence (lint/test/build)
- Screenshots/GIFs for visual changes

## 🚫 PRs We Do Not Accept

- Critical-flow code without tests
- Security-related changes without impact review
- API-breaking changes without migration/documentation
- Versioned sensitive data
