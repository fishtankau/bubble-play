# Fishtank Bubble

A white-label demo portal that embeds **Omni Analytics** behind a customer-branded
shell. One login screen fronts several independent demo personas — each one swaps
the entire brand (name, colours, logo), the Omni instance it talks to, the content
it embeds, and the row-level access the viewer gets.

Live: **https://bubble-play.vercel.app**

React + Vite front end, with serverless functions that sign Omni embed URLs and
send push notifications. All Omni API keys and embed secrets stay server-side.

---

## What it does

The app opens on a plain **Login** screen. The username you type decides which
demo loads — there is no configuration UI; everything is driven by
`src/utils/loginConfig.js`.

Once in, the viewer gets a tabbed dashboard:

| Tab | Embeds | Notes |
| --- | --- | --- |
| **Overview** | — | Native React marketing page built from the brand's name, description, key messages and products |
| **AI Chat** | `/chat` (`SINGLE_CONTENT`) | Omni AI chat, scoped by connection roles |
| **Dashboard** | the brand's `embedDashboardPath` | The main embedded Omni dashboard |
| **Flights** | `/dashboards/645cf6e2` | SEATAC-only. Adds a live filter panel that drives the iframe over `postMessage`, a carrier-feedback modal, and a Schedule Delivery action |
| **App** | the brand's `embedAppPath` | Only shown when the brand defines one |
| **Hub** | `/root` (`APPLICATION`) | Omni in application mode with a per-brand entity folder, so each brand only sees its own saved content |

Tabs hide themselves when a brand doesn't configure them — `Flights` is hidden
unless the brand sends the region attribute, and `App` only appears when
`embedAppPath` is set.

---

## Logins

### `education` — no password
The password field disappears once you type `education`, and supplying one is
rejected. This persona is unusual in that it embeds **two different Omni
instances** side by side:

- **Dashboard** — `/dashboards/a6d31aba` on `trial.omniapp.co` (secret profile `education-dashboard`)
- **App** — `/apps/a810a3e6` on `omni.demo.exploreomni.dev` (secret profile `education-app`)

### Industry templates — password `endowus`
Both run on `omni.demo.exploreomni.dev` and send no user attributes:

- **`summer`** → Portfolio
- **`vincent`** → Fintech App Analytics

Brand identity for these comes from `src/utils/industryMocks.js`, which holds a
library of ready-made industry personas (healthcare, finance, retail, logistics,
and so on) with colours, copy, products and Omni targets.

### SEATAC — any password, or none
The fallback for every other username. Runs on `trial.omniapp.co` with the
**Flights** tab visible. The `airport_region` user attribute drives Omni's access
filter on the flights topic:

| Username | `airport_region` | Sees |
| --- | --- | --- |
| `east`, `clive`, `clive@omni.co` | `east` | East-coast airports |
| `west`, `anika`, `anika@omni.co` | `west` | West-coast airports |
| `fish`, `fish@omni.co` | `all` | Everything (unrestricted) |
| anything else | `other` | The remainder |

> These passwords are checked in the browser. They route between demo personas —
> they are **not** real authentication. Actual data protection comes from Omni:
> the embed secret never reaches the client, and row-level access is enforced by
> access filters on user attributes.

---

## How the embedding works

The browser never sees an Omni secret. Each tab posts the content it wants to
`/api/omni-embed-url`, sending a non-secret sentinel (`'env'`) in place of the
key plus a `secretProfile` and/or `vanityDomain`. The server swaps in the real
secret, calls Omni's `/embed/sso/generate-url`, and returns a signed, single-use
URL that the iframe loads.

`api/_omniEnv.js` resolves which credential to use — first by `secretProfile`
(`education-dashboard`, `education-app`), then by vanity domain
(`trial.omniapp.co` → SEATAC vars, `exploreomni` → demo vars). A real key passed
in the request body always wins, which keeps ad-hoc testing possible.

Alongside the signed URL the server forwards `userAttributes` (for access
filters), `connectionRoles`, `entity` / `entityFolderContentRole` (Hub), and
either a theme ID or a theme synthesized from the brand's colours.

