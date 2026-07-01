# SISU Platform — Full Refactor Prompt

> Copy and paste the entire block below to an AI coding assistant (Claude, GPT, etc.) to perform a complete, ground-up refactor of the SISU mentorship booking platform.

---

```
You are tasked with a COMPLETE refactor of the SISU Executive Mentorship Platform. The current codebase is in `C:\Users\mohan\Downloads\chatmodel`. Your mission: fix EVERY bug and security issue, re-architect the entire codebase into a clean client-server model, restructure the project for production readiness, and redesign the UI for effectiveness.

## CRITICAL RULES

1. NEVER commit secrets, tokens, or credentials to git. Add `token.json`, `client_secret_*.json`, `*.log`, `__pycache__/`, `.venv/`, `backend.log`, `.env` to `.gitignore`.
2. NEVER use inline `style={}` in React components. Use Tailwind utility classes or CSS modules.
3. NEVER write self-migrating database schemas. Use Alembic.
4. NEVER put dead/commented-out code in production files.
5. NEVER use magic strings, hardcoded emails, or hardcoded secrets.
6. EVERY file must have a single responsibility.
7. EVERY component under 300 lines.
8. EVERY API response must follow a uniform envelope.
9. TypeScript only for frontend. Python type hints everywhere in backend.
10. Every change must be independently verifiable.

---

## PHASE 1 — SECURITY: Fix All Vulnerabilities

### 1.1 Secrets & Credentials
- [ ] Remove `token.json` and `client_secret_*.json` from git tracking and `.gitignore` them
- [ ] Move ALL secrets to environment variables (`.env` with a `.env.example` template)
- [ ] Remove hardcoded `tharunriot@gmail.com` from everywhere — use a database-backed admin role system
- [ ] Remove hardcoded Google OAuth client ID `793728037081-...` — move to env var
- [ ] Remove hardcoded `GEMINI_API_KEY` check that reveals the key pattern
- [ ] Add `.env.example` with all required vars documented but no values
- [ ] Git-filter entire history to purge `token.json` and `client_secret_*.json`

### 1.2 Authentication
- [ ] Set JWT expiry to 15 minutes (was 72 hours). Implement refresh tokens with 7-day expiry.
- [ ] Add email verification flow: on register, send verification link. User is `unverified` until confirmed.
- [ ] Move password reset from URL token to a two-step flow: user clicks link → enters token manually on site.
- [ ] Add rate limiting on a SINGLE route prefix (remove dual `/api/auth/` + `/auth/` duplication).
- [ ] Implement progressive brute-force protection: 3 failures → CAPTCHA, 6 failures → 30s lockout, 10 failures → 15min IP ban.
- [ ] Replace math CAPTCHA with a proper CAPTCHA (Cloudflare Turnstile or Google reCAPTCHA v3).
- [ ] Add account lockout notifications via email.
- [ ] Validate password strength on password change too, not just registration.

### 1.3 Authorization
- [ ] Replace email-whitelist admin system with a proper Role-Based Access Control (RBAC): `super_admin`, `admin`, `client`, `viewer`.
- [ ] Remove `tharunriot@gmail.com` magic string from frontend auth context — use `role` field from `/me` endpoint.
- [ ] Remove admin creation with default password (`SisuAdmin@2026`). Force invite-based signup.
- [ ] Add audit logging for every admin action (promote, demote, approve, reject, delete).

### 1.4 API Security
- [ ] Remove dual route prefixes. Keep ONLY `/api/v1/*`. The `/auth/*` routes must be deleted entirely.
- [ ] Add proper CORS: `ALLOWED_ORIGINS` must default to `[]` (empty) and require explicit configuration.
- [ ] Add Content-Security-Policy header: restrict script-src, style-src, font-src, connect-src.
- [ ] Add HSTS header (Strict-Transport-Security: max-age=31536000; includeSubDomains).
- [ ] Add X-Content-Type-Options: nosniff, X-Frame-Options: DENY.
- [ ] Protect `/uploads` static mount with authentication middleware.
- [ ] Add file upload validation: accept only images (JPEG, PNG, WebP), max 5MB, virus scan.
- [ ] Add request size limits globally.

### 1.5 Data Protection
- [ ] Add HTTPS redirect middleware (detect `X-Forwarded-Proto` header).
- [ ] Implement GDPR compliance: user data export, account deletion, cookie consent banner.
- [ ] Add `SameSite=Strict` and `Secure` flags on all cookies if any are introduced.
- [ ] Sanitize all LLM outputs before rendering in chat to prevent XSS.

---

## PHASE 2 — ARCHITECTURE: True Client-Server Model

### 2.1 Project Structure — NEW Layout

```
chatmodel/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app factory, lifespan, middleware
│   │   ├── config.py                  # Pydantic Settings (all env vars typed)
│   │   ├── database.py                # Engine + session factory ONLY (no migrations)
│   │   ├── dependencies.py            # FastAPI dependency injection
│   │   ├── models/                    # SQLAlchemy models (ONE file per domain)
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── meeting.py
│   │   │   ├── notification.py
│   │   │   ├── note.py
│   │   │   └── security.py           # SecurityLog, PasswordResetToken, CaptchaChallenge
│   │   ├── schemas/                   # Pydantic request/response schemas
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── meeting.py
│   │   │   ├── user.py
│   │   │   ├── note.py
│   │   │   └── common.py             # Uniform API response envelope
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── router.py          # Aggregates all sub-routers
│   │   │       ├── auth.py            # /api/v1/auth/*
│   │   │       ├── meetings.py        # /api/v1/meetings/*
│   │   │       ├── admin.py           # /api/v1/admin/*
│   │   │       ├── chat.py            # /api/v1/chat/*
│   │   │       ├── notes.py           # /api/v1/notes/*
│   │   │       └── availability.py    # /api/v1/availability/*
│   │   ├── services/                  # Business logic layer (no FastAPI/HTTP here)
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── meeting_service.py
│   │   │   ├── email_service.py       # Single provider with adapter pattern
│   │   │   ├── captcha_service.py     # Cloudflare Turnstile integration
│   │   │   ├── calendar_service.py
│   │   │   ├── notification_service.py
│   │   │   ├── security_service.py
│   │   │   └── ai_service.py          # Gemini/LangGraph extracted from llm.py
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── security.py            # JWT encode/decode, password hashing
│   │   │   ├── middleware.py          # CSP, HSTS, logging, rate-limit
│   │   │   ├── exceptions.py          # Custom exception classes
│   │   │   └── logging.py             # Structured JSON logger
│   │   └── alembic/                   # Database migrations
│   │       ├── env.py
│   │       ├── versions/
│   │       └── alembic.ini
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_meetings.py
│   │   ├── test_services.py
│   │   └── test_api.py
│   ├── requirements.txt
│   ├── runtime.txt
│   └── Procfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                     # Routes only — no splash, no dead code
│   │   ├── config/
│   │   │   └── env.ts                 # Typed env vars
│   │   ├── api/
│   │   │   ├── client.ts              # Axios instance with interceptors
│   │   │   ├── auth.ts                # Auth API calls
│   │   │   ├── meetings.ts
│   │   │   ├── admin.ts
│   │   │   ├── notes.ts
│   │   │   └── chat.ts
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useMeetings.ts
│   │   │   ├── useNotifications.ts
│   │   │   └── useChat.ts
│   │   ├── features/                  # Feature-based modules (each <300 lines)
│   │   │   ├── auth/
│   │   │   │   ├── AuthProvider.tsx
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── SignupPage.tsx
│   │   │   │   ├── ForgotPasswordPage.tsx
│   │   │   │   └── ResetPasswordPage.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── ClientDashboard.tsx
│   │   │   │   ├── MeetingList.tsx
│   │   │   │   ├── MeetingCard.tsx
│   │   │   │   ├── StatusBadge.tsx
│   │   │   │   └── StatsCards.tsx
│   │   │   ├── booking/
│   │   │   │   ├── BookingCalendar.tsx
│   │   │   │   ├── TimeSlotPicker.tsx
│   │   │   │   ├── BookingForm.tsx
│   │   │   │   └── BookingModal.tsx
│   │   │   ├── chat/
│   │   │   │   ├── ChatPanel.tsx
│   │   │   │   ├── ChatMessage.tsx
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   └── ChatBookingForm.tsx
│   │   │   ├── notebook/
│   │   │   │   ├── NotebookPage.tsx
│   │   │   │   ├── NoteCard.tsx
│   │   │   │   └── NoteEditor.tsx
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.tsx
│   │   │   │   ├── UsersPage.tsx
│   │   │   │   ├── DecisionFeed.tsx
│   │   │   │   ├── CalendarSlotsPage.tsx
│   │   │   │   ├── SlotsBookedPage.tsx
│   │   │   │   └── ReschedulePage.tsx
│   │   │   └── settings/
│   │   │       ├── SettingsPage.tsx
│   │   │       └── ProfileForm.tsx
│   │   ├── components/ui/             # Shared UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── components/layout/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── MobileNav.tsx
│   │   ├── lib/
│   │   │   ├── auth.tsx               # Auth context (no hardcoded emails)
│   │   │   └── utils.ts
│   │   ├── types/                     # TypeScript interfaces
│   │   │   ├── auth.ts
│   │   │   ├── meeting.ts
│   │   │   ├── user.ts
│   │   │   └── api.ts                 # API response envelope type
│   │   └── styles/
│   │       ├── globals.css
│   │       └── design-tokens.ts
│   ├── public/
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── alembic/                           # Alembic at project root for CLI convenience
│   └── alembic.ini
├── docker-compose.yml                 # Local dev with MySQL + backend + frontend
├── .env.example
├── .gitignore
├── AUDIT_REPORT.md
└── README.md
```

### 2.2 API Contract — Uniform Envelope

EVERY API response MUST follow this structure:

```typescript
// Success
{
  "success": true,
  "data": { ... },          // The actual response payload
  "meta": {                 // Optional: pagination, etc.
    "page": 1,
    "per_page": 20,
    "total": 150
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": { ... }      // Optional: field-level errors
  }
}
```

### 2.3 Backend Architecture Rules

1. **`services/` layer is PURE business logic** — no `Request`, no `Response`, no HTTP imports. Receives data, returns data.
2. **`api/v1/` layer is ONLY HTTP glue** — validates request, calls service, formats response. Thin as possible.
3. **`models/` are SQLAlchemy ONLY** — no business methods, no validation logic.
4. **`schemas/` are Pydantic ONLY** — one file per domain, request and response schemas separated.
5. **Dependency injection** — services receive `Session` via constructor or function parameter, never import `SessionLocal`.
6. **All routes under `/api/v1/*`** — no legacy `/auth/*` or `/api/auth/*`.
7. **Alembic for migrations** — delete all self-migration code from `database.py`.

### 2.4 Frontend Architecture Rules

1. **No component >300 lines.** If it exceeds this, split it.
2. **No inline styles.** Use Tailwind utility classes exclusively.
3. **All API calls go through typed hooks**, not direct `api.someMethod()` calls in components.
4. **ErrorBoundary wraps every route** — no white screens on crash.
5. **Skeleton loading for every list/card view.**
6. **Empty states for every list** — "No meetings yet. Book your first session."
7. **No dead code** — delete the commented-out router from App.jsx.
8. **Auth context reads role from API response**, not from hardcoded email.
9. **Remove ALL redirect-based navigation** (`/book` → `/?view=book`). Each route renders its own page.
10. **Environment variables typed** via a `config/env.ts` file.

---

## PHASE 3 — UI REDESIGN: Effective Design System

### 3.1 Design Tokens (Implement the existing DESIGN.md correctly)

Create `frontend/src/styles/design-tokens.ts`:

```typescript
export const tokens = {
  colors: {
    primary: '#4F46E5',       // Indigo (not #007AFF)
    primaryHover: '#4338CA',
    primaryLight: '#EEF2FF',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    surface: '#FFFFFF',
    surfaceSecondary: '#F8FAFC',
    surfaceTertiary: '#F1F5F9',
    text: {
      primary: '#0F172A',     // Slate-900
      secondary: '#64748B',   // Slate-500
      disabled: '#94A3B8',    // Slate-400
      inverse: '#FFFFFF',
    },
    border: '#E2E8F0',        // Slate-200
    borderFocus: '#4F46E5',
  },
  fonts: {
    heading: 'Geist, sans-serif',
    body: 'Inter, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  spacing: {
    xs: '4px',   // 0.25rem
    sm: '8px',   // 0.5rem
    md: '16px',  // 1rem
    lg: '24px',  // 1.5rem
    xl: '32px',  // 2rem
    '2xl': '48px',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  shadows: {
    card: '0 1px 3px rgba(0,0,0,0.05)',
    dropdown: '0 4px 12px rgba(0,0,0,0.08)',
    modal: '0 20px 60px rgba(0,0,0,0.15)',
  },
  animation: {
    fast: '150ms ease-out',
    normal: '200ms ease-out',
    slow: '300ms ease-out',
  },
};
```

### 3.2 Implement Tailwind Config to Match

```javascript
// tailwind.config.ts
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#4F46E5', hover: '#4338CA', light: '#EEF2FF' },
        surface: { DEFAULT: '#FFFFFF', secondary: '#F8FAFC', tertiary: '#F1F5F9' },
      },
      fontFamily: {
        heading: ['Geist', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
};
```

### 3.3 UI Component Library — Build These Primitives

Every primitive in `components/ui/`:

- **Button** — variants: `primary`, `secondary`, `ghost`, `danger`. Sizes: `sm`, `md`, `lg`. Loading state.
- **Input** — with label, error state, helper text, disabled state. Types: text, email, password, tel.
- **Card** — base wrapper with consistent padding + border + shadow. Variants: `default`, `interactive` (hover), `selected`.
- **Modal** — accessible dialog with focus trap, escape to close, backdrop click to close.
- **Select** — styled dropdown with placeholder, error, disabled states.
- **Badge** — status indicators. Colors match STATUS_CONFIG colors (orange= pending, green=approved, etc.).
- **Skeleton** — shimmer loading placeholders. Variants: circle, text, card, list.
- **EmptyState** — icon + title + description + optional CTA button.
- **ErrorBoundary** — catches errors, shows "Something went wrong" with retry button.
- **Toast** — success/error/warning notifications (for use after API calls).

### 3.4 Page-Level UI Requirements

Every page must render correctly in 4 states:
1. **Loading** → Skeleton placeholders (not spinner)
2. **Empty** → EmptyState component with clear message + action
3. **Error** → Error message with retry button
4. **Success** → Normal data display

**Login page** (rewrite `Login.jsx`):
- Remove hardcoded `tharunriot@gmail.com` admin check
- Remove inline styles → use Tailwind
- Keep Google SSO + credential login side-by-side
- Add proper form validation with error messages per field
- Add loading state on submit button
- Redirect based on user.role from API response, not email

**Client Dashboard** (split from 2949 lines):
- `ClientDashboard.tsx` — layout container, fetches data, delegates to children
- `MeetingList.tsx` — scrollable list of `MeetingCard` components
- `MeetingCard.tsx` — single meeting with status badge, time, actions
- `StatsCards.tsx` — 3-4 stat cards (total, pending, approved, completed)
- Calendar/booking panel as separate route or side panel
- Chat panel as slide-over or embedded section

**Chat** (split from 1086 lines):
- `ChatPanel.tsx` — orchestrator: manages message list + input + booking form state
- `ChatMessage.tsx` — single message bubble (AI or user)
- `ChatInput.tsx` — text input with send button, character count
- `ChatBookingForm.tsx` — inline form for date/slot/agenda selection when AI triggers it
- Remove all mock data fallback — surface errors to user instead

**Admin Dashboard**:
- Remove hardcoded email checks everywhere
- Add pagination to user list and meeting lists
- Add confirmation dialogs for destructive actions (delete user, reject meeting)
- Add date range filters on meeting views

### 3.5 Accessibility Checklist

- [ ] All interactive elements have `aria-label` or visible label
- [ ] Chat area has `aria-live="polite"` for new messages
- [ ] Keyboard navigation works: Tab, Enter, Escape, Arrow keys
- [ ] Focus trap in modals
- [ ] Focus visible outline (not `outline: none` without replacement)
- [ ] Color contrast ratio ≥ 4.5:1 for all text
- [ ] All images have `alt` text
- [ ] Form errors are announced via `aria-describedby`
- [ ] `prefers-reduced-motion` disables Framer Motion animations
- [ ] Skip-to-content link at top of page

---

## PHASE 4 — DATABASE: Alembic Migration Setup

### 4.1 Initialize Alembic

```bash
pip install alembic
alembic init alembic
```

Configure `alembic.ini` and `alembic/env.py` to use the same database URL as the app (imported from `app.config`).

### 4.2 First Migration

Delete ALL self-migration code from `database.py`:
- Remove the `try/except` blocks that run `ALTER TABLE ADD COLUMN`
- Remove the admin seeding block at module level
- Remove the table inspection logic

Create initial migration:
```bash
alembic revision --autogenerate -m "initial_schema"
alembic upgrade head
```

### 4.3 Migration Rules

- Every schema change = new Alembic revision
- NEVER run `Base.metadata.create_all()` in production code
- Seed data goes in a separate `seed.py` script or Alembic data migration
- All migrations must be reversible (`downgrade()` defined)

---

## PHASE 5 — TESTING & CI/CD

### 5.1 Backend Tests (pytest)

- [ ] `conftest.py` — test DB (SQLite in-memory or test MySQL), test client, auth fixtures
- [ ] `test_auth.py` — register, login, forgot password, reset password, token expiry
- [ ] `test_meetings.py` — create, cancel, reschedule, conflict detection
- [ ] `test_services.py` — unit tests for each service with mocked DB
- [ ] `test_api.py` — integration tests for full HTTP round-trips

### 5.2 Frontend Tests (Vitest + Testing Library)

- [ ] `__tests__/` per feature folder
- [ ] Component render tests
- [ ] Hook tests with MSW for API mocking
- [ ] Form validation tests

### 5.3 CI/CD Pipeline (`.github/workflows/ci.yml`)

```yaml
name: CI
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd frontend && npm ci && npm run lint
      - run: cd backend && pip install -r requirements.txt && ruff check .
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd frontend && npm ci && npm run typecheck
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8
        env: { MYSQL_ROOT_PASSWORD: test, MYSQL_DATABASE: test }
        ports: [3306:3306]
    steps:
      - uses: actions/checkout@v4
      - run: cd backend && pip install -r requirements.txt && pytest
      - run: cd frontend && npm ci && npm test
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: trufflesecurity/trufflehog@v3  # Secrets scanning
```

### 5.4 Pre-commit Hooks (`.husky/pre-commit`)

```bash
npx lint-staged         # Lint + format staged files
npm run typecheck        # TypeScript check
trufflehog git --since HEAD~1  # Secrets scan
```

---

## VERIFICATION CHECKLIST

After ALL refactors are complete, verify:

- [ ] `git log --oneline` shows no secrets committed
- [ ] `grep -r "tharunriot" .` returns only legitimate references (none in code logic)
- [ ] `grep -r "007AFF" .` returns zero results (no hardcoded Apple blue)
- [ ] `npm run typecheck` exits 0 (TypeScript compiles clean)
- [ ] `ruff check .` exits 0 (Python lints clean)
- [ ] `pytest` — all tests pass
- [ ] `npm test` — all tests pass
- [ ] `npm run build` — frontend builds without errors
- [ ] No file exceeds 300 lines of logic
- [ ] Every API response has `{ success, data, error }` envelope
- [ ] Login page renders without hardcoded email references
- [ ] `/uploads` returns 401 without valid token
- [ ] `CSP` header present in all responses
- [ ] `HSTS` header present in all responses
- [ ] Rate limit at 10/min on login, 30/min on captcha, 5/min on register
- [ ] JWT expiry is 15 minutes, refresh token works
- [ ] Password reset requires both email link + manual token entry
- [ ] Admin panel doesn't reference `tharunriot@gmail.com` anywhere
- [ ] All components have loading, empty, error, success states
- [ ] Keyboard navigation works end-to-end
- [ ] `alembic history` shows clean migration chain
- [ ] No inline `style={}` in any `.tsx` file
- [ ] Dark mode toggle works (if implemented)

---

## SUMMARY OF DELIVERABLES

After this refactor, the codebase should demonstrate:

1. **True client-server architecture** — frontend is a pure API consumer, backend has no HTML rendering, services/ layer is HTTP-agnostic
2. **Production-grade project structure** — feature-first frontend, domain-first backend, Alembic migrations, proper test hierarchy
3. **Effective UI design** — consistent design tokens, accessible components, all states handled, no dead code, no inline styles, every component <300 lines
4. **Zero security vulnerabilities** — no secrets in repo, proper auth, proper CORS/CSP, rate limiting, input validation, audit logging

Do NOT stop until every item in the verification checklist passes.
```

---

## How to Use

1. Copy the entire content above
2. Paste into an AI coding assistant (Claude, GPT-4, Cursor, etc.)
3. The AI will execute the refactor step by step, fixing all issues identified in `AUDIT_REPORT.md`

> ⚠️ Before running, ensure you've revoked the leaked credentials (see AUDIT_REPORT.md Phase 1). The refactor will remove secrets from the codebase but cannot revoke already-exposed tokens.
