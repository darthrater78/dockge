# Dev Skills gate state
Track: release sequence — v2.3.0 stable, feature/mobile-redesign → PR → master → tag (user switched from dev release 2026-09-25)
Mode: semi-autonomous (approved 2026-09-25) — commits and the tag still require the user's approval
Model: Opus 5.5 approved by user for the mobile redesign task
Test env: isolated docker:dind sidecars (--privileged, test only) approved by user 2026-09-25 over host docker.sock
Origin: darthrater78/dockge (fork of cmcooper1980/dockge)
Standards: at-rest ➖ n/a (UI + scan change, no new stored data) · login unchanged · Apprise ⬜ offered 2026-09-25 (twice), no answer yet — re-ask after ship · compose quickstart ✅ image pinned to 2.3.0
Version: 2.3.0
Updated: 2026-09-25

🔢 VERSION    ✅ all refs at 2.3.0 (MINOR: new features, no breaking change; confirmed at commit approval)
  package.json, package-lock.json (root x2), About.vue release link, README table + Version History, compose.yaml + README quickstart image tag; v2.2.0 tagged on origin
🔨 BUILD      ✅ lint 0 errors (91 warnings, was 97), check-ts, build:frontend, actionlint 1.7.7 clean; handoff offered
  tree snapshot identical before/after the run
  Playwright (iPhone 13 + desktop) vs image: list/search/filters/conflict banner, agent sections, stack tabs,
    action bar restart → logs, edit → deploy/save/discard, drift scan + sync (desktop cards when narrow, mobile), pane drag/persist/reset, port fitting
  test artifact: local image dockge-mobile-test:2.3.0 built from the working tree on db735ce (the commit being made; later edits README-only, excluded from the image)
  test creds: generated per run, shown to user (test env at http://10.0.0.252:5051)
🔒 SECURITY   ✅ 0 open — 0 Critical, 0 High
  npm audit 0 vulns; Dependabot alerts 0 open; secret scanning 0 open; code scanning not configured (unchanged)
  diff: no v-html/innerHTML/eval; route query tab allowlisted; docker spawns use arg arrays (no shell); listeners/observers torn down
  workflow: dev-tag branch-check bypass limited to tag push matching ^v\d+\.\d+\.\d+-dev\.\d+$; stable stays default-branch only
  ✅ fixed (quality): drift scan N+1 docker spawns → 3 calls per scan; mobile card port split recomputed per render → memoized
📄 DOCS       ✅ README v2.3.0 table row + dated Version History entry; "What's new in this fork: 2.3.0" under the badges
  Mobile / Desktop / Compose Drift Check subsections: 8 screenshots + 5 GIFs in docs/images/ (8.1 MB), all paths verified; anchors #mobile #desktop #drift-check #release-notes
  Louis Lam credited at the top; Motivations attributed to him; wording reviewed (per user)
  lineage stated (per user): louislam/dockge → cmcooper1980/dockge → this fork (top note, Claude Code intro, credits)
  REST API origin finder39/dockge credited in the top note and at the head of the REST API section (per user)
  ✅ fixed: quickstart image `latest` → `2.3.0` (README + compose.yaml); How to Update explains pinning vs :latest
  captured from the dind test env with mock data; docs/ in .dockerignore
  preview container + test env torn down 2026-09-25 (per user); test artifact image dockge-mobile-test:2.3.0 kept until ship
📦 RELEASE    ✅ commit approved by user 2026-09-25 ("lets proceed"); branch synced with origin/master (0 behind)
  PR to master on darthrater78/dockge opened with this commit; release notes approved with the commit approval
🚀 SHIP       ⏳ plan: CI green on PR → merge (no branch delete) → CI green on merge commit → user pushes tag v2.3.0
  → docker-release.yml publishes ghcr.io/darthrater78/dockge:2.3.0 + :latest → verify; branch deletion handed to user
