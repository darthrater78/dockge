# Installing, upgrading and options

The quickstart and the one-line update are in the [README](../README.md#install). This page has the rest.

## Requirements

- [Docker](https://docs.docker.com/engine/install/) 20+ / Podman
- (Podman only) podman-docker (Debian: `apt install podman-docker`)
- OS:
  - Major Linux distros that can run Docker/Podman such as:
     - ✅ Ubuntu
     - ✅ Debian (Bullseye or newer)
     - ✅ Raspbian (Bullseye or newer)
     - ✅ CentOS
     - ✅ Fedora
     - ✅ ArchLinux
  - ❌ Debian/Raspbian Buster or lower is not supported
  - ❌ Windows (Will be supported later)
- Arch: armv7, arm64, amd64 (a.k.a x86_64)

## Other stacks folders or ports

To use a different stacks directory or port, generate a compose file with the [interactive generator](https://dockge.kuma.pet) or its URL, and save it in `/opt/docker/dockge`:

```bash
curl "https://dockge.kuma.pet/compose.yaml?port=5001&stacksPath=/opt/docker/stacks" --output compose.yaml
```

Then set its `image:` to `ghcr.io/darthrater78/dockge:2.4.2` (the generator uses the upstream image). To run Dockge as a regular user instead of root, add under `environment:` (both are needed):

```yaml
      - PUID=1000
      - PGID=1000
```

<a id="runtime"></a>

## Running as a regular user (PUID/PGID)

With `PUID` and `PGID` set (the quickstart uses `1000`), Dockge starts as root for a moment, then:

1. takes ownership of its own folders: `data/`, the stacks folder, each stack's folder and its `compose.yaml` / `compose.override.yaml` / `.env`. Your apps' data is never touched;
2. joins the group that owns `/var/run/docker.sock`, whatever its number is on your host;
3. switches to `PUID:PGID` with no Linux capabilities, and runs from there.

No `chown`, no `getent group docker`, no `group_add`. Before every Deploy, Start, Restart or Update, Dockge also creates the stack's missing bind-mount folders, owned by `PUID:PGID` with Docker's usual `0755`, so containers that run as `1000` can write to them. Without this, Docker creates them as `root` and you `chown` them by hand. It covers:

- `./relative` folders inside the stack,
- paths that use `${VARIABLES}` from the stack's `.env` or `global.env`.

It skips `~` paths, variables that aren't set, anything outside the stacks folder (such as `/opt/docker/<app>`), and paths that go through a symlink; Docker handles those as before. `.env` and `global.env` are saved readable by their owner only (`0600`).

| Your compose file | What happens |
|---|---|
| No `PUID`/`PGID`, no `user:` (installs before 2.4.0) | Runs as root, **exactly as before**. Nothing changes until you add `PUID`/`PGID` |
| `PUID`/`PGID` set | Starts as root, fixes ownership, switches to `PUID:PGID` (above) |
| `user: "1000:989"` (with or without `group_add`) | Kept as is: Dockge runs as that user from the start and can't change ownership. Bind-mount folders are still created, owned by that user |

**Already running Dockge?** See [Upgrading to 2.4.0](#upgrade): what changes if you only update the image, and how to move to this setup.

**Hardening in the quickstart:** a read-only container filesystem (scratch files go to an in-memory `/tmp`), `no-new-privileges`, and every capability dropped except the five the start-up step needs (`CHOWN`, `DAC_OVERRIDE`, `FOWNER`, `SETUID`, `SETGID`). Dockge itself runs with none.

**What it doesn't change:** access to `docker.sock` is root-equivalent on the host, whoever holds it. Running as a regular user keeps files out of root's hands, and keeps the web console from being a root shell, but it is not a sandbox. Keep Dockge off the internet: bind the port to a LAN address (`192.168.1.10:5001:5001`) or put it behind a VPN or a TLS reverse proxy, turn on 2FA, and leave the console off unless you need it.

**Private registries:** with `PUID`/`PGID`, logins are kept in `data/docker-config` (root can't share its `/root/.docker` with the new user). A `/root/.docker` mount from older instructions is copied there once on the first start.

<a id="bind-roots"></a>

### Installed with the 2.4.0 or 2.4.1 quickstart?

Those quickstarts mounted all of `/opt/docker` into Dockge and set `DOCKGE_BIND_ROOTS=/opt/docker`, so Dockge could create your apps' bind folders. That also let Dockge read and write every app's data, which it doesn't need. The quickstart now mounts only Dockge's data folder and the stacks folder, like upstream. To switch an existing install back, run this on the Docker host:

```bash
curl -fsSL https://raw.githubusercontent.com/darthrater78/dockge/master/extra/narrow-bind-root.sh -o narrow-bind-root.sh
less narrow-bind-root.sh     # read it first: it changes nothing until you answer y
bash narrow-bind-root.sh
```

It changes two lines of Dockge's `compose.yaml` (the `/opt/docker` volume becomes the stacks folder, `DOCKGE_BIND_ROOTS` is removed) and the quickstart comments that described them, then shows a diff and waits for `y`. Nothing moves: your stacks and app data stay where they are. Before asking, it checks that no stack reads files Dockge would no longer see (`env_file`, configs, build folders outside the stacks folder), and lists any. It backs up the compose file to `~/dockge-backup-<date>`, restarts only Dockge, and prints an undo command. `/opt/docker` stays owned by your user; `sudo chown root:root /opt/docker` gives it back to root if you want.

<a id="upgrade"></a>

## ⬆️ Upgrading to 2.4.0

### If you only change the image tag

The [one-line update](../README.md#update) changes only the image tag. What Dockge does then depends on what your compose file already has:

| Your compose file today | After updating only the image |
|---|---|
| No `PUID`/`PGID`, no `user:` (most installs) | **Runs as root, exactly as before.** You will notice three things: Save checks the file with `docker compose` first; missing `./` bind-mount folders are created before a stack starts (as root, as Docker did); `.env` and `global.env` become readable by their owner only (`0600`) the next time they are saved. If root owns them, read them on the host with `sudo` |
| `PUID`/`PGID` set. Before 2.4.0 these only set the owner of stack files, while Dockge itself ran as root | **Dockge now runs as that user.** On start it takes ownership of its data folder, the stacks folder and each stack's compose and `.env` files (not your apps' data), joins the group of `docker.sock`, and copies registry logins from a `/root/.docker` mount to `data/docker-config`. The web console runs as that user, not root. If `docker.sock` belongs to group `root` (some NAS and Docker Desktop setups), Dockge stays root and says so in its log |
| `user: "<uid>:<gid>"` (the old non-root workaround) | **Unchanged:** runs as that user. Bind-mount folders inside the stacks folder are now created as that user. If `PUID`/`PGID` are also set and differ, a warning appears after login |

In every case your login, settings and stacks are kept, and your stacks keep running while Dockge restarts. What an image update does **not** add: the read-only filesystem, `no-new-privileges` and the dropped capabilities. Those come from the compose file, below. Your stacks and app data stay where they are; nothing has to move.

### Moving to the recommended setup

**With the migration script** (any install started with `docker compose`). Run it on the Docker host, as your normal user:

```bash
curl -fsSL https://raw.githubusercontent.com/darthrater78/dockge/master/extra/migrate-to-puid.sh -o migrate-to-puid.sh
less migrate-to-puid.sh      # read it first: it is short and changes nothing until you answer y
bash migrate-to-puid.sh
```

It reads your running Dockge (compose file, port and IP, data and stacks folders, other settings such as `TZ` or Turnstile keys), then asks for `PUID`/`PGID` (your ids by default). Your stacks mount stays as it is. It then shows the new `compose.yaml` and a diff, and waits for `y`. Then it backs up the old file and the data folder to `~/dockge-backup-<date>`, switches, waits until Dockge answers, and prints the address and a ready-made undo command. It refuses, without changing anything, when the compose file has something it would lose: other services, custom networks, `env_file`, `${VARIABLE}` substitution or unknown settings. Use the steps below for those. The [one-line update](../README.md#update) keeps working afterwards.

**By hand:**

1. **Back up.** In the folder with Dockge's `compose.yaml`: `docker compose stop dockge`, then copy `compose.yaml` and Dockge's data folder (the one mounted at `/app/data`) somewhere safe.
2. **Edit `compose.yaml`**, keeping your own port and data folder:
   - remove `user:` and `group_add:` if you have them;
   - add `PUID` and `PGID` with your own ids (`id -u`, `id -g`). Use your own group, not the docker group: that one is found automatically;
   - keep your stacks mount and `DOCKGE_STACKS_DIR` as they are;
   - add `read_only`, `tmpfs`, `security_opt`, `cap_drop` and `cap_add` from the [quickstart compose file](../README.md#install);
   - set the image tag to the new version.
3. **Start it:** `docker compose up -d`. `docker compose logs dockge | grep entrypoint` should show `running as uid … gid … (groups …)`.
4. **To go back,** restore the saved `compose.yaml` and run `docker compose up -d`. The data folder doesn't need restoring: the files stay usable by the old setup.

<details>
<summary><b>Example: from <code>user: "1000:989"</code> (the old non-root workaround) to PUID/PGID</b></summary>

A common older setup keeps the compose file and Dockge's data in the same folder:

```yaml
    user: "1000:989"           # remove: Dockge switches user itself now
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /opt/docker/dockge:/app/data
      - /opt/docker/stacks:/opt/docker/stacks
```

Change it to this. The data folder stays where it is, so nothing has to move:

```yaml
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /opt/docker/dockge:/app/data
      - /opt/docker/stacks:/opt/docker/stacks
    environment:
      - PUID=1000                    # your `id -u`
      - PGID=1000                    # your `id -g` (not the docker group: that one is found automatically)
      - DOCKGE_STACKS_DIR=/opt/docker/stacks
    read_only: true
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add: [ CHOWN, DAC_OVERRIDE, FOWNER, SETUID, SETGID ]
```

Back up first (`docker compose stop dockge`, then copy `compose.yaml` and the data folder), then `docker compose up -d`. The log shows `[entrypoint] running as uid 1000 gid 1000 (groups 1000,989)`. Your stacks keep running while only Dockge restarts. To go back, restore the old `compose.yaml` and `docker compose up -d` again: the files stay usable by the old setup, so the data doesn't need restoring.

</details>

## Updating: other setups

### Compose file somewhere else?

The [one-line update](../README.md#update) assumes `/opt/docker/dockge/compose.yaml`. Ask Docker where it was started from, and use that path as `F`:

```bash
sudo docker ps -a \
  --format '{{.Names}}  →  {{.Label "com.docker.compose.project.config_files"}}' \
  | grep -i dockge
```

### Always on the newest release

Prefer not to pin? Use `ghcr.io/darthrater78/dockge:latest` in your compose file, then update with:

```bash
cd /opt/docker/dockge && docker compose pull && docker compose up -d
```

## Optional: Cloudflare Turnstile CAPTCHA

To require a CAPTCHA challenge on the login page, set both of the following environment variables on the Dockge container. If either is unset, CAPTCHA verification is skipped.

```
      - TURNSTILE_SITE_KEY=<your Turnstile site key>
      - TURNSTILE_SECRET_KEY=<your Turnstile secret key>
```

Keys can be created in the [Cloudflare dashboard](https://developers.cloudflare.com/turnstile/get-started/).

## Optional: Embedding Dockge in a dashboard

By default Dockge refuses to be shown inside an iframe on another site (`X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'`), because a page that frames it could trick you into clicking Docker actions. If you embed Dockge in a dashboard such as Home Assistant or Organizr, set:

```
      - DOCKGE_ALLOW_FRAMING=true
```

Only do this if Dockge is not reachable from untrusted networks.

## Optional: Home Assistant integration (HACS)

**[darthrater78/ha-dockge](https://github.com/darthrater78/ha-dockge)** is a custom Home Assistant integration that adds your Dockge stacks and containers to Home Assistant so you can watch and control them from there:

- A sensor for each container showing its state (running, exited, etc.), image and health
- Start, Stop, Restart and Down buttons for each stack
- `dockge.start_stack`, `dockge.stop_stack`, `dockge.restart_stack` and `dockge.system_prune` services for automations
- Support for multiple Dockge agents, each shown as its own device

**This fork is required.** The integration talks to Dockge through the [REST API](api.md), which the original Dockge does not have.

The integration is not in the default HACS store. Add it to HACS as a custom repository:

1. In Dockge, set an API key (`DOCKGE_API_KEY`, see [Authentication](api.md#authentication)).
2. In HACS, open the menu (three dots, top right) and choose **Custom repositories**. Add `https://github.com/darthrater78/ha-dockge` with category **Integration**.
3. Download **Dockge** in HACS and restart Home Assistant.
4. Go to **Settings > Devices & Services > Add Integration**, search for **Dockge**, and enter your Dockge URL (for example `http://192.168.1.100:5001`) and the API key.

Use an `https://` URL where you can: the API key is sent with every request. For a dashboard card, see [Dockge Card](https://github.com/darthrater78/dockge-card).
