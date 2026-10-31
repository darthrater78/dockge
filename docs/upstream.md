# This fork and upstream

How this fork differs from [louislam/dockge](https://github.com/louislam/dockge), how it was built, and whose work it includes. Back to the [README](../README.md).

<a id="upstream-differences"></a>

## ↔️ Differences from upstream

What this fork changes about an install, compared with [louislam/dockge](https://github.com/louislam/dockge). Most of the fork is new code added on top (about 6,900 lines across the backend, frontend and shared code, against fewer than 300 changed or removed); the [features](features.md) add screens and options without changing how an existing setup works. These are the exceptions:

| | Upstream | This fork |
|---|---|---|
| **Image** | `louislam/dockge:1` | `ghcr.io/darthrater78/dockge:<version>`, pinned to a release |
| **Stacks folder in the quickstart** | `/opt/stacks` | `/opt/docker/stacks`. Both are just `DOCKGE_STACKS_DIR`: keep yours, nothing has to move |
| **What Dockge mounts** | `docker.sock`, its data folder, the stacks folder | The same. The 2.4.0 and 2.4.1 quickstarts mounted all of `/opt/docker`; [how to switch back](install.md#bind-roots) |
| **User Dockge runs as** | root | root, unless you set `PUID`/`PGID`; then it [drops to that user](install.md#runtime) after fixing ownership of its own folders and stack files (never your apps' data) |
| **Container hardening** | none | The quickstart adds a read-only filesystem, `no-new-privileges` and dropped capabilities. Only applies if you copy them into your compose file |
| **Saving a stack** | Writes the file | Checks it with `docker compose` first; `.env` and `global.env` are saved readable by their owner only (`0600`) |
| **Before a stack starts** | Docker creates missing bind folders as root | Dockge creates missing `./relative` folders inside the stack, owned by its user |
| **Database** | | Three migrations: an agent name column, a version-sync history table, and remote agent passwords encrypted at rest |

**Going back to upstream:** your stacks and compose files work unchanged with upstream Dockge. The database mostly does too, except remote agents: their passwords are encrypted by this fork, and upstream can't read them, so re-enter each agent's password after switching (or remove and re-add the agents). Upstream logs "Database migration failed, you may be downgrading Dockge" on start because of the extra migrations; that warning is harmless. Back up the data folder before switching either way.

## 🤖 Built by Claude Code

> **Every line of new code in this fork — from v1.5.2 onward — was written entirely by [Claude Code](https://claude.ai/code), Anthropic's AI coding agent.** No human wrote the implementation code. A human ([@darthrater78](https://github.com/darthrater78)) directed the work: describing features, reviewing PRs, and approving releases, but Claude Code authored all source changes, security fixes, documentation, and release engineering across **8 feature releases and 33+ commits**.

### What Claude Code built in this fork

Starting from [Chris Cooper's fork](https://github.com/cmcooper1980/dockge) of [louislam/dockge](https://github.com/louislam/dockge) (upstream v1.4.2), Claude Code implemented the following — each delivered as a branch, PR, security-reviewed build, and tagged release:

| Version | What was built | Scope |
|---------|---------------|-------|
| **v1.5.2** | Agent name column migration fix | Database migration that existing installs missed |
| **v1.5.3** | Security hardening | Path traversal fix, JWT expiry (30-day), XSS sanitization, password model fix, nightly CI workflow |
| **v1.6.0** | REST API (ported) | Ported from [finder39/dockge](https://github.com/finder39/dockge) and adapted to this fork's architecture — 13 endpoints, API key auth, stack validation, update history, auto-update scheduler |
| **v1.6.1** | Settings UI | Frontend for API key management, cron scheduler, per-stack auto-update toggle |
| **v1.6.2** | Stack lifecycle API | `POST /api/stacks/:name/down` endpoint completing the full start/stop/restart/down lifecycle |
| **v1.6.3** | API data fix | Container state, status, health, and image info populated in `GET /api/stacks` responses |
| **v1.7.0** | Compose Drift Check | Detect image tag drift between running containers and compose files, one-click sync, YAML-comment-preserving writes, sync history with revert, multi-host agent support |
| **v1.7.1** | Global drift scan | "Scan All" button on Home page scanning every stack on every connected agent |
| **v1.8.0** | Feature removal & rename | Removed skopeo-based image update detection (too complex, unreliable), renamed to "Compose Drift Check" |
| **v1.8.1** | Dark mode & reliability | Fixed Bootstrap CSS overrides breaking dark mode, added 30s agent timeout for offline nodes |
| **v1.8.2** | Security patch | Updated ws (HIGH — memory disclosure/DoS), yaml (MODERATE — stack overflow), express (body-parser DoS, ReDoS, qs bypass) |
| **v1.9.0** | 2FA & encryption | TOTP two-factor authentication, `.env` file persistence on stack save, AES-256-GCM encryption for agent credentials at rest, terminal shell allowlist |
| **v1.9.1** | Update button restored | Re-added compose pull + up update button and API endpoint removed in 1.8.0, fixed About page links |
| **v1.9.2** | Fork independence & security | Docker images from fork GHCR registry, dependency security fixes (mysql2, vite), CI cleanup |
| **v2.0.0** | Port visibility | Configured-port badges and HOST badge in the stack list, cross-stack port conflict detection scoped per agent, dev CI workflow, pre-release Docker tag support |
| **v2.1.0** | CI hardening, CVE fixes & mobile UX | SHA-pinned GitHub Actions, tag-on-default-branch release verification, Dependabot config; `npm overrides` closing Critical/High CVEs in `tar`/`lodash`/`glob` with no upstream fix available; resizable terminal panel; fixed mobile navigation (`isMobile` was referenced everywhere but never defined, hiding all nav on phones) |
| **v2.2.0** | Expandable terminal, mobile polish & audit fixes | Terminal panels on the stack, console and container pages can be dragged taller or expanded to full screen; fixed terminals hiding their newest lines (xterm measured before the web font loaded); server pty now follows the panel size; mobile header and tidier stack actions; release workflow now requires passing CI and a matching tag; anti-framing headers (`DOCKGE_ALLOW_FRAMING` opt-out); private vulnerability reporting |
| **v2.3.0** | Mobile redesign, resizable desktop list & fast drift scan | Phone layout rebuilt around find → edit → act: searchable stack list with status filters and collapsible per-agent sections, stack page with Overview / Compose / Logs tabs and a bottom action bar; port-conflict banner naming the ports and stacks; conflicting ports no longer hidden behind the "+N" badge; resizable stack list on desktop with port badges that fit its width; Compose Drift Check reachable on mobile and no longer times out on larger hosts (docker queried once per scan instead of per stack and container); `:dev` GHCR channel for branch builds |
| **v2.3.1** | Port conflicts you couldn't see | Ports written as `${VAR}` are read with the values from the stack's `.env` and `global.env`, ports in `compose.override.yaml` count, and port ranges are matched port by port; Save and Deploy now warn when a host port is already used by another stack (running or not) or by a running container outside any stack |
| **v2.4.0** | Runs as a regular user, bind folders without `chown` | Entrypoint drops root to `PUID`/`PGID` after fixing ownership of Dockge's own folders and joining the docker.sock group (old installs unchanged); missing bind-mount folders created before `up` (relative, `${VAR}`, and under `DOCKGE_BIND_ROOTS`); hardened quickstart (read-only filesystem, `no-new-privileges`, capabilities dropped); `.env` saved `0600`; Trivy scan gates every image push and the release workflow creates the GitHub release; dependency CVE fixes folded in from the unshipped 2.3.2 |
| **v2.4.1** | Node.js security update | Base image moved to Node.js 22.23.4 for the October 2026 Node.js security release (Brotli decoder RCE, TLS hostname bypasses); healthcheck rebuilt with Go 1.27.3; follow-redirects and vite dev-dependency fixes |
| **v2.4.2** | Dependency fixes, upstream mount layout | body-parser 2.4.0 (High DoS) and Moderate fixes; quickstart and docs mount only the data and stacks folders, as upstream; `extra/narrow-bind-root.sh` for installs on the old quickstart; "Differences from upstream" section; shellcheck in CI |

### How it worked

1. **Human direction** — The maintainer described what to build ("add a REST API", "detect image drift", "add 2FA") and provided architectural preferences
2. **Claude Code implementation** — Claude Code read the existing codebase, designed the changes, wrote the code, and produced working builds
3. **Security gate** — Every build went through a security scan checking for hardcoded secrets, injection vectors, path traversal, weak crypto, and dependency CVEs before any commit
4. **Review & release** — The maintainer reviewed each PR, tested the build, and approved the release. Claude Code authored the release notes, tags, and changelog entries

All Claude-authored commits carry a `Co-Authored-By: Claude` trailer in the git history. PR branches are prefixed with `claude/`.

### The Dev Skills gate system

Starting with later releases, development used a custom **Dev Skills** discipline — a structured set of mandatory gates that Claude Code enforces on itself before any code can be committed, pushed, or released. This changed the quality of the output significantly compared to earlier releases that relied on ad-hoc review.

The gate system works like a pre-flight checklist that cannot be skipped:

```
🔢 VERSION  →  🔨 BUILD  →  🔒 SECURITY  →  📄 DOCS  →  📦 RELEASE  →  🚀 SHIP
```

**What each gate catches:**

1. **Version Gate** — Every version-carrying file in the project (package.json, source code, UI strings) must agree. Claude Code greps the entire codebase for hardcoded version strings — a missed version in a window title or "About" dialog is a gate failure. The repository URL must also be present in manifests.

2. **Build Gate** — A test build must be created and verified working before anything is committed. Not "it compiled" — the app must start, the golden path must work, and no regressions should be visible.

3. **Security & Quality Gate** — This is where the biggest improvement happened. After every successful build, Claude Code runs a full scan of all source files against a detailed security checklist:
   - **Hard stops** (must fix): hardcoded secrets, SQL injection, `shell=True` with user input, disabled TLS, pickle on untrusted data, path traversal, missing auth, debug mode in production, weak crypto
   - **Quality review**: N+1 queries, god functions (>40 lines), deep nesting, wrong data structures, string concatenation in loops, unbounded caches, missing database indexes
   - The security scan also runs the project's native `npm audit` and checks every dependency for typosquatting, maintenance health, and known CVEs

4. **Docs Gate** — Changelog entries, README updates for new/changed/removed features, and stale documentation are all checked before release.

5. **Release & Ship Gates** — Branch protection is enforced (never commit directly to main), release notes must be reviewed and approved, and the final ship requires explicit human confirmation.

**How this made the image better:**

- **v1.5.3's security hardening** (path traversal, JWT expiry, XSS fixes) came directly from the security gate catching patterns in the existing codebase
- **v1.8.2's dependency patches** (ws memory disclosure, yaml stack overflow, express DoS) were surfaced by the mandatory `npm audit` step
- **v1.9.0's terminal shell allowlist** and **agent credential encryption** were security gate findings — Claude Code flagged that terminal commands accepted arbitrary shells and that agent passwords were stored in plaintext, then fixed both before the build could pass
- **Earlier releases without the gate system** shipped features that later had to be removed (the skopeo-based image update detection in v1.8.0) — the quality gate's complexity review would likely have flagged that design as too fragile before it shipped

The gate system means no commit happens without a security scan, no release ships without verified docs, and no push goes out without the maintainer explicitly typing "push." It turns Claude Code from a code generator into a disciplined release engineer.

### Community contributions cherry-picked into this fork

This fork stands on the work of the upstream project and its community. The following features were cherry-picked from open pull requests on [louislam/dockge](https://github.com/louislam/dockge) and integrated before Claude Code development began:

| Contributor | Feature | Upstream PR |
|-------------|---------|-------------|
| [Elias Floreteng](https://github.com/eliasfloreteng) | Compose override editor — edit `compose.override.yaml` alongside the main compose file | [#23](https://github.com/louislam/dockge/pull/23) |
| [Richy HBM](https://github.com/RichyHBM) | PUID/PGID support — set stack file/directory ownership | [#83](https://github.com/louislam/dockge/pull/83) |
| [Kevin (syko9000)](https://github.com/syko9000) | Global `.env` editor and usage in docker operations | [#387](https://github.com/louislam/dockge/pull/387) |
| [Julian (skl)](https://github.com/skl) | Agent friendly name — set/update display names for remote agents | [#414](https://github.com/louislam/dockge/pull/414) |
| [CampaniaGuy](https://github.com/CampaniaGuy) | Theme options — light/dark/auto theme selection in settings | [#575](https://github.com/louislam/dockge/pull/575) |
| [Niraj Yadav](https://github.com/nickkdev) | Remove terminal buffer console logging | [#582](https://github.com/louislam/dockge/pull/582) |
| [Lance Cain (mizady)](https://github.com/mizady) | Container control buttons — start/stop/restart individual containers | [#649](https://github.com/louislam/dockge/pull/649) |
| [Justin Wiebe](https://github.com/justwiebe) | Resource usage stats on the compose page (CPU, memory per container) | [#700](https://github.com/louislam/dockge/pull/700) |
| [Joshua Anderson (andersmmg)](https://github.com/andersmmg) | Replace textarea editor with CodeMirror (syntax highlighting, line numbers) | [#786](https://github.com/louislam/dockge/pull/786) |
| [Matthew McConnell (maca134)](https://github.com/maca134) | Improved stack list UI when using agents | [#800](https://github.com/louislam/dockge/pull/800) |
| [Dimariqe](https://github.com/Dimariqe) | Clipboard copy/paste support in the web terminal | [#822](https://github.com/louislam/dockge/pull/822) |
| [nullcat](https://github.com/nullcat) | Fix `isComposeExitClean` TypeError when compose is stopped | [#37](https://github.com/louislam/dockge/pull/37) |
| [Aymen Djellal](https://github.com/aymen-djellal) | Improve JSON parsing with error handling | [#25](https://github.com/louislam/dockge/pull/25) |
| [Grant Birkinbine](https://github.com/GrantBirki) | Update json-yaml-validate to latest version | [#446](https://github.com/louislam/dockge/pull/446) |

**REST API origin — [finder39/dockge](https://github.com/finder39/dockge):**
The REST API framework (v1.6.0) was ported from finder39's Dockge fork ("Dockge Managed"), which implemented the original API router, auto-update scheduler, image update detection via skopeo, and update history tracking. Claude Code adapted the code to work with this fork's architecture and added backward compatibility for mixed-version agent deployments.

**Base fork — [Chris Cooper (cmcooper1980)](https://github.com/cmcooper1980):**
This repository is forked from [cmcooper1980/dockge](https://github.com/cmcooper1980/dockge). Chris's fork contributed, among other work:
- Cloudflare Turnstile CAPTCHA integration on login
- "Update All" button for bulk stack updates
- v-html XSS vulnerability fixes and npm audit cleanup
- Variable highlighting in the CodeMirror editor
- Agent display logic improvements
- Compose override editor refinements (dynamic titles, component naming)

**Upstream — [Louis Lam (louislam)](https://github.com/louislam):**
Dockge itself is Louis Lam's project. This fork (by way of [Chris Cooper's fork](https://github.com/cmcooper1980/dockge)) is built on top of the [original Dockge](https://github.com/louislam/dockge) at v1.4.2, which includes the core compose manager, interactive terminal, multi-agent support, and the reactive real-time UI.
