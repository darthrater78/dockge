# REST API

*The API framework is ported from [finder39/dockge](https://github.com/finder39/dockge) ("Dockge Managed"), which wrote the original API router, auto-update scheduler and update history; it was adapted to this fork's architecture in v1.6.0.*

Dockge v1.6.0 introduces a REST API for managing stacks programmatically. The API runs on the master node only — agents do not need any changes and continue to communicate via Socket.IO.

## Authentication

All API endpoints require a static API key passed in the `X-API-Key` header.

Set your API key via environment variable:
```
      - DOCKGE_API_KEY=your-secret-api-key-here
```

Or set it at runtime through the UI/socket settings. The key is stored as a SHA-256 hash.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/stacks` | List all stacks (local and remote agents) |
| `GET` | `/api/stacks/:name` | Get details for a single stack |
| `POST` | `/api/stacks/:name/start` | Start a stack |
| `POST` | `/api/stacks/:name/stop` | Stop a stack |
| `POST` | `/api/stacks/:name/restart` | Restart a stack |
| `POST` | `/api/stacks/:name/update` | Pull images and restart a stack |
| `POST` | `/api/stacks/:name/down` | Tear down a stack |
| `GET` | `/api/version-sync/scan` | Scan for image tag mismatches between compose files and running containers |
| `POST` | `/api/version-sync/sync` | Sync a specific service's compose image to the running version |
| `POST` | `/api/version-sync/sync-all` | Sync all mismatched services for a stack |
| `GET` | `/api/version-sync/history` | Query version sync history with pagination |
| `POST` | `/api/version-sync/revert` | Revert a previous version sync |

## Query Parameters

**`GET /api/stacks`** and **`GET /api/stacks/:name`** accept:
- `?endpoint=hostname:port` — target a specific remote agent

**`GET /api/version-sync/scan`** accepts:
- `?stackName=mystack` — scan a specific stack (omit to scan all)
- `?endpoint=hostname:port` — target a specific remote agent

**`POST /api/version-sync/sync`** accepts JSON body:
- `stackName` (string, required) — stack to sync
- `service` (string, required) — service name within the stack
- `newImage` (string, required) — image tag to write into the compose file

**`POST /api/version-sync/sync-all`** accepts JSON body:
- `stackName` (string, required) — stack to sync all mismatches for

**`GET /api/version-sync/history`** accepts:
- `?page=1&limit=20` — pagination
- `?stackName=mystack` — filter by stack name
- `?service=myservice` — filter by service name

**`POST /api/version-sync/revert`** accepts JSON body:
- `stackName` (string, required) — stack containing the service to revert
- `service` (string, required) — service to revert to its previous image

## Example

```bash
# List all stacks
curl -H "X-API-Key: your-key" http://localhost:5001/api/stacks

# Scan all stacks for compose/running image mismatches
curl -H "X-API-Key: your-key" http://localhost:5001/api/version-sync/scan

# Scan a specific stack
curl -H "X-API-Key: your-key" "http://localhost:5001/api/version-sync/scan?stackName=myapp"

# Sync a service to its running image
curl -X POST -H "X-API-Key: your-key" -H "Content-Type: application/json" \
  -d '{"stackName":"myapp","service":"web","newImage":"nginx:1.27"}' \
  http://localhost:5001/api/version-sync/sync

# Revert a previous sync
curl -X POST -H "X-API-Key: your-key" -H "Content-Type: application/json" \
  -d '{"stackName":"myapp","service":"web"}' \
  http://localhost:5001/api/version-sync/revert
```

## Agent Compatibility

The API communicates with remote agents via Socket.IO. Agents running pre-1.6.0 versions are supported with graceful degradation:
- Stack listing falls back to legacy call signatures
- Unsupported agents are listed in the response so you know which nodes need upgrading

**Compose Drift Check requires v1.7.0 on all instances.** The master Dockge and every agent must run v1.7.0 or later for Compose Drift Check to work. The scan and sync commands are registered as new socket events (`scanVersionSync`, `syncVersion`, `syncAllVersions`, `revertVersionSync`) — agents running older versions will not respond to these events. The global scan on the Home page (on phones: ☰ → Compose Drift Check, or the button beside the stack search) only contacts agents that are online; offline or pre-1.7.0 agents are skipped with a warning.

**Save/Deploy port check (v2.3.1):** a web UI check (the REST API deploys without it). It runs on the agent that owns the stack (new socket event `checkPortConflicts`). An agent older than 2.3.1 does not answer it, so the save goes ahead after 5 seconds without a warning.

**Agent credential encryption (v1.9.0):** Agent passwords are now encrypted at rest using AES-256-GCM. A one-time migration encrypts existing plaintext passwords on first startup. Remote agents do not need updating — the wire protocol is unchanged. However, rolling back the primary to a pre-1.9.0 version after migration will break agent authentication; back up the SQLite database before upgrading.

Back to the [README](../README.md).