---

## OneSignal web push

The dashboard header has a bell button. The OneSignal Web SDK is loaded lazily
with the public App ID; the browser permission prompt only appears after the user
clicks the bell, never on page load. Override the App ID per environment with:

```text
VITE_ONESIGNAL_APP_ID=<OneSignal App ID>
```

Clicking the bell calls `/api/onesignal-send-template`, which sends a
pre-configured OneSignal template to the **Total Subscriptions** segment. That
endpoint restricts requests to an allow-list of origins (the Vercel app and the
Omni demo host, so the bell also works from inside an embedded Omni page) and
handles CORS preflight. It treats OneSignal's "accepted but created nothing"
response as a failure rather than reporting a false success.

In OneSignal, configure Web Push for `https://bubble-play.vercel.app`. The
service worker is served from `/OneSignalSDKWorker.js`.

> Never put the OneSignal REST API key in a `VITE_` variable or any browser code.
> The client only needs the public App ID.

---

## API routes

| Route | Purpose |
| --- | --- |
| `omni-embed-url` | Signs Omni embed SSO URLs (the core of the app) |
| `omni-dashboards` | Lists Omni content |
| `omni-connections` | Lists connections |
| `omni-dashboard-filters` | Reads a dashboard's filter config |
| `omni-query-distinct` | Runs a query for distinct field values (powers the Flights filter panel) |
| `omni-user-attributes` | Checks/creates a user attribute |
| `omni-create-schedule` | Creates an Omni scheduled delivery |
| `onesignal-send-template` | Sends a OneSignal template push |
| `proxy-image` | Proxies remote logos to dodge hotlink/CORS issues |
| `scrape` | Pulls brand identity from a website |

`server.js` mirrors the Omni routes for local development; Vercel serves the
`api/*.js` functions in production. **Both need updating when a route changes.**

---

## Running it

```bash
npm install
cp .env.example .env   # then fill in the values
npm run dev            # Express API on :3001 + Vite on :5173
```

`npm run build` produces the production bundle. Deploys go to Vercel, which needs
the same environment variables set in the project settings — `.env` is
git-ignored and never shipped.

### Environment variables

| Variable | Used for |
| --- | --- |
| `OMNI_API_KEY` / `OMNI_EMBED_SECRET` | `omni.demo.exploreomni.dev` (industry templates) |
| `SEATAC_OMNI_API_KEY` / `SEATAC_EMBED_SECRET` | `trial.omniapp.co` (default SEATAC brand) |
| `EDUCATION_OMNI_API_KEY` / `EDUCATION_EMBED_SECRET` | Education dashboard |
| `EDUCATION_APP_OMNI_API_KEY` / `EDUCATION_APP_EMBED_SECRET` | Education app |
| `ONESIGNAL_APP_ID` | OneSignal app (public) |
| `ONESIGNAL_REST_API_KEY` | Sending push — **server only** |
| `VITE_ONESIGNAL_APP_ID` | Optional client-side App ID override |

---

## Layout

```
api/                  Serverless functions (Omni signing, OneSignal, scraping)
  _omniEnv.js         Maps secret profiles / vanity domains → env credentials
server.js             Express mirror of the Omni routes for local dev
src/
  components/
    Login.jsx         Brand-neutral login; resolves the persona
    Dashboard.jsx     Tab shell, dark mode, push bell
    OmniEmbed.jsx     Shared signed-iframe component
    tabs/             Overview, AIChat, Search, Flights, App, Hub
  utils/
    loginConfig.js    Username → brand + Omni user context  ← start here
    userAttributes.js Username → user attributes (airport_region)
    industryMocks.js  Industry brand library
    oneSignal.js      Lazy OneSignal SDK init
  context/
    BrandContext.jsx  Active brand + current user (defaults to SEATAC)
public/
  OneSignalSDKWorker.js
  logos/              Per-industry SVG logos
```

To add a persona, add an entry in `loginConfig.js` (and `userAttributes.js` if it
needs attributes). Everything else follows from the brand object.
