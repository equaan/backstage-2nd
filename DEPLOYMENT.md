# Backstage On-Prem Deployment Guide

> Opt IT Technologies — Internal Developer Platform (Backstage v1.48.0)

This guide explains how to deploy and run Backstage on an on‑prem Linux server.

---

## Overview (Ports & URLs)

Backstage typically runs as:
- **Frontend** (React app): `http://<HOST>:3000`
- **Backend** (API): `http://<HOST>:7007`

In this repo/config:
- `app.listen.port` is **3000**
- `backend.listen.port` is **7007**

Make sure your firewall/security group allows inbound access as needed (see prerequisites).

---

## Prerequisites

### Server requirements
- Linux server with outbound internet access to GitHub (for catalog/templates), unless you host mirrors internally
- Open ports:
  - **3000/tcp** inbound (users access the UI)
  - **7007/tcp** inbound (UI calls backend; also used by API clients if any)

### Tooling
- Node.js **22 or 24** (enforced by `package.json`)
- Yarn (classic) installed globally
- Git

### Credentials
- GitHub Personal Access Token (PAT) with scopes:
  - `repo`, `workflow`, `read:org`, `read:user`

**Important:** Never commit tokens into config files or docs. Use environment variables (recommended) or a secrets manager.

---

## Clone & Install

```bash
git clone https://github.com/equaan/backstage-2nd.git
cd backstage-2nd

yarn install
```

---

## Configuration Files

Backstage reads configuration from (in priority order):
1. `app-config.local.yaml` (local overrides, **do not commit**)
2. `app-config.production.yaml` (production overrides)
3. `app-config.yaml` (base)

### 1) Update `app-config.yaml`

Replace `<HOST>` with your server DNS name or IP (example: `10.0.0.5` or `backstage.company.local`).

```yaml
app:
  title: Opt IT Developer Platform
  baseUrl: http://<HOST>:3000
  listen:
    port: 3000
    host: 0.0.0.0

organization:
  name: Opt IT Technologies

backend:
  baseUrl: http://<HOST>:7007
  listen:
    port: 7007
    host: 0.0.0.0

  # If you terminate TLS at a reverse proxy, you may want to tune CSP further.
  csp:
    connect-src: ["'self'", "http:", "https:"]
    default-src: ["'self'", "http:", "https:"]
    frame-ancestors: ["'self'", "http:"]
    frame-src: ["'self'", "http:"]
    upgrade-insecure-requests: false

  cors:
    origin: http://<HOST>:3000
    methods: [GET, HEAD, PATCH, POST, PUT, DELETE]
    credentials: true

  # Dev-friendly DB settings. For production, use file-based SQLite or PostgreSQL.
  database:
    client: better-sqlite3
    connection: ":memory:"

integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}

proxy: {}

techdocs:
  builder: local
  generator:
    runIn: docker
  publisher:
    type: local

auth:
  environment: development
  providers:
    guest:
      dangerouslyAllowOutsideDevelopment: true

scaffolder: {}

catalog:
  import:
    entityFilename: catalog-info.yaml
    pullRequestBranchName: backstage-integration
  rules:
    - allow: [Component, System, API, Resource, Location, Template, User, Group]
  locations:
    - type: url
      target: https://github.com/equaan/opt-it-catalog/blob/main/catalog-info.yaml
      rules:
        - allow: [Template]

kubernetes: {}

permission:
  enabled: false
```

**Notes:**
- `app.baseUrl` should point to the **frontend** (`:3000`).
- `backend.baseUrl` should point to the **backend** (`:7007`).
- `cors.origin` should match the **frontend** origin.

### 2) Update `app-config.production.yaml`

This file should only contain production overrides.

Replace:
- `<HOST>` with your server DNS/IP
- `<USER>` with the Linux username that runs Backstage

```yaml
app:
  baseUrl: http://<HOST>:3000

backend:
  baseUrl: http://<HOST>:7007
  listen:
    port: 7007
    host: 0.0.0.0

  database:
    client: better-sqlite3
    connection:
      directory: /home/<USER>/backstage-data

auth:
  providers:
    guest: {}

catalog:
  locations:
    - type: url
      target: https://github.com/equaan/opt-it-catalog/blob/main/catalog-info.yaml
      rules:
        - allow: [Template]
```

