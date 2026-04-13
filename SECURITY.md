# 🔐 Security Policy

## 📌 Scope

This repository contains a local-first system that handles sensitive data (credentials, secrets, and audit traces). Security is a mandatory requirement.

## 🛡️ Supported Versions

| Version | Security support |
| --- | --- |
| `main` | ✅ Active |
| Legacy branches | ⚠️ Not guaranteed |

## 🚨 Reporting a Vulnerability

If you discover a vulnerability:

1. **Do not open a public issue** with exploitable details.
2. Use GitHub Security Advisory for this repository.
3. Provide reproduction steps, impact, and possible mitigations.

## ⏱️ Response Process

- Initial triage: as quickly as possible after report receipt
- Severity classification: based on impact and exploitability
- Fixing: prioritized by risk level
- Disclosure: coordinated after a patch is available

## ✅ Contributor Security Best Practices

- Never commit real secrets (`.env`, tokens, keys).
- Keep server-side validation with Zod.
- Preserve CSRF on mutable endpoints.
- Ensure sensitive data does not leak into logs/responses.
- Update security-related tests when touching critical flows.

## 🔒 Current Controls (summary)

- Password hashing with `bcrypt`
- `AES-256-GCM` encryption for secrets and backup artifacts
- HMAC-signed sessions
- CSRF protection on `POST/PUT/DELETE`
- Re-authentication required to reveal secrets
- Audit logging for critical operations
