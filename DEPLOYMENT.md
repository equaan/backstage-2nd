# Backstage On-Premise Deployment Guide

> Opt IT Technologies Internal Developer Platform — Backstage v1.48.0

---

## Prerequisites

- Node.js **22 or 24** (enforced in `package.json`)
- Yarn (globally installed)
- Git
- GitHub PAT with scopes: `repo`, `workflow`, `read:org`, `read:user`
- Port **7007** open on the server

---

## Setup

```bash
# Clone
git clone https://github.com/equaan/backstage-2nd.git
cd backstage-2nd

# Install
yarn install

# Set GitHub token
export GITHUB_TOKEN=ghp_your_token_here

# Start
yarn dev
```

App runs at `http://YOUR_SERVER_IP:7007`

---

## Config Changes Required

Two files need updating before deployment — replace `YOUR_SERVER_IP` in both.

### `app-config.yaml`

```yaml
app:
  title: Opt IT Developer Platform
  baseUrl: http://YOUR_SERVER_IP:7007

organization:
  name: Opt IT Technologies

backend:
  baseUrl: http://YOUR_SERVER_IP:7007
  listen:
    port: 7007
  csp:
    connect-src: ["'self'", 'http:', 'https:']
    upgrade-insecure-requests: false
    default-src: ["'self'", 'http:', 'https:']
    frame-ancestors: ["'self'", 'http:']
    frame-src: ["'self'", 'http:']
  cors:
    origin: http://YOUR_SERVER_IP:7007
    methods: [GET, HEAD, PATCH, POST, PUT, DELETE]
    credentials: true
  database:
    client: better-sqlite3
    connection: ':memory:'

integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}

proxy: {}

techdocs:
  builder: 'local'
  generator:
    runIn: 'docker'
  publisher:
    type: 'local'

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

### `app-config.production.yaml`

```yaml
app:
  baseUrl: http://YOUR_SERVER_IP:7007

backend:
  baseUrl: http://YOUR_SERVER_IP:7007
  listen: ':7007'
  database:
    client: better-sqlite3
    connection:
      directory: /home/YOUR_USERNAME/backstage-data

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

Create the data directory:
```bash
mkdir -p ~/backstage-data
```

---

## Running as a Service (systemd)

```ini
# /etc/systemd/system/backstage.service
[Unit]
Description=Backstage IDP
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/backstage-2nd
Environment=GITHUB_TOKEN=ghp_your_token_here
ExecStart=/usr/bin/yarn dev
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable backstage
sudo systemctl start backstage
sudo journalctl -u backstage -f
```

---

## Key Notes

- **Client names in templates must not contain spaces** — use `client-A` not `client A`. Spaces break Git ref names.
- `auth.environment: development` + `dangerouslyAllowOutsideDevelopment: true` is required for guest login to work outside localhost.
- `permission.enabled: false` avoids 401 errors in non-localhost deployments.
- Local `file:` catalog locations from `app-config.yaml` are intentionally removed — they don't exist inside a deployed context.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| White screen | `baseUrl` or `cors.origin` still points to `localhost` |
| 401 errors | Check `auth` config and `permission.enabled: false` |
| Templates not showing | Wait 60s for catalog to load from GitHub, or re-register at `/catalog-import` |
| `Invalid ref name` on PR | Client name has spaces — use hyphens |
| Port not accessible | Open port 7007 in firewall / security group |