Create the data directory (for file-based SQLite in production):
```bash
mkdir -p ~/backstage-data
```

### 3) Create `app-config.local.yaml` (recommended)

Use this for secrets and machine-specific overrides. **Do not commit** this file.

```yaml
integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}
```

(Optional) Add it to `.gitignore` if not already ignored.

---

## Run (Foreground)

Export your GitHub token and start Backstage:

```bash
export GITHUB_TOKEN=ghp_your_token_here

# Production config (recommended when running on a server)
yarn start --config app-config.yaml --config app-config.production.yaml --config app-config.local.yaml
```

Then open:
- Frontend: `http://<HOST>:3000`

---

## Optional: Use PostgreSQL Instead of SQLite

### Step 1: Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib

sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### Step 2: Create DB + User
```bash
sudo -i -u postgres psql
```

Run in `psql`:
```sql
CREATE USER backstage WITH PASSWORD 'your_strong_password';
CREATE DATABASE backstage OWNER backstage;
GRANT ALL PRIVILEGES ON DATABASE backstage TO backstage;
ALTER USER backstage CREATEDB;
```

Exit:
```sql
\q
```

### Step 3: Set env var
```bash
export POSTGRES_PASSWORD='your_strong_password'
```

(Optional) Persist it:
```bash
echo "export POSTGRES_PASSWORD='your_strong_password'" >> ~/.bashrc
source ~/.bashrc
```

### Step 4: Update Backstage database config

Update your `backend.database` section (in `app-config.production.yaml` or `app-config.local.yaml`):

```yaml
backend:
  database:
    client: pg
    connection:
      host: localhost
      port: 5432
      user: backstage
      password: ${POSTGRES_PASSWORD}
      database: backstage
    pluginDivisionMode: database
```

### Step 5: Verify connectivity
```bash
psql -h localhost -U backstage -d backstage -W
# Enter password, then \q to quit
```

### Step 6: Start Backstage
```bash
export GITHUB_TOKEN=ghp_your_token_here
export POSTGRES_PASSWORD='your_strong_password'

yarn start --config app-config.yaml --config app-config.production.yaml --config app-config.local.yaml
```

---

## Run as a Service (systemd)

Create:
`/etc/systemd/system/backstage.service`

```ini
[Unit]
Description=Backstage IDP
After=network.target

[Service]
Type=simple
User=<USER>
WorkingDirectory=/home/<USER>/backstage-2nd

# Prefer an EnvironmentFile in production, but inline env vars work.
Environment=GITHUB_TOKEN=ghp_your_token_here
# Environment=POSTGRES_PASSWORD=your_strong_password

ExecStart=/usr/bin/yarn start --config app-config.yaml --config app-config.production.yaml --config app-config.local.yaml
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Reload + enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable backstage
sudo systemctl start backstage

sudo journalctl -u backstage -f
```

**Production tip:** Instead of hardcoding tokens in the unit, use:
- `EnvironmentFile=/etc/backstage/backstage.env` (owned by root, chmod 600)

---

## Key Notes

- **Template “client name” must not contain spaces** (Git branch names). Use `client-a`, not `client a`.
- Guest auth outside localhost requires:
  - `auth.environment: development`
  - `dangerouslyAllowOutsideDevelopment: true`
- If you see authorization-related errors in non-local deployments, keeping:
  - `permission.enabled: false`
  can help during early setup (revisit later for real RBAC).
- `:memory:` SQLite is **not persistent**. For real deployments use:
  - file-based SQLite (`directory: ...`) or PostgreSQL.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| White screen | Wrong `app.baseUrl` / `backend.baseUrl` / CORS origin | Ensure frontend is `:3000`, backend is `:7007`, and `cors.origin` is `http://<HOST>:3000` |
| 401 errors | Auth/permissions mismatch | Confirm guest auth settings and `permission.enabled: false` during setup |
| Templates not showing | Catalog not loaded yet | Wait ~60s, or re-import via `/catalog-import` |
| `Invalid ref name` on PR | Spaces in name | Use hyphens in template parameters |
| Can’t access port | Firewall/security group | Allow inbound 3000 and 7007 |
