# CI/CD — how to demo it

Two GitHub Actions pipelines: one for the web app (this repo) and one for
the Flutter APK (the `Food-app-apk` repo). This page explains what each
does, how to trigger it, and what to show during a defense demo.

> **Updated June 2026** — the web workflow lost its legacy `Sync function
> source` step. The Edge Function deployable is now the single source of
> truth. See §1.5 for the story.

## 1. The web pipeline (`.github/workflows/deploy.yml`)

```
push to main / open PR
       │
       ▼
┌──────────────────────────────────┐
│  Build job (always runs)         │
│  • npm ci                        │
│  • npm test  (vitest, 21 tests)  │
│  • npm run build  (vite + tsc)   │
│  • upload build/ artifact        │
└────────────┬─────────────────────┘
             │ on main only
             ▼
┌──────────────────────────────────┐
│  Deploy edge functions           │
│  • supabase functions deploy     │
│    --no-verify-jwt               │
└────────────┬─────────────────────┘
             │ optional (vercel secret set)
             ▼
┌──────────────────────────────────┐
│  Deploy to Vercel                │
└──────────────────────────────────┘
```

### Triggers
| Event | What runs |
| --- | --- |
| Push to `main` | build → tests → deploy edge functions → (optional) deploy Vercel |
| Open a PR against `main` | build → tests only (no deploy) |
| Manual via "Run workflow" button | same as push to main |

### What protects `main`
The build job fails if:
- any vitest unit test fails (`npm test` — 21 tests on the health classifier)
- TypeScript can't compile (`vite build` invokes tsc)
- the bundle fails to produce

Failed builds block deploys downstream — no broken code reaches users.

### Repo secrets the pipeline expects
| Secret | Used by | Required? |
| --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN` | `Deploy Edge Functions` | yes for prod deploys |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | `Deploy to Vercel` | optional — set repo var `VERCEL_ENABLED=true` to turn on |

### 1.5 Single source of truth (the June 2026 fix)

The workflow used to have an intermediate "Sync function source" step
that copied `src/supabase/functions/server/index.tsx` over
`supabase/functions/make-server-36162e30/index.ts` before deploying.
That meant the deployable file you edited was being silently overwritten
on every push to main — by a stale legacy copy of the same code. Every
push regressed the deploy back to the broken old version.

Removed. The deployable file is now the only source of truth:

```
supabase/functions/make-server-36162e30/index.ts   ← edit here
                            ↓
              supabase functions deploy
                            ↓
                      Supabase edge
```

The file has a banner comment at the top reinforcing this so future
contributors don't get confused.

## 2. The Flutter pipeline (`food_app1_flutter/.github/workflows/ci.yml` + `build-release.yml`)

Two jobs in two workflows:

### Quality gate — `ci.yml` (every push / PR)
```
push / PR
   │
   ▼
┌──────────────────────────────────┐
│  analyze job                     │
│  • flutter pub get               │
│  • flutter analyze --no-fatal-…  │
│  • flutter test  (22 tests)      │
└──────────────────────────────────┘
```

A failing analyze or test blocks `build-apk` (the next job declares
`needs: analyze`).

### APK release — `build-release.yml` (tag-driven)
```
push a tag matching v*
       │
       ▼
┌──────────────────────────────────┐
│  Build & Release APK             │
│  • setup-java 17                 │
│  • setup-flutter 3.32            │
│  • flutter pub get               │
│  • flutter build apk --release   │
│  • upload app-release.apk to     │
│    a GitHub Release page         │
└──────────────────────────────────┘
```

### How to cut a new APK
```bash
cd food_app1_flutter
git tag v1.10.0
git push origin v1.10.0
```
Within ~6 minutes the APK appears at
`https://github.com/Heavenlymango/Food-app-apk/releases/tag/v1.10.0`.

## 3. Running the same checks locally

Same commands the CI runs — handy for "let me prove tests pass before
pushing":

```bash
# Web
cd food_app
npm install          # one-time
npm test             # vitest run, ~1 second, 21 tests
npm run build        # full type-check + production bundle

# Flutter
cd food_app1_flutter
flutter pub get
flutter analyze      # static checks
flutter test         # 22 unit tests
flutter build apk --release
```

## 4. How to deploy edge functions manually (when CI is too slow)

```bash
cd food_app
supabase functions deploy make-server-36162e30 --no-verify-jwt
```

The `--no-verify-jwt` flag matches CI; without it the Supabase gateway
would reject every request before reaching the function code.

