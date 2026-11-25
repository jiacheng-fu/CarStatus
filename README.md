# CarStatus

Your car's status (odometer, fuel, battery) from the command line or a small
local dashboard, through the official [Smartcar](https://smartcar.com) API.

> BMW blocked unofficial API access on 2025-09-29, so this uses Smartcar, a
> sanctioned third-party API (free developer plan: 1 connected vehicle, 3
> simulated ones).

It talks to **Smartcar API v3 over plain HTTP** (Node 18+, no SDK). Smartcar's
Node SDK and its v2.0 API, which this project first used, are deprecated on
2026-12-01, and new Smartcar apps only get v3 credentials.

## Setup

1. **Create a Smartcar app** at <https://dashboard.smartcar.com> (free plan).
   - *Configuration › Application details*: copy the **Application ID** and add
     the redirect URI `http://localhost:8000/callback`.
   - *Configuration › API credentials*: copy the **Client ID** (`client_…`) and
     click **Generate new secret**.
   - *Configuration › Vehicle access*: enable Odometer › Traveled Distance,
     InternalCombustionEngine › Fuel Level, TractionBattery › State Of Charge,
     then **Publish**.
2. **Configure:**
   ```bash
   cp .env.example .env   # fill in the IDs and secret
   npm install
   ```
3. **Connect your car (once):** `npm run auth` opens Smartcar Connect. Log in to
   your car brand and approve. For a Simulator car created with "automatically
   connect", skip Connect and copy its User ID from the dashboard:
   `npm run auth -- --user <user-id>`.
4. **Read it:**
   ```bash
   npm start      # in the terminal
   npm run web    # dashboard at http://localhost:8080
   ```

## The undocumented step: a webhook

On v3, a vehicle's signals are read from a store on Smartcar's side that only
fills from **webhook deliveries**. Until the vehicle is subscribed to a verified
webhook, every reading comes back empty (`npm start` prints "not reported").
This holds even for Simulator cars, although the docs say they work straight
away. Integrators found the same; see
[wbyoung/smartcar#154](https://github.com/wbyoung/smartcar/issues/154) and
[#110](https://github.com/wbyoung/smartcar/issues/110).

To set one up, once:

```bash
npm run webhook                                     # receiver on :8787
cloudflared tunnel --url http://localhost:8787      # free HTTPS URL, no account
```

1. Add `SMARTCAR_MANAGEMENT_TOKEN` to `.env` (*Configuration › API credentials*).
   The receiver signs Smartcar's challenge with it.
2. *Integrations › Create integration › Webhook*: pick the same signals as
   triggers, set the tunnel URL as the callback, then **Add webhook only**.
3. Open the webhook's **⋯ › Verify**.
4. Subscribe the vehicle to the webhook (*Simulator › vehicle › Subscribe to
   integration* for simulated cars).

## Project structure

- `status.js`: one reading of the car (application token → connection →
  signals). Shared by the CLI and the dashboard.
- `index.js`: the CLI.
- `web.js`, `web/index.html`: the dashboard.
- `auth.js`: connects a car once and remembers which Smartcar user owns it.
- `webhook.js`: optional receiver that verifies the webhook and logs deliveries.
- `tokens.js`: saves that user (`smartcar_connection.json`, gitignored).

## Secrets

Credentials live only in `.env` (gitignored, never committed); `.env.example`
is the template. CarStatus stores no OAuth tokens: data is read with a
short-lived application token fetched on each run.
