# SRAP — UNFILTERED REALITIES

SRAP is a gamified self-assessment platform built around a tricentric reflection model: **HEAD · HEART · BODY**.

The product combines structured reflection, AI-assisted analysis, daily progress and controlled gamification. It is a reflection tool, not a medical or mental-health diagnostic system.

## Production architecture

```
Browser
  │
  ├── Authenticated Supabase client
  │
  ├── srap-analysis Edge Function
  │       ├── authenticated user
  │       ├── origin validation
  │       ├── payload validation
  │       ├── daily AI quota
  │       └── Gemini API
  │
  └── PostgreSQL RPC
          ├── complete_evaluation()
          ├── complete_tricentric_practice()
          ├── XP / level
          ├── streak
          └── achievements

Rule:
CLIENT REQUESTS → SERVER DECIDES → DATABASE GUARANTEES
```

## Production hardening

The production branch protects the business-critical state at the database boundary:

- XP, level, streak and evaluation counters cannot be changed directly by the browser.
- Evaluation completion is transactional.
- One evaluation per UTC day is enforced by a database unique index.
- Tricentric practice is persisted instead of being a visual-only interaction.
- Tricentric practice is limited to one completion per UTC day.
- Achievement rewards are granted only on the first unlock.
- Legacy XP-mutating RPCs were removed.
- Privileged functions use explicit execution grants and a controlled search path.
- AI requests require an authenticated user.
- AI request payloads have size and shape validation.
- AI analysis has a daily per-user quota.
- Gemini credentials remain server-side.
- The browser prefers the Supabase publishable key.
- Production headers include clickjacking, MIME-sniffing and referrer protections.
- Canonical URL, robots and sitemap point to the current Vercel deployment.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Supabase Auth
- PostgreSQL + RLS
- Supabase Edge Functions
- Google Gemini
- Vercel

## Environment

Frontend:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
VITE_SITE_URL=https://tricentric-integration-lyart.vercel.app
VITE_ENABLE_LOCAL_AI=false
```

Edge Function secrets:

```text
APP_ORIGIN=https://tricentric-integration-lyart.vercel.app
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.6-flash
```

Never place Gemini or Supabase secret keys in `VITE_*` variables.

## Database deployment

Migrations live under:

```
supabase/migrations/
```

Production workflow:

```bash
supabase migration list
supabase db push
supabase functions deploy srap-analysis
```

Do not make untracked production schema changes directly in the Dashboard. Keep production schema changes in migrations.

## AI

The cloud analysis endpoint uses an authenticated Supabase Edge Function as the security boundary.

The optional browser-local path uses Chrome's current Prompt API through `window.LanguageModel`. It is disabled by default:

```bash
VITE_ENABLE_LOCAL_AI=false
```

This keeps the production behavior deterministic while allowing local AI to be enabled deliberately when browser support is verified.

## Gamification

Evaluation XP follows the existing SRAP model:

- Base evaluation: 50 XP
- Streak bonus: 10 XP × current streak day
- Honest synthesis: +50 XP
- Achievement rewards: awarded once per achievement
- Levels: 1–10

The database is authoritative for all persisted values.

## UX and accessibility

The interface includes:

- keyboard-visible focus states
- reduced-motion support
- accessible buttons and form controls
- ARIA status/progress patterns
- modal Escape handling
- modal focus restoration and trapping
- persisted tricentric reflections
- clear loading/error states

Somatic language is presented as **reflection prompts**, not medical conclusions.

## SEO

Production baseline:

- Spanish document language
- static title and description
- canonical URL
- Open Graph metadata
- Twitter metadata
- robots.txt
- sitemap.xml
- web manifest
- Vercel security headers

## Verification

Before promotion:

```bash
npm run typecheck
npm run build
npm run verify
```

Required functional checks:

1. Sign in.
2. Complete an evaluation.
3. Confirm XP and streak change once.
4. Submit the same evaluation again and confirm it is rejected.
5. Complete tricentric practice.
6. Repeat it the same day and confirm it is rejected.
7. Confirm the tricentric achievement reward is not repeatable.
8. Request AI analysis while authenticated.
9. Confirm unauthenticated AI requests are rejected.
10. Confirm the daily AI quota is enforced.

## Deployment

Frontend target:

**Vercel — `tricentric-integration`**

Current deployment domain:

`https://tricentric-integration-lyart.vercel.app/`

Supabase is the production backend boundary. Do not connect this product to unrelated Chalamandra projects.

## License

MIT.