Output looks like:
```
Uploading asset (make-server-36162e30): supabase/functions/make-server-36162e30/index.ts
Uploading asset (make-server-36162e30): supabase/functions/make-server-36162e30/kv_store.ts
Deployed Functions on project qavwicfoiccfwfntumjj: make-server-36162e30
```

**Warning**: if you deploy manually and then push to `main` afterwards,
the CI deploy runs and overwrites your manual deploy with whatever's in
the repo. Make sure the deployable file is the version you actually want
live.

## 5. How to demo each pipeline (defense day)

### Demo flow A — "tests gate the build"
1. Open `src/utils/healthClassification.test.ts`.
2. Change one of the assertions so it must fail
   (e.g. expect `'unhealthy'` to become `'healthy'`).
3. `git commit -am "demo: break a test"` and `git push`.
4. Open the **Actions** tab of the GitHub repo — show the red X on the
   newest workflow run, drill into the failed step, point at the vitest
   diff that caused the failure.
5. Revert the test, push again — show the green check and the deploy
   running.

### Demo flow B — "tag-based release"
1. Bump the Flutter app version in `pubspec.yaml` (e.g. `version: 1.10.0+10`).
2. Tag and push:
   ```bash
   git tag v1.10.0
   git push origin v1.10.0
   ```
3. Open the **Actions** tab on the Flutter repo — show the new run.
4. When it finishes, open **Releases** and show the auto-attached APK.

### Demo flow C — "PR build artefact"
1. Branch off main: `git checkout -b demo/typo-fix`.
2. Change one menu label, push the branch.
3. Open a PR. Show the bot-posted check on the PR page.
4. In the run summary, click into the **Build** step → show the bundle
   sizes printed by Vite, and the artifact link at the bottom.
5. Merge — show that `Deploy Edge Functions` now runs only after merge.

## 6. Files involved (so judges/reviewers can verify)

| File | Purpose |
| --- | --- |
| `food_app/.github/workflows/deploy.yml` | Web CI/CD (build + test + deploy) |
| `food_app1_flutter/.github/workflows/ci.yml` | Flutter quality gate (analyze + test) |
| `food_app1_flutter/.github/workflows/build-release.yml` | APK build on tag |
| `food_app/src/utils/healthClassification.ts` | Code under test |
| `food_app/src/utils/healthClassification.test.ts` | 21 vitest unit tests |
| `food_app1_flutter/test/health_classification_test.dart` | 22 flutter_test cases (mirror) |
| `food_app/package.json` → `scripts.test` | `vitest run` |
| `food_app/supabase/functions/make-server-36162e30/index.ts` | The Edge Function CI deploys |

## 7. Why this is "real" CI/CD, not a checkbox

- Tests run on **every push and PR**, so a regression can't merge
  silently. The classifier has 21 web + 22 Flutter = 43 tests covering
  every rule and the precedence chain.
- Deploys are **gated on the test job succeeding** (`needs: build` in the
  workflow). If tests fail, the edge function deploy never runs and
  Vercel never publishes.
- The pipeline is **reproducible** — `npm ci` uses `package-lock.json`,
  so the build on CI is bit-for-bit identical to the developer's local
  install. Same for `flutter pub get` against `pubspec.lock`.
- Artefacts are **traceable**: every build uploads its bundle, every tag
  produces a downloadable APK, every workflow run links back to the
  commit SHA that triggered it. The seller and student tabs show the
  bundle hash (`index-<hash>.js`) so we can prove what version is live.
- Edge Function and front-end deploy from **a single source of truth**.
  No legacy paths, no "did the sync step run?" — the file you edit is
  the file that ships.

## 8. Known-bug post-mortem (June 2026)

**What happened.** The `/api/student/orders` endpoint was returning 401
to every poll for an entire afternoon. Manual deploys fixed it for ~15
minutes, then CI overwrote them.

**Why.** The workflow's `Sync function source` step copied a stale
legacy `.tsx` file over the live `.ts` deployable. The legacy file had
the old kv-store-based endpoint that returns 401 for Supabase-auth users.

**Detection.** A diagnostic console log added to `api.ts` (`[api.get
/api/student/orders] FAILED { status: 401, ... }`) made the silent
failure visible. The DB clearly had the data; the endpoint clearly was
returning empty; the only place left to look was *what's actually
deployed*.

**Fix.** Removed the cp step (commit `059e9a5`). Synced the legacy file
to match the deployable one last time (commit `456b19e`) so the deploy
right after the fix would deploy the correct code.

**Lesson worth narrating at defense.** When a CI workflow has a sync
step that copies from a non-deployable location into a deployable one,
that non-deployable location is now load-bearing — and silently. Always
have a single source of truth.
