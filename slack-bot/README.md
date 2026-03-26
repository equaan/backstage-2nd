# Slack → Backstage Bot

A Slack bot that lets engineers onboard clients and trigger Backstage templates through natural conversation — no browser needed.

```
Engineer: "onboard acme-corp on production AWS"
Bot: "Got it! Should I set up CI/CD as well?"
Engineer: "yes, and observability too"
Bot: "What's the GitHub repo URL?"
Engineer: "github.com?owner=equaan&repo=acme-corp-infra"
Bot: "Ready to trigger. Here's what I'll create: [summary]. Proceed?"
Engineer: "yes"
Bot: "✅ Done! PR opened: https://github.com/equaan/acme-corp-infra/pull/1"
```

---

## Architecture

```
Slack DM / mention
       ↓
  Slack Events API (HTTP POST to your server)
       ↓
  Bot server (Node.js — runs on your on-prem machine)
       ↓ ↑
  Groq / NVIDIA NIM (free AI — manages the conversation)
       ↓
  Backstage scaffolder API (POST /api/scaffolder/v2/tasks)
       ↓
  GitHub PR opened on client repo
```

---

## Step 1 — Get a free AI API key

**Option A: Groq (recommended)**
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (free, no credit card)
3. Create an API key
4. Use `AI_PROVIDER=groq` and `AI_MODEL=llama-3.3-70b-versatile`

Groq is rate-limited (not credit-limited) — you won't run out.

**Option B: NVIDIA NIM**
1. Go to [build.nvidia.com](https://build.nvidia.com)
2. Sign up (free, 1000 credits to start, no credit card)
3. Generate an API key from the settings page
4. Use `AI_PROVIDER=nvidia` and `AI_MODEL=meta/llama-3.3-70b-instruct`

---

## Step 2 — Create the Slack app

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. Name it "Opt IT Bot" and pick your workspace

**Set up OAuth & Permissions:**
- Under **Bot Token Scopes**, add:
  - `chat:write` (send messages)
  - `im:history` (read DMs)
  - `channels:history` (read channel messages where mentioned)
  - `app_mentions:read` (be notified when @mentioned)
  - `conversations.typing` (show typing indicator)
- Click **Install to Workspace** → copy the **Bot User OAuth Token** (`xoxb-...`)

**Get the signing secret:**
- Under **Basic Information** → **App Credentials** → copy **Signing Secret**

**Set up Events API:**
- Under **Event Subscriptions** → toggle **Enable Events** ON
- Set the **Request URL** to: `http://YOUR-SERVER-IP:3000/slack/events`
  - For local dev: use a Cloudflare Tunnel URL (see Step 5)
  - Slack will verify this URL — your bot must be running when you save
- Under **Subscribe to bot events**, add:
  - `message.im` (DMs to the bot)
  - `app_mention` (when someone @mentions the bot)

---

## Step 3 — Configure Backstage to accept API tokens

Your Backstage instance needs to allow external API calls. Add this to your `app-config.yaml`:

```yaml
backend:
  auth:
    externalAccess:
      - type: static
        options:
          token: your-secret-token-here   # pick any strong random string
          subject: slack-bot
```

Generate a strong token:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Restart Backstage after changing `app-config.yaml`.

---

## Step 4 — Set up the bot

```bash
# Clone / copy this folder to your server
cd slack-backstage-bot

# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.example .env
nano .env
```

Fill in `.env`:
```
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
AI_PROVIDER=groq
AI_API_KEY=gsk_...
AI_MODEL=llama-3.3-70b-versatile
BACKSTAGE_URL=http://localhost:7007        # or http://YOUR-SERVER-IP:7007
BACKSTAGE_TOKEN=your-secret-token-here    # must match app-config.yaml
GITHUB_ORG=equaan
```

---

## Step 5 — Expose the bot to Slack (for local dev)

Slack needs a public URL to send events to. For local development, use **Cloudflare Tunnel**:

```bash
# Install cloudflared (one time)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Start a tunnel to port 3000
cloudflared tunnel --url http://localhost:3000
```

It will give you a URL like `https://random-words-here.trycloudflare.com`.

Put that URL + `/slack/events` in the Slack Events API Request URL field:
```
https://random-words-here.trycloudflare.com/slack/events
```

For production on your on-prem server with a stable IP, you can just use the server's IP directly in Slack — no tunnel needed.

---

## Step 6 — Run the bot

```bash
# Development (auto-restarts on file changes)
npm run dev

# Production
npm start
```

You should see:
```
[Startup] ✅ Backstage is reachable
[Startup] ✅ Slack bot running on port 3000
[Startup] AI provider: groq
```

---

## Step 7 — Test it

1. In Slack, find the bot (search for "Opt IT Bot")
2. Send it a DM: `"onboard a new client"`
3. It will ask you questions one at a time
4. After you confirm, it triggers the Backstage template and posts the PR link

---

## Running as a systemd service (production)

So the bot keeps running after you close the terminal:

```bash
sudo nano /etc/systemd/system/slack-backstage-bot.service
```

```ini
[Unit]
Description=Slack Backstage Bot
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/slack-backstage-bot
EnvironmentFile=/home/YOUR_USERNAME/slack-backstage-bot/.env
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable slack-backstage-bot
sudo systemctl start slack-backstage-bot
sudo journalctl -u slack-backstage-bot -f   # watch logs
```

---

## Example conversation

```
You: hi
Bot: Hi! I can trigger Backstage templates for you. What do you need?
     Available: client-onboarding ⭐, aws-infrastructure, azure, gcp, cicd, observability, security, containers.

You: need to onboard acme-corp on production AWS
Bot: Got it — full client onboarding for acme-corp on prod/AWS.
     Should I also set up CI/CD pipelines?

You: yes
Bot: Observability stack (Prometheus + Grafana)?

You: yes
Bot: Security scanning (Trivy + OWASP)?

You: no
Bot: Containers (Dockerfile, K8s, Helm)?

You: no
Bot: What's the GitHub repo URL?
     Format: github.com?owner=ORG&repo=REPO-NAME

You: github.com?owner=equaan&repo=acme-corp-infra
Bot: Ready to go! Here's what I'll create:
     • Template: client-onboarding
     • Client: acme-corp | Environment: prod | Cloud: AWS
     • CI/CD: ✅ | Observability: ✅ | Security: ❌ | Containers: ❌
     • Repo: github.com?owner=equaan&repo=acme-corp-infra
     
     Shall I proceed?

You: yes
Bot: 🚀 Triggering template: client-onboarding...
     ⏳ Template running...
     ✅ Done! PR: https://github.com/equaan/acme-corp-infra/pull/1
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Missing SLACK_BOT_TOKEN" | Check your `.env` file exists and is filled in |
| Slack can't verify the URL | Make sure the bot is running and the URL is correct (include `/slack/events`) |
| "Backstage not reachable" | Check `BACKSTAGE_URL` in `.env` and that Backstage is running |
| 401 from Backstage | Check `BACKSTAGE_TOKEN` matches what's in `app-config.yaml` |
| Template not found | Template name must match exactly what's in your `catalog-info.yaml` |
| Bot doesn't reply | Check the bot has `chat:write` scope and is added to the channel |