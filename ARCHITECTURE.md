# SRAP — Production Architecture

## 1. Architectural rule

> **CLIENT REQUESTS → SERVER DECIDES → DATABASE GUARANTEES**

The browser owns presentation and temporary form state. It does not own business-critical gamification state.

## 2. Runtime flow

```
                    ┌──────────────────────┐
                    │      React UI        │
                    │ Exam / Tricentric    │
                    └──────────┬───────────┘
                               │
                   Supabase Auth JWT
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
     srap-analysis                        PostgreSQL RPC
     Edge Function                        complete_evaluation
              │                          complete_tricentric_practice
              │                                 │
       Origin + auth +                         │
       schema + quota                           │
              │                                 │
              ▼                                 ▼
        Gemini API                     Atomic business state
                                               │
                               ┌───────────────┼──────────────┐
                               ▼               ▼              ▼
                              XP            Streak       Achievements
                               │
                               ▼
                         User profile
```

## 3. Database authority

### user_profiles

Authoritative:

- experience points
- current level
- total evaluations
- streak
- last evaluation date

Browser:

- may read its own profile
- may create its own empty profile
- may not mutate gamification counters directly

### evaluations

Browser:

- read own history

Server:

- creates evaluation rows
- calculates XP
- calculates streak
- unlocks achievements

Database:

- enforces one evaluation per UTC day

### tricentric_practices

Stores:

- HEAD reflection
- HEART reflection
- BODY reflection
- synthesis
- XP
- completion timestamp

Database:

- one completed practice per UTC day

### achievements

Reference data readable by authenticated users.

### user_achievements

Browser:

- read own achievements

Server:

- creates unlocks

This prevents reward replay.

## 4. RPC security

The old client-callable XP functions were removed.

Privileged RPCs use:

- SECURITY DEFINER
- explicit search_path
- explicit execution grants
- authenticated caller checks
- server-side validation
- transactional updates

The AI quota RPC is server-only.

## 5. AI boundary

```
React
  │
  │ Authorization: Bearer <user JWT>
  ▼
Supabase Edge Function
  │
  ├── authenticated user
  ├── exact production origin
  ├── request-size validation
  ├── payload validation
  ├── daily quota
  │
  ▼
Gemini API
```

The Gemini API key never enters the browser bundle.

Default production model:

gemini-3.6-flash

The model can be changed through the server-side GEMINI_MODEL configuration without changing client code.

## 6. Local AI

An optional browser-local path uses Chrome's current Prompt API:

window.LanguageModel

It is disabled by default with:

```
VITE_ENABLE_LOCAL_AI=false
```

This path is treated as progressive enhancement, not as the authoritative AI service.

## 7. Security layers

1. Supabase Auth
2. publishable client key
3. RLS
4. least-privilege grants
5. database constraints
6. server-side RPC authorization
7. transactional business logic
8. Edge Function origin validation
9. Edge Function payload limits
10. AI daily quota
11. server-side Gemini secret
12. Vercel security headers

## 8. SEO layer

Static baseline:

- title
- description
- canonical
- Open Graph
- Twitter metadata
- robots
- sitemap
- manifest

Runtime SEO remains available through SeoHead for route-specific metadata.

## 9. Deployment boundary

Frontend:

**Vercel project:** tricentric-integration

Backend:

**Supabase project:** dedicated production project for Tricentric Integration.

The product must not depend on unrelated Chalamandra Supabase projects.

## 10. Release gate

A release is production-ready only when all are true:

- TypeScript passes
- Vite build passes
- migrations apply cleanly
- Supabase security advisors are reviewed
- Edge Function deploys
- authentication works
- evaluation transaction works
- duplicate evaluation is blocked
- practice transaction works
- duplicate practice is blocked
- achievement replay is blocked
- AI authentication works
- AI quota works
- Vercel deployment is READY
- production URL loads without console/runtime errors
