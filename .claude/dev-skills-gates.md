# Dev Skills gate state
Track: release sequence — v2.3.1 port-conflict detection (env/override/range ports + save/deploy check)
Mode: semi-autonomous (approved 2026-09-25) — commits and the tag still require the user's approval
Model: Opus 5.5 approved by user for the port-conflict task
Test env: isolated docker:dind sidecars (--privileged, test only) approved by user 2026-09-25 over host docker.sock
Origin: darthrater78/dockge (fork of cmcooper1980/dockge)
Standards: at-rest ➖ n/a (no new stored data) · login unchanged · Apprise ➖ declined for this project by user 2026-09-25 · compose quickstart ✅ image pinned to 2.3.1
Version: 2.3.1
Updated: 2026-09-25
Prior release: v2.3.0 SHIP ✅ — tagged on 578e77f, GHCR 2.3.0 == latest (amd64/arm64/armv7), smoke-tested; docs PR #34 merged as 06b0c60

🔢 VERSION    ✅ all refs at 2.3.1 (PATCH: fixes + a save-time warning, no breaking change; confirm at commit approval)
  package.json, package-lock.json (root x2), About.vue release link, compose.yaml + README quickstart/update pins, README top note links releases/tag/v2.3.1; v2.3.0 tagged on origin
🔨 BUILD      ✅ lint 0 errors (91 warnings, unchanged), check-ts, build:frontend, image build; handoff offered
  unit checks 20/20 (interpolation, override, ranges, docker ps parsing, banner ranges, prototype keys, deep nesting)
  e2e 30/30 (Playwright desktop + iPhone 13) vs image in dind env: ${VAR} from .env, global.env var, override-only port, undeployed range → stack list + checkPortConflicts + Deploy/Save dialogs, Cancel, Save anyway, own ports excluded, no-conflict save
  not exercised end-to-end: a plain `docker run` container (enforcement check misreads commands inside the dind sidecar); its parser is unit-tested
  tree snapshot identical before/after each build
  test artifact: local image dockge-port-test:2.3.1 (sha256:4056e9d5…) built from the working tree that becomes the commit (.claude excluded from image)
  test creds: generated per run, shown to user (test env at http://10.0.0.252:5051, removed); second agent added per user request, per-agent scoping verified
🔒 SECURITY   ✅ 0 open — 0 Critical, 0 High
  npm audit 0 vulns; Dependabot alerts 0 open; secret scanning 0 open; code scanning not configured (unchanged)
  diff: new socket event checkLogin + string type checks; docker ps via arg array (no shell), fixed format string; modal text via {{ }} (escaped); yaml alias limit default
  ✅ fixed (Medium): deeply nested ${…} could throw in extractPorts and break the stack list broadcast → per-file try/catch, regression test fails without it
  ✅ fixed (Low): bare $constructor read Object's prototype → own-key lookup
  ✅ fixed (quality): global.env read per stack per broadcast → 1 s single-entry cache; findPortConflicts 75 lines → PortClaims + two claim helpers; sort indexOf → Map; port loop nesting flattened
📄 DOCS       ✅ README: 2.3.1 note + release link at top, v2.3.1 table row, feature line, dated 2.3.1 Version History, agent-version note (older agents: save proceeds after 5 s; REST API unaffected)
  existing port-conflict descriptions (banner, filters) still accurate; quickstart + one-line updater pinned to 2.3.1
📦 RELEASE    ✅ commit + release notes approved by user 2026-09-25 ("tear it down and commit as next version"); branch from origin/master, 0 behind
  PR to master on darthrater78/dockge opened with this commit
🚀 SHIP       ⏳ plan: CI green on PR → merge (no branch delete) → CI green on merge commit → user pushes tag v2.3.1
  → docker-release.yml publishes ghcr.io/darthrater78/dockge:2.3.1 + :latest → verify; branch deletion handed to user
  test env (2 dind + main + agent, 30/30 + per-agent checks) torn down 2026-09-25; local image dockge-port-test:2.3.1 kept until ship
