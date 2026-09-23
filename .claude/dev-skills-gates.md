# Dev Skills gate state
Track: release sequence (v2.2.0)
Mode: semi-autonomous (approved 2026-09-23) — commits and the tag still require the user's approval
Origin: darthrater78/dockge (fork of cmcooper1980/dockge)
Branch: fix/terminal-scroll-mobile-audit
Version: 2.2.0
Updated: 2026-09-23
Skill: ⚠️ outdated (v2.34.0, latest v2.35.0)

🔢 VERSION    ✅ all refs at 2.2.0
  package.json, package-lock.json, About.vue release link; v2.1.0 tagged on origin
🔨 BUILD      ✅ build verified; handoff offered to user
  lint 0 errors (97 warnings, was 109), check-ts, build:frontend; Base/BuildHealthCheck/release images built (Go 1.27.1)
  Playwright vs image: drag/touch resize, wheel scroll, expand/Esc, grid fits, pty tracks size, REST API actions
  test artifact: local image dockge-test:2.2.0 built from the commit tree
  test creds: generated per run, shown to user
🔒 SECURITY   ✅ 0 open — 0 Critical, 0 High
  npm audit 0 vulns; Dependabot alerts 0 open; secret scanning 0 open; actionlint clean
  ✅ fixed: release wf dispatch skipped branch check; no CI-status/tag-version gate; env2arg exit code;
     no anti-framing headers; REST actions ignored global.env/override; security reports routed upstream (PVR enabled);
     Go 1.21.4 healthcheck; unpinned base digests; floating xterm beta; terminalResize/paging/agents input;
     setup race; duplicate CI workflows; /api/stacks serial spawns; CONTRIBUTING upstream voice; .claude in image
  🔕 waived 2026-09-23 by user: UPTIME_KUMA_WS_ORIGIN_CHECK=bypass — opt-in, documented; revisit with allowlist
  🔕 waived 2026-09-23 by user: runs as root with docker.sock — inherent to Dockge (socket is root-equivalent)
📄 DOCS       ✅ README v2.2.0 table row + dated Version History entry
  DOCKGE_ALLOW_FRAMING documented (README + compose.yaml); community/security links repointed to fork
📦 RELEASE    ⏳ commit approved 2026-09-23 ("continue"); PR in progress
🚀 SHIP       ⏳ plan: merge PR → run Docker Base Images workflow → user pushes tag v2.2.0 → verify GHCR
