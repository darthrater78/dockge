# Changelog

Release notes for this fork. Each version's section is also the text of its [GitHub release](https://github.com/darthrater78/dockge/releases).

## 2.4.2 (2026-10-31)

A dependency security update, plus a narrower quickstart. The server's dependencies now audit clean, and Dockge itself works as before: update the image tag (see [How to Update](https://github.com/darthrater78/dockge#update)).

**Changes**
- The migration script installs 2.4.2 by default; it still offered 2.4.0
- The quickstart `compose.yaml` mounts only Dockge's data folder and the stacks folder (`/opt/docker/stacks`), as upstream does. The wide `/opt/docker` mount with `DOCKGE_BIND_ROOTS` from the 2.4.0/2.4.1 quickstart is gone from the quickstart, the docs and the migration script. Existing installs are unchanged and nothing has to move; installs on the old quickstart can switch back with the new [`extra/narrow-bind-root.sh`](https://github.com/darthrater78/dockge#bind-roots)
- New README section: [Differences from upstream](https://github.com/darthrater78/dockge#upstream-differences), including what to expect when switching back

**Security**
- body-parser 2.3.0 → 2.4.0 (High): a denial of service from trailing bytes after a compressed request body. The JSON parser runs before the API-key check, so it was reachable without a key
- fast-uri 3.1.9, ip-address 10.7.5, qs 6.17.1 (Moderate)
- glob 14.0.3 and minimatch 11.0.3 through `overrides`, for the Moderate advisories in sqlite3, redbean-node and the lint tools
- Accepted: GHSA-83rm-6c8r-g728 (High) and GHSA-8rc2-428q-7ww3 (Low) in vue-i18n 10.0.8, and the 10.x line being out of support. Both advisories need `escapeParameter`, and the first also needs translations rendered with `v-html`; Dockge uses neither, and its translations are bundled with the app. Dockge stays on vue-i18n 10 until an advisory affects it

## 2.4.1 (2026-10-22)

A security update. The image now runs Node.js 22.23.4. Nothing else changes: update the image tag (see [How to Update](https://github.com/darthrater78/dockge#update)).

**Security**
- Node.js 22.x → 22.23.4 in the base image, for the October 21, 2026 Node.js security release: CVE-2026-111497 (High, Brotli decoder out-of-bounds write allowing remote code execution), CVE-2026-105482 (High, `dns.resolve` name truncation), CVE-2026-105483 and CVE-2026-106069 (High, TLS hostname verification bypasses), plus six Medium/Low fixes. Dockge uses TLS when it connects to remote agents
- Healthcheck binary rebuilt with Go 1.27.1 → 1.27.3: CVE-2026-111943 (High, `crypto/x509` certificate validation), CVE-2026-78667 and CVE-2026-97031 (High, denial of service in `net/http` and `crypto/tls`)
- Build tools only, not in the image: follow-redirects 1.16.0 → 1.16.1 (GHSA-q3jh-wrc6-jgq8, GHSA-8r9p-f939-6h3c, High) and vite 6.4.3 → 6.4.5
- Accepted until 2026-11-30: CVE-2026-78669 (High) in `golang.org/x/net` 0.58.0 inside the Docker Compose plugin, a denial of service from an HTTP/2 server flooding SETTINGS frames. No Compose release carries the fix (0.60.0) yet; the image scan re-checks it when the waiver expires

## 2.4.0 (2026-10-08)

Dockge can run as a regular user (`PUID`/`PGID`) and creates your stacks' bind-mount folders itself, so containers can write to them with no `chown` on the host. Installs without `PUID`/`PGID` keep running as root, as before.

2.3.2 was never published; its security fixes are part of this release.

**Added**
- **Runs as a regular user.** With `PUID`/`PGID` set, the container starts as root only to take ownership of Dockge's own folders (`data/`, the stacks folder, each stack folder and its compose and `.env` files, and the `DOCKGE_BIND_ROOTS` folders themselves, never your apps' data), join the group that owns `docker.sock`, and switch to `PUID:PGID` with no capabilities. No `chown`, docker group lookup or `group_add` on the host
- **Bind-mount folders without `chown`.** Before Deploy, Start, Restart, Update and the REST `up` actions, Dockge creates a stack's missing bind-mount folders, owned by its user (`0755`). It covers `./relative` paths, paths built from `${VARIABLES}` in `.env`/`global.env`, and absolute paths under `DOCKGE_BIND_ROOTS` or the stacks folder. Paths through a symlink, outside those roots or with unset variables are left to Docker. Folders it couldn't prepare are shown as a warning
- **Save checks the file with docker compose first.** An invalid compose file is rejected with compose's own message and the saved file stays as it was, instead of being written and failing later on Deploy and on every status refresh
- The quickstart asks which IP Dockge should listen on (your LAN IP is suggested; `all` listens everywhere), waits until Dockge answers and prints its address. It also creates `/opt/docker/stacks`, owned by you
- `extra/migrate-to-puid.sh`: moves an existing install to `PUID`/`PGID` and the hardened settings. It reads the running container, shows the new compose file and a diff before changing anything, backs up, and prints an undo command. It refuses setups it can't rewrite safely. See [Upgrading to 2.4.0](https://github.com/darthrater78/dockge#upgrade)
- `DOCKGE_BIND_ROOTS`: comma-separated folders (mounted at the same path) where absolute bind-mount folders may be created
- Permission problems (a stacks folder Dockge can't write, a bad `PUID`/`PGID`, `PUID` that doesn't match `user:`) are shown after login instead of only in the log, and permission errors on save name the folder and what to do

**Changed**
- Quickstart `compose.yaml`: `PUID=1000`/`PGID=1000`, `/opt/docker` mounted for stacks and bind folders, read-only container filesystem, `no-new-privileges`, all capabilities dropped except the five the start-up step needs
- `.env` and `global.env` are written `0600` (owner only), including existing files the next time they are saved
- App files in the image are owned by root, so the user Dockge runs as can't modify them; npm, npx and corepack are removed from the image (Dockge doesn't use them), and Debian security updates are applied at build time
- `${VAR}` substitution in the compose preview now follows docker compose exactly (`$VAR`, `${VAR:-default}` on an empty value, `$$`), replacing `@inventage/envsubst`
- With `PUID`/`PGID`, registry logins live in `data/docker-config`; an existing `/root/.docker` mount is copied there once

**Fixed**
- Stack names are checked where every stack path is built, so a name such as `../x` sent to Save, Deploy or the port check can no longer make Dockge look outside the stacks folder before the name is validated. The REST API also ignores an `endpoint` query parameter that isn't a single value. Both were found by the new CodeQL scan; a login or API key was needed
- A missing or mistyped top-level `services:` (for example `ervices:`) was silently "repaired" by the editor, which appended `services: {}` and let the broken file be saved and deployed. It is now shown as an error, and Save/Deploy check the YAML that is in the editor at that moment
- A stack whose compose file docker rejects logged a full stack trace every few seconds while its page or the stack list was open. It is now logged once per error, and again only when the error changes or the stack recovers
- The status of a stack that isn't in Dockge's stacks folder (for example one started by another Dockge on the same host) failed with `ENOENT`
- A stacks folder that couldn't be created or written stopped Dockge at start; it now starts and warns

**Compatibility** (details: [Upgrading to 2.4.0](https://github.com/darthrater78/dockge#upgrade))
- No `PUID`/`PGID` and no `user:`: runs as root exactly as before. The one-line updater changes only the image tag, so updating doesn't switch an install to the new mode
- **`PUID`/`PGID` already set: behaviour change.** Before 2.4.0 they only set the owner of stack files; now Dockge itself switches to that user (data and stack files are re-owned on start, registry logins are copied, and the web console is no longer a root shell). Remove both to keep running as root
- `user: "<uid>:<gid>"` keeps working; Dockge can't change ownership in that mode, and now warns instead of failing a save when `PUID`/`PGID` differ from it

**Security**
- engine.io 6.6.9 → 6.6.11 (CVE-2026-102599, High): a client could open a session and then upgrade it to WebSocket with a different or missing `EIO` protocol version, and a crafted heartbeat then crashed the server process. No login was needed. Upgrades must now match the session's protocol version
- fast-uri 3.1.6 → 3.1.8 (CVE-2026-84292 High, CVE-2026-84394 High, CVE-2026-86472 Medium): URI authority injection and host confusion
- ip-address 10.5.0 → 10.7.2 (CVE-2026-101910, Medium): the NAT64 local-use range wasn't recognized, which could let a check for private addresses be bypassed
- brace-expansion 2.1.4 → 2.1.7 (CVE-2026-102276 High, CVE-2026-102278 High, CVE-2026-102277 Medium): crafted brace patterns could exhaust the stack or CPU
- Build tools only, not in the image: brace-expansion 1.1.21 (the same three CVEs) and joi 17.13.8 (GHSA-6h2x-m376-mqjq)
- proxy-addr 2.0.7 → 2.0.8 (CVE-2026-90711, Critical); tsx 4.19 → 4.23 (its esbuild was built with a Go runtime carrying 22 Critical/High CVEs); vue 3.5.43 (GHSA-g2v6-rqmx-r4w6, High); sass 1.105 (build tool only)
- Image scan (Trivy): no known vulnerabilities at any severity, down from 6 Critical and 41 High in the v2.3.1 image

**CI and tooling**
- Images are pushed by digest, scanned with Trivy on amd64, arm64 and armv7 (`trivy.yaml`), and only then tagged: a fixable Critical/High means no version tag is published. Reviewed exceptions go in `.trivyignore.yaml`, each with a reason and an expiry. The base-image workflow works the same way
- Each released image carries signed build provenance (`gh attestation verify oci://ghcr.io/darthrater78/dockge:<version> --repo darthrater78/dockge`)
- The release workflow creates the GitHub release from this Version History section; `-dev`/`-beta`/`-rc` tags become pre-releases
- New checks: dependency review on pull requests (fails on a new High/Critical advisory) and CodeQL for the TypeScript
- CI skips its build for docs-only changes but still reports a passing run, so a docs-only commit can be released
- The Dockerfile pins its own base images by digest
- ESLint 10 with a flat config (`eslint.config.mjs`), typescript-eslint 8, eslint-plugin-vue 10, unplugin-vue-components 32: `npm audit` reports 0 vulnerabilities, build tools included

## 2.3.1 (2026-09-25)

**Added**
- Save and Deploy check the stack's host ports first. If another stack on the same agent publishes one (running or not), or a running container does (including stacks not managed by Dockge and plain `docker run` containers), a dialog lists each port and who uses it, with **Save anyway** / **Deploy anyway**. Agents older than 2.3.1 don't answer the check; after 5 seconds the save goes ahead as before

**Fixed**
- Port conflicts were missed when the port came from a variable: `${VAR}`, `${VAR:-default}` and `$VAR` are now filled in from `global.env` and the stack's `.env`, the same way docker compose does
- Ports declared in `compose.override.yaml` were ignored
- Port ranges (`8000-8010:8000-8010`) were compared as text, so an overlap with `8005` went unnoticed; ranges are now matched port by port, and a conflict inside a range is shown as that range
- A port with no host side (`- "3000"`, which gets a random host port) no longer counts as a conflict
- IPv6 host bindings (`[::1]:8080:80`) show the right host port

## 2.3.0 (2026-09-25)

**Changed**
- Mobile layout redesigned around finding a stack, editing it and acting on it; the bottom navigation bar is gone
  - Home is the stack list: search (name, agent or port), status filter chips with counts, one card per stack; with several agents, a collapsible section per agent (collapsed until opened or searched)
  - Stack page: back / name / status bar with a ⋮ menu (Update, Compose Drift Check, Down, Delete), Overview / Compose / Logs tabs, and a bottom action bar (Start or Restart, Stop, Update, Edit; Deploy, Save, Discard while editing). Actions switch to the Logs tab to show their output
  - Menu sheet (☰) for Stacks, Overview, Compose Drift Check, Console, Settings, Scan Stacks Folder and Logout
  - Compose Drift Check button next to the search box; its results are cards (stack / service, compose vs running image, Sync) on phones and whenever the panel is too narrow for the table
- Desktop: the stack list pane can be dragged wider or narrower (arrow keys on the handle; double-click resets); the width is remembered

**Added**
- Port conflict banner above the stack list naming each conflicting port and the stacks that publish it; "Port conflicts" filter on mobile
- `v<x.y.z>-dev.<n>` tags may be released from a feature branch and publish `:dev` + the version tag; stable tags remain default-branch only
- README: "What's new" section at the top with screenshots and GIFs of the mobile layout, desktop resizing and Compose Drift Check (`docs/images/`, kept out of the Docker image)
- Compose quickstart (README and `compose.yaml`) pins the image to the release (`:2.3.0`) instead of `:latest`; "How to Update" explains both

**Fixed**
- A conflicting port past the third one was hidden behind the "+N" badge; conflicting ports now sort first and the badge turns red when it hides one
- Duplicate host ports (e.g. `6881/tcp` and `6881/udp`) are shown once in the stack list
- Desktop stack list shows as many port badges as fit the pane width (was a fixed three)
- "Scan All" in Compose Drift Check timed out on hosts with more than a handful of containers: every stack re-ran `docker ps` plus two `docker inspect` calls per container. A scan now makes three docker calls in total

## 2.2.0 (2026-09-23)

**Added**
- Expandable terminal: every terminal panel (stack logs, console, container shell) has a drag handle (mouse, touch or arrow keys) and a full-screen toggle (Esc to restore); each page remembers its height
- Compact header on mobile; stack action buttons wrap into even rows on narrow screens
- `DOCKGE_ALLOW_FRAMING=true` to allow embedding Dockge in dashboards (see "Embedding Dockge in a dashboard")

**Fixed**
- Terminals no longer hide their newest lines below the panel: xterm measured its cells before the JetBrains Mono web font loaded and never re-measured
- The server-side pty now follows the panel size (it stayed at its initial size, so full-screen programs drew at the wrong size)
- REST API stack actions (`start`/`stop`/`restart`/`update`/`down`) now apply `global.env`, the stack `.env` and `compose.override.yaml`, the same as the UI
- The "expand" icon on the stack page was never registered and rendered blank
- The update-available link pointed at v2.1.0 instead of the latest release
- A failed Docker build in the release could be reported as success (`env2arg.js` ignored the exit code)

**Security**
- Anti-framing headers (`X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'`), `nosniff`, `Referrer-Policy`; `X-Powered-By` removed
- Release workflow: default-branch check also applies to manual runs, the tag must match `package.json`, and CI must have passed for the tagged commit
- Terminal resize requests, API paging and `POST /api/agents` input are validated; first-run setup can no longer race into two admin accounts
- Healthcheck built with Go 1.27.1 (was 1.21.4); base images pinned by digest and watched by Dependabot
- Security reports now go to this fork's private vulnerability reporting
- `@xterm/xterm` pinned to stable 6.0.0 (was the floating `beta` tag)
- `.claude/` and `.github/` excluded from the Docker build context (the image was shipping this repo's internal gate-state file)

**CI**
- Duplicate "CI Dev" workflow merged into CI; added actionlint workflow for workflow files


## 1.9.2

**Changed**
- Docker image references migrated from upstream `louislam/dockge` to fork GHCR registry `ghcr.io/darthrater78/dockge`
- Error reporting URL updated to fork repository
- New `docker-base.yml` workflow for building base and healthcheck images independently

**Security**
- Bumped `mysql2` ~3.12.0 → ~3.23.1 (2 CVEs fixed)
- Bumped `vite` ~5.4.15 → ~6.4.3 (3 CVEs fixed + transitive clears)
- Removed unused `@actions/github` devDependency (12 transitive undici vulnerabilities cleared)
- Reduced Dependabot alerts from 32 → 14

**Fixed**
- `package.json` indentation for `@codemirror/lang-python` entry
- Removed duplicate `build:docker-ghcr` script

## 1.9.1

**Restored**
- Update button — pull images and restart stack via compose (accidentally removed in 1.8.0 alongside the skopeo-based image update detection)
- `POST /api/stacks/:name/update` API endpoint

**Fixed**
- About page release link now points to the fork repository

## 1.9.0

**Added**
- Two-Factor Authentication (TOTP) — full backend implementation for setup, verification, enable/disable flows that were previously non-functional
- `.env` file persistence — stack save now writes the `.env` file when the user provides environment content
- Agent credential encryption — passwords stored at rest are encrypted with AES-256-GCM, keyed from the JWT secret
- One-time database migration to encrypt existing plaintext agent passwords

**Fixed**
- `callbackError` now correctly distinguishes `ValidationError` from generic `Error` (subclass check order was inverted)
- Removed stray `console.log` in `getComposeOptions`
- SSL passphrase no longer logged in debug config output

**Security**
- Interactive terminal shell restricted to allowlist (`bash`, `sh`, `ash`, `zsh`)
- Socket handler `updateAgent` params validated as `unknown` before use
- Removed dead `needRehashPassword` function

**Known issue**
- `UPTIME_KUMA_WS_ORIGIN_CHECK=bypass` disables WebSocket origin validation entirely — if you use this env var for reverse proxy compatibility, be aware it removes CSRF protection. A safer allowlist-based alternative is planned for a future release.

## 1.8.2

Security patch — updated production dependencies to fix known vulnerabilities:

- `ws` 8.17.1 → 8.21.3 (HIGH) — memory disclosure; memory-exhaustion DoS from tiny fragments
- `yaml` 2.3.4 → 2.9.0 (MODERATE) — stack overflow via deeply nested YAML collections
- `express` 4.21.2 → 4.22.2 — body-parser DoS when an invalid limit silently disables size enforcement; path-to-regexp ReDoS via multiple route parameters; qs arrayLimit bypass allowing DoS via memory exhaustion

## 1.8.1

**Fixed**
- Dark mode drift check panel — Bootstrap CSS custom properties were overriding inherited colors, making table text nearly invisible
- Scan hanging forever when an agent is offline — added 30s per-agent timeout

**Changed**
- Moved "Sync All" button to top of drift check panel, disabled until scan completes

## 1.8.0

**Removed**
- Image update detection feature (skopeo-based registry digest comparison)
- Auto-update scheduler (cron-based), per-stack auto-update toggle, and "Update All" button
- `skopeo` from Docker image dependencies
- All update-related API endpoints (`/api/stacks/:name/check-updates`, `/api/update-all`, `/api/scheduler`, `/api/update-history`); the basic `/api/stacks/:name/update` endpoint was restored in v1.9.1
- Settings UI for update defaults and scheduler configuration

**Changed**
- Renamed "Version Sync" to "Compose Drift Check" across the UI
- Replaced "Update All" sidebar button with "Compose Drift Check" link
- Simplified Settings page to API key management only

**Fixed**
- Dark mode styling for drift check panel (table text visibility, code element contrast)

## 1.7.1
- Global Version Sync — Scan All button on the Home page detects image tag drift across every stack on every connected agent in one click
- Per-row Sync buttons and Sync All to update compose files to match running containers
- Version Sync API endpoint documentation and examples added to README
- Agent compatibility requirements documented (all instances need v1.7.0+)

## 1.7.0
- Compose Version Sync: detect and fix image tag drift between running containers and compose files
- Scan for mismatches caused by external update tools (WUD, Watchtower)
- One-click sync to update compose files, preserving YAML comments
- Sync history with revert capability
- REST API endpoints at `/api/version-sync/`
- Multi-host support via Dockge agent socket handlers

## 1.6.3
- Fixed `GET /api/stacks` returning empty `services` — container state, status, health, and image info are now included per stack
- Enables HA integration container sensors to display per-container running state

## 1.6.2
- Added `POST /api/stacks/:name/down` endpoint — stop and remove containers (make stack inactive)
- Completes the stack lifecycle API: start, stop, restart, down

## 1.6.1
- Added Settings UI for update defaults (prune toggles), auto-update scheduler (enable/cron), and API key management
- Added per-stack auto-update toggle in the Compose view
- Added `setApiKey` socket handler for setting API keys from the UI
- Fixed misleading API key storage description in settings

## 1.6.0

**REST API**
- 13 endpoints for managing stacks programmatically
- Static API key authentication via `X-API-Key` header
- Stack name validation prevents path traversal
- Update history tracking with pagination and filtering

**Auto-Update Scheduler**
- Cron-based scheduled updates with per-stack opt-in
- Configurable image pruning after updates
- Self-update detection via sidecar container
- Image update detection using skopeo

**Agent Backward Compatibility**
- Version-gated degradation for pre-1.6.0 agents
- Mixed-version deployments work without breaking satellite nodes

**Infrastructure**
- Added skopeo to Docker image
- Knex migration for `stack_setting` and `update_history` tables

## 1.5.3

Security hardening:
- **Path traversal fix** — stack names are now validated in `Stack.getStack()` before any filesystem or Docker operation, preventing directory escape via crafted names
- **JWT expiry** — tokens now expire after 30 days (previously never expired)
- **Password model fix** — `resetPassword` no longer leaves the plaintext password on the user instance after updating
- **XSS fix** — compose `x-dockge.urls` only renders `http:`/`https:` links; `javascript:` and other dangerous protocols are dropped
- **Nightly workflow fix** — retargeted to `ghcr.io/darthrater78/dockge`, uses `GITHUB_TOKEN` instead of a custom PAT

## 1.5.2
- Fixed: adding a new Dockge Agent failed with `SQLITE_ERROR: table agent has no column named name` on any pre-existing install. The original `agent` table migration was edited in place to add a `name` column instead of shipping a follow-up migration, so databases that had already applied the old migration never picked up the column. A new idempotent migration backfills it.

## 1.5.1

**Fixes**
- Fixed Update All button crash (undefined `sortedStackList`/`processing`)
- Fixed post-setup login callback swallowed by missing `captchaToken` argument
- Fixed potential crash on malformed login payload when Turnstile is enabled
- Fixed Turnstile script load failure permanently blocking login with no fallback
- Fixed duplicate Turnstile widgets on repeated Login component mounts
- Fixed broken i18n lookup on the stack update toast message

**Chores**
- Replaced `console.*` logging in Turnstile verification with the project's log module
- Documented Compose Override, Turnstile CAPTCHA, and Update All features in README, including `TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` env vars
