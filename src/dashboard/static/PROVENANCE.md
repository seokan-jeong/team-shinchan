# Vendored Static Asset Provenance (R-12 mitigation)

Per PLAN.md Phase 4 R-12: vendored HTMX assets must record their origin URL and
SHA-256 so we can re-verify integrity and refresh deterministically.

| File | Origin | Version | SHA-256 | Size |
|------|--------|---------|---------|------|
| `htmx.min.js`      | `https://unpkg.com/htmx.org@1.9.12` (default file)              | 1.9.12 | `449317ade7881e949510db614991e195c3a099c4c791c24dacec55f9f4a2a452` | 48 101 B |
| `htmx-ext-sse.js`  | `https://unpkg.com/htmx.org@1.9.12/dist/ext/sse.js`             | 1.9.12 | `be05b2e2265279f035271adbea0b72a356f20ce4dfa5870481bfe9c51b822fc1` | 10 081 B |

## Refresh procedure

```bash
# 1. Re-download (pin version).
curl -sfL "https://unpkg.com/htmx.org@1.9.12" -o src/dashboard/static/htmx.min.js
curl -sfL "https://unpkg.com/htmx.org@1.9.12/dist/ext/sse.js" -o src/dashboard/static/htmx-ext-sse.js

# 2. Re-compute hashes; copy them into the table above.
shasum -a 256 src/dashboard/static/htmx.min.js src/dashboard/static/htmx-ext-sse.js

# 3. Run dashboard tests.
npm run test:dashboard
```

## Why vendored (NFR-4 / NFR-6)

- **NFR-4 (security)**: no external CDN means no third-party origin in CSP, no
  network round-trip to anthropic.com / unpkg.com / cdnjs.com, no leak of which
  doc you are viewing to a CDN's access log.
- **NFR-6 (no build stack)**: a single minified file commits cleanly; there is
  no npm install / bundler / transpiler step.
- **R-12 (version drift)**: this file is the single record of which version we
  shipped — without it, future maintainers have no way to refresh deterministically.
