# Security Policy

## Reporting a Vulnerability

Please report security issues privately through GitHub's private vulnerability reporting:
https://github.com/darthrater78/dockge/security/advisories/new

Do not open a public issue or discuss it in public before a fix is released.

If the issue also affects the original project, please report it to the upstream maintainers as well:
https://github.com/louislam/dockge/security/advisories/new

## Supported Versions

Only the latest release of this fork receives security fixes.

## Security architecture

What follows describes how this fork handles security, so it can be checked against the code. Newest changes are listed at the end.

### Design

- **What Dockge can do.** It mounts `/var/run/docker.sock`, which is root-equivalent on the host: anyone who logs in to Dockge, or holds its API key, can run any container with any mount. Treat a Dockge login like root on the Docker host.
- **Login.** One user account: bcrypt password hash; JWT session tokens valid 30 days, signed with a random secret generated on first start; optional TOTP 2FA and optional Cloudflare Turnstile CAPTCHA. Login attempts are limited to 20 a minute and 2FA attempts to 30 a minute, counted across all clients, not per client.
- **REST API.** Off until an API key is generated in Settings or set with `DOCKGE_API_KEY`. Requests send it in `X-API-Key`; it is compared in constant time. Stack names are validated where every stack path is built.
- **Web console.** The host shell console is off unless `DOCKGE_ENABLE_CONSOLE=true`.
- **Process.** With `PUID`/`PGID` the container starts as root only to fix ownership of Dockge's own folders and join the docker.sock group, then runs as that user. App files in the image are root-owned. The quickstart adds a read-only root filesystem, `no-new-privileges` and drops all capabilities. The quickstart mounts only Dockge's data folder and the stacks folder; a wider bind-root mount (`DOCKGE_BIND_ROOTS`), which gives Dockge access to the apps' data in that folder, is opt-in.
- **Stored data** (`data/`, SQLite `dockge.db`, or MySQL/MariaDB when configured):
  - Password: bcrypt hash. JWT secret: plaintext in the database.
  - Remote agent passwords: AES-256-GCM. The key is the JWT secret, stored in the same database, so this protects a copy of the agent table on its own, not a copy of the whole database.
  - API key: plaintext in the database (Settings shows it again).
  - Registry logins (with `PUID`/`PGID`): plaintext `data/docker-config`, as the Docker CLI stores them.
  - Stack `.env` and `global.env`: written `0600`.
  - Nothing is encrypted at rest beyond the agent passwords. Protect `data/` and its backups like a credential store.
- **Network.** The web UI and socket.io on port 5001, plain HTTP. Put it behind an HTTPS reverse proxy for anything beyond a trusted LAN. Agent connections use the URL you enter (`https://` for TLS).
- **Releases.** Images are published only from `v*` tags on `master` whose version matches `package.json` and whose commit passed CI. They are pushed by digest, scanned with Trivy on amd64, arm64 and armv7 (no fixable Critical/High, apart from dated waivers in `.trivyignore.yaml`), then tagged, and carry signed build provenance. Base images are pinned by digest; all GitHub Actions are pinned to commit SHAs; Dependabot, dependency review and CodeQL run on pull requests.

### Changes

- 2026-10-31 (unreleased): the quickstart and the migration script no longer mount `/opt/docker` or set `DOCKGE_BIND_ROOTS` by default; Dockge sees only its data folder and the stacks folder, as upstream. The wider mount is opt-in, with its trade-off documented.
- 2026-10-22 (v2.4.1): base image moved to Node.js 22.23.4 for the October 2026 Node.js security release (Brotli decoder RCE, TLS hostname bypasses).
- 2026-10-22 (v2.4.1): healthcheck binary rebuilt with Go 1.27.3 (CVE-2026-111943, CVE-2026-78667, CVE-2026-97031).
- 2026-10-22 (v2.4.1, risk accepted until 2.5.0): the API key and the session-signing secret are stored in plaintext in the database, and the agent-password key is that same secret. Accepted because `data/` is only readable on the Docker host; a fix (storing a hash of the API key, a separate key for agent passwords) is planned for 2.5.0.
- 2026-10-22 (v2.4.1, risk accepted until 2026-11-30): CVE-2026-78669 in the Docker Compose plugin's `golang.org/x/net`; no fixed Compose release yet.
- 2026-10-08 (v2.4.0): runs as a regular user with `PUID`/`PGID`; `.env` files `0600`; stack-name checks where paths are built (CodeQL path-injection fixes); image scan gate and build provenance; image went from 6 Critical / 41 High to 0. Details in the README's 2.4.0 notes.
