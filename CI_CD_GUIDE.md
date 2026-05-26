# CI/CD — how to demo it

This project ships with two CI/CD pipelines on GitHub Actions, one for the
web app (this repo) and one for the Flutter APK (the `Food-app-apk` repo).
This guide explains what each pipeline does, how to trigger it, and what
to show during a demo.

## 1. The web pipeline (`.github/workflows/deploy.yml`)

```
push to main / open PR
       │
       ▼
┌──────────────────────────────────┐
│  Build job (always runs)         │
│  • npm ci                        │
│  • npm test  (vitest, 17 tests)  │
│  • npm run build  (vite + tsc)   │
│  • upload build/ artifact        │
└────────────┬─────────────────────┘
             │ on main only
             ▼
┌──────────────────────────────────┐
│  Deploy edge functions           │
│  • supabase functions deploy     │
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
- any vitest unit test fails (`npm test`)
- TypeScript can't compile (`vite build` invokes tsc)
- the bundle fails to produce

Failed builds block deploys downstream — no broken code reaches users.

### Repo secrets the pipeline expects
| Secret | Used by | Required? |
| --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN` | `Deploy Edge Functions` | yes for prod deploys |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | `Deploy to Vercel` | optional — set repo var `VERCEL_ENABLED=true` to turn on |

## 2. The Flutter pipeline (`food_app1_flutter/.github/workflows/build-release.yml`)

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
npm test             # vitest run, ~1 second
npm run build        # full type-check + production bundle

# Flutter
cd food_app1_flutter
flutter pub get
flutter analyze      # static checks
flutter test         # unit tests if any
flutter build apk --release
```

## 4. How to demo each pipeline

### Demo flow A — "tests gate the build"
1. Open `src/utils/healthClassification.test.ts`.
2. Change one of the assertions so it must fail
   (e.g. expect `'unhealthy'` to become `'healthy'`).
3. `git commit -am "demo: break a test"` and `git push`.
4. Open the **Actions** tab of the GitHub repo — show the red X on the
   newest workflow run, drill into the failed step, point at the vitest
   diff that caused the failure.
5. Revert the test, push again — show the green check.

### Demo flow B — "tag-based release"
1. Bump the Flutter app version in `pubspec.yaml` (`version: 1.10.0+10`).
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

## 5. Files involved (so judges/reviewers can verify)

| File | Purpose |
| --- | --- |
| `.github/workflows/deploy.yml` | Web CI/CD (build + test + deploy) |
| `../food_app1_flutter/.github/workflows/build-release.yml` | APK release |
| `src/utils/healthClassification.ts` | Code under test |
| `src/utils/healthClassification.test.ts` | 17 vitest unit tests |
| `package.json` → `scripts.test` | `vitest run` |

## 6. Why this is "real" CI/CD, not a checkbox

- Tests run on **every push and PR**, so a regression can't merge silently.
- Deploys are **gated on the test job succeeding** (`needs: build` in the
  workflow). If tests fail, the edge function deploy never runs.
- The pipeline is **reproducible** — `npm ci` uses the lock file, so the
  build on CI is bit-for-bit the same as the developer's local install.
- Artefacts are **traceable**: every build uploads its bundle, every tag
  produces a downloadable APK, every workflow run links back to the
  commit SHA that triggered it.
