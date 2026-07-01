---
name: create-omni-embed-portal
description: Scaffold a white-label React + Vite portal that embeds Omni Analytics (dashboards, AI Chat, Hub entity-folder, access filters via user attributes). Use when the user says "build me a customer-facing Omni embed site", "create a white-label dashboard portal for <brand>", "spin up a demo embed app pointed at <url>", or any variant of "make an embedded analytics site like fishtankbubble". Produces a deployable Vercel app with a Config page, brand auto-scan from a URL, industry mock fallback, runtime filter postMessage to Omni iframes, and a per-brand entity folder Hub tab.
---

# Create Omni Embed Portal

This skill scaffolds **a complete white-label Omni embed portal** modeled after the reference implementation at `https://fishtankbubble.vercel.app`. Given a customer website URL and Omni credentials, it produces a React + Vite + Express + Vercel app with:

- **Config page** — scan a website to auto-populate brand identity, key messages, colors, products; or pick from 21 industry templates as fallback for 403'd sites
- **Overview tab** — hero banner + 3 portal CTAs (AI Chat / Dashboards / Hub) + brands grid + stats
- **Dashboard tab** — embeds a single Omni dashboard via signed SSO URL
- **AI Chat tab** — embeds Omni's AI agent (Blobby) with a configurable Connection
- **Flights tab** — embedded dashboard with runtime filter controls that postMessage `dashboard:filter-change-by-url-parameter` events into the iframe
- **Hub tab** — `mode=APPLICATION` embed scoped to a per-brand entity folder Omni auto-provisions on first SSO
- **Per-user access filters** — `region` user attribute drives Omni's access filter on the topic
- **Per-brand theming** — dynamic Omni `customTheme` JSON synthesized from the brand's primary color

## When to use this skill

Trigger on prompts like:
- "Build me a customer-portal embed app for `<brand-url>`"
- "Recreate fishtankbubble for `<customer>`"
- "Scaffold an Omni-embedded white-label dashboard site"
- "Spin up a demo embed portal pointed at `<url>` with these Omni credentials"

Do NOT trigger for: a one-off Omni embed snippet, an Omni model change, or a non-embed Omni admin task — use the official Omni skills (omni-admin, omni-model-builder, etc.) for those.

## Inputs you should ask for if missing

1. **Customer website URL** (e.g. `https://www.portseattle.org/sea-tac`) — used for the auto-scan and to derive the entity key.
2. **Omni API key** (org-level or PAT, format `omni_osk_…`) — for `/api/connections`, `/api/dashboards`, distinct-value queries.
3. **Omni embed secret** (32-char string) — for signed SSO URL generation.
4. **Omni vanity domain** (e.g. `trial.omniapp.co`, `<customer>.omniapp.co`) — defaults to `trial.omniapp.co`.
5. **Default dashboard path** (e.g. `/dashboards/d33cc8c2`) — for the Dashboard tab.
6. **(Optional) Connection ID** — for AI Chat to scope to a single connection.
7. **(Optional) Entity folder role** — `VIEWER` | `EDITOR` | `MANAGER` | `NO_ACCESS` (defaults `VIEWER`).

## Tech stack (fixed — don't deviate)

- React 18 + Vite (no Next.js, no SSR — pure SPA)
- Express 4 dev server (`server.js`) that mirrors the Vercel serverless functions
- Vercel serverless functions in `/api/*.js` (the prod surface)
- `react-router-dom@6`, `lucide-react`, `recharts`, `cheerio`, `cors`, `concurrently`
- No CSS framework — hand-rolled `src/index.css` with CSS custom properties for theming

## Project layout (exact)

```
<app-name>/
├── api/                              # Vercel serverless functions (prod)
│   ├── omni-connections.js           # GET org connections (proxied)
│   ├── omni-dashboard-filters.js     # GET filter IDs for a dashboard
│   ├── omni-dashboards.js            # GET available dashboards
│   ├── omni-embed-url.js             # POST → Omni /embed/sso/generate-url
│   ├── omni-query-distinct.js        # POST distinct-values query for filter pickers
│   ├── omni-user-attributes.js       # GET/POST user attribute provisioning
│   ├── proxy-image.js                # CORS-bypass image proxy
│   └── scrape.js                     # Cheerio-based website scanner
├── server.js                         # Express dev server — mirrors every /api/* endpoint
├── src/
│   ├── main.jsx                      # React entry, BrowserRouter
│   ├── App.jsx                       # Routes: /, /config, /output, dashboard
│   ├── context/
│   │   └── BrandContext.jsx          # Brand + currentUser state (no localStorage; in-memory)
│   ├── pages/
│   │   ├── Welcome.jsx               # Login screen (USER_MAP-driven user attribute resolution)
│   │   ├── Config.jsx                # Big config form: scan, industry templates, colors, key messages, products, Hub, AI Chat, advanced Omni section
│   │   └── Output.jsx                # (legacy preview)
│   ├── components/
│   │   ├── Dashboard.jsx             # Tab shell with header + tab navigation
│   │   └── tabs/
│   │       ├── Overview.jsx          # Hero + 3 portal cards + products grid + stats
│   │       ├── AIChat.jsx            # Omni AI Chat embed
│   │       ├── Search.jsx            # Dashboard tab — single dashboard embed
│   │       ├── Flights.jsx           # Dashboard + runtime filter controls (postMessage)
│   │       └── Hub.jsx               # APPLICATION-mode entity-folder embed
│   ├── utils/
│   │   ├── colors.js                 # generatePalette() + getContrastColor()
│   │   ├── domain.js                 # domainToEntityKey() — first hostname label, sanitized
│   │   ├── userAttributes.js         # resolveUser(login) → { externalId, name, email, region, userAttributes }
│   │   ├── industryMocks.js          # 21 industries + INDUSTRY_OPTIONS + industryMocks records
│   │   └── omniTheme.js              # buildOmniCustomTheme(brand) → JSON for Omni customTheme param
│   └── index.css                     # All app styles (no CSS framework)
├── index.html
├── package.json
├── vite.config.js
├── vercel.json                       # Routes /api/* to serverless, everything else to /index.html
└── .claude/launch.json               # Preview-server config
```

## Required scripts

`package.json` must have:

```json
{
  "scripts": {
    "dev": "concurrently \"node server.js\" \"vite\"",
    "build": "vite build",
    "server": "node server.js"
  }
}
```

Vite proxies `/api/*` to `localhost:3001` (the Express server) during dev. In prod, Vercel routes `/api/*` directly to the serverless functions.

`vite.config.js`:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:3001' }
  }
})
```

`vercel.json`:
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Critical implementation details

### 1. Omni Embed SSO endpoint shape

`POST /api/omni-embed-url` receives from React, then forwards a payload to `https://<vanityDomain>/embed/sso/generate-url`:

```js
const payload = {
  contentPath,                  // '/dashboards/abc123' or '/entity-folder' or '/root'
  externalId,                   // user identifier
  name, email,
  nonce: crypto.randomBytes(16).toString('hex'),
  secret,                       // the embed secret
}
// All optional fields — only set when present:
if (userAttributes && Object.keys(userAttributes).length > 0) {
  payload.userAttributes = encodeURIComponent(JSON.stringify(userAttributes))
}
if (customThemeId) payload.customThemeId = customThemeId
else if (customTheme) payload.customTheme = JSON.stringify(customTheme)
if (theme) payload.theme = theme
if (prefersDark) payload.prefersDark = prefersDark
if (connectionRoles) payload.connectionRoles = JSON.stringify(connectionRoles)
if (mode) payload.mode = mode                                     // 'APPLICATION' for Hub
if (linkAccess) payload.linkAccess = linkAccess                   // '__omni_link_access_open'
if (filterSearchParam) payload.filterSearchParam = filterSearchParam
if (entity) payload.entity = entity                               // Hub entity key
if (entityFolderContentRole) payload.entityFolderContentRole = entityFolderContentRole
if (groups) {
  const arr = Array.isArray(groups) ? groups : groups.split(',').map(s => s.trim()).filter(Boolean)
  payload.groups = JSON.stringify(arr)
}
```

**Both** `api/omni-embed-url.js` (Vercel) **and** `server.js` (Express) must implement this identically — server.js is NOT auto-generated.

### 2. Two Omni role enums (don't confuse them!)

- **Connection roles**: `RESTRICTED_QUERIER` | `QUERIER` | `VIEWER` | `EDITOR` (default `RESTRICTED_QUERIER`)
- **Content roles** (for `entityFolderContentRole`): `MANAGER` | `EDITOR` | `VIEWER` | `NO_ACCESS` (default `VIEWER`)

Sending the wrong enum produces `400: Invalid content role provided: RESTRICTED_QUERIER. Must be one of: MANAGER, EDITOR, VIEWER, or NO_ACCESS`. The Hub.jsx must defensively coerce:

```js
entityFolderContentRole: ['MANAGER','EDITOR','VIEWER','NO_ACCESS'].includes(brand.embedEntityFolderRole)
  ? brand.embedEntityFolderRole
  : 'VIEWER'
```

### 3. User attributes drive Omni access filter

`src/utils/userAttributes.js`:
```js
const USER_MAP = {
  'fish@omni.co':  { region: 'all',  name: 'Fish (Admin)' },
  'clive@omni.co': { region: 'east', name: 'Clive — East' },
  'anika@omni.co': { region: 'west', name: 'Anika — West' },
  // short-form logins
  'fish': { region: 'all', name: 'Fish (Admin)' },
  'east': { region: 'east', name: 'East User' },
  'west': { region: 'west', name: 'West User' },
}

export function resolveUser(rawId) {
  const id = (rawId || '').trim().toLowerCase()
  const matched = USER_MAP[id]
  const region = matched?.region || 'other'
  const email = id.includes('@') ? id : `${id.replace(/[^a-z0-9._-]/g, '')}@<brand>.local`
  return {
    externalId: id || 'guest',
    email,
    name: matched?.name || id.split('@')[0] || 'Guest',
    region,
    isAdmin: region === 'all',
    userAttributes: { region },        // <— flows into Omni SSO userAttributes
  }
}
```

The Omni topic must have an **access filter** referencing `users.attributes.region` (or whatever attribute name) compared against a data column. For the fishtank reference, the column is `<TOPIC>.airport_region` and the user attribute is `region`. They are NOT the same name — don't conflate them.

### 4. Runtime filter postMessage (Flights pattern)

For dashboards that need user-driven filtering outside the iframe, post `dashboard:filter-change-by-url-parameter` events:

```js
const sendFilterUpdate = (airportList, carrierList, { clearDashboardFilter = false } = {}) => {
  const parts = []
  const airportObj = airportList.length > 0
    ? { is_inclusive: false, is_negative: false, kind: 'EQUALS', type: 'string', values: airportList, appliedLabels: {} }
    : { values: [] }
  parts.push(`f--${AIRPORT_FILTER_ID}=${encodeURIComponent(JSON.stringify(airportObj))}`)
  // ... same shape for each filter
  const filterUrlParameter = parts.join('&')
  iframe.contentWindow.postMessage(
    { name: 'dashboard:filter-change-by-url-parameter', payload: { filterUrlParameter } },
    embedOrigin
  )
}
```

Filter IDs (e.g. `lG4Gn7nz`, `v6fXfL0c`) come from Omni's dashboard config — fetch via `/api/omni-dashboard-filters`.

Listen for Omni's filter-change events the other direction:
```js
window.addEventListener('message', (e) => {
  if (e.origin !== embedOrigin) return
  if (e.data?.name === 'dashboard:filter-changed') {
    // user changed a filter inside the dashboard — react accordingly
  }
})
```

### 5. Entity key auto-derivation

From `src/utils/domain.js`:
```js
export function domainToEntityKey(rawUrl) {
  if (!rawUrl) return ''
  try {
    const u = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`)
    const firstLabel = u.hostname.replace(/^www\./i, '').split('.')[0]
    return firstLabel.toLowerCase().replace(/[^a-z0-9-]/g, '')
  } catch { return '' }
}
```

This produces `portseattle.org` → `portseattle`, `www.mypassglobal.com` → `mypassglobal`. Re-scanning a new URL must overwrite the entity key.

### 6. Hub tab — `mode=APPLICATION` + entity folder

```js
fetch('/api/omni-embed-url', { body: JSON.stringify({
  secret: brand.embedSecret,
  contentPath: '/entity-folder',          // lands user in their entity folder
  vanityDomain: brand.embedVanityDomain || '',
  mode: 'APPLICATION',                    // shows app chrome (sidebar, nav)
  entity: brand.embedEntityKey,           // required when contentPath=/entity-folder
  entityFolderContentRole: 'VIEWER',
  groups: brand.embedHubGroups || 'All Embed Users',
  linkAccess: '__omni_link_access_open',
  externalId, name, email,
  userAttributes,
}) })
```

If you skip `entity`, Omni returns `400: Entity folder was specified as the starting content path but no entity was provided`.

### 7. Brand auto-scan

`api/scrape.js` uses cheerio to extract from `<head>` and visible body content:
- `<meta property="og:title">`, `<title>` → `name`
- `<meta property="og:description">`, `<meta name="description">` → `description`
- `<meta property="og:image">`, `link[rel="icon"]` → `logoUrl`
- Theme color from `<meta name="theme-color">` or first heading bg color → `primaryColor`
- H1-H3 text content (top 5) → `keyMessages`
- `<img>` + nearby heading pairs → `products[]`

If the fetch returns 403 (common — Cloudflare, etc.), the Config UI **must** offer a 21-industry button group fallback. Each industry has a mock object in `src/utils/industryMocks.js` with `name, description, primaryColor, secondaryColor, keyMessages[], products[]`. Industries: Healthcare, Finance, Technology, Manufacturing, Construction, Education, Retail, Agriculture, Mining, Telco, Transportation, Hospitality, Media, Entertainment, HR, Sales, Marketing, Customer Services, IT, Consulting, Legal.

### 8. Scan must be truly dynamic

When the user scans a new URL, you may NOT bleed old brand fields (logoUrl, products) into the new brand. Preserve ONLY Omni-specific fields:

```js
const pickOmniConfig = (b) => ({
  omniApiKey: b?.omniApiKey, embedSecret: b?.embedSecret,
  embedVanityDomain: b?.embedVanityDomain, embedDashboardPath: b?.embedDashboardPath,
  embedThemeId: b?.embedThemeId, aiConnectionId: b?.aiConnectionId,
  aiConnectionRole: b?.aiConnectionRole, allConnections: b?.allConnections,
  embedEntityFolderRole: b?.embedEntityFolderRole, embedHubGroups: b?.embedHubGroups,
})
// On scan: setBrand({ ...defaultBrand, ...pickOmniConfig(prev), ...scanResult, embedEntityKey: domainToEntityKey(url) })
```

### 9. Scan button event gotcha

React's `onClick={handleScan}` passes the SyntheticEvent as the first arg — if `handleScan(urlOverride)` calls `urlOverride.trim()`, it explodes silently. Always wrap:

```jsx
<button onClick={() => handleScan()}>Scan</button>
// And guard inside:
function handleScan(urlOverride) {
  const url = (typeof urlOverride === 'string' ? urlOverride : null) || editData.url
  ...
}
```

### 10. Image proxy for CORS

Logos / product images from arbitrary customer sites usually have CORS blocked. The `api/proxy-image.js` endpoint accepts `?url=<encoded>` and pipes the bytes through. Use it everywhere you display a remote image:

```jsx
<img src={`/api/proxy-image?url=${encodeURIComponent(p.image)}`} />
```

### 11. Per-brand dynamic theming

`src/utils/omniTheme.js` should export `buildOmniCustomTheme(brand, { prefersDark })` that returns Omni's expected JSON shape:

```js
{
  base: { fontFamily: 'Inter, sans-serif' },
  dashboard: { background: ..., padding: 16 },
  tile: { background: ..., borderColor: ..., titleColor: ... },
  chart: { palette: [primaryColor, primaryLight, primaryDark, accent] },
  ...
}
```

Synthesize from `brand.primaryColor` via `generatePalette()` in `src/utils/colors.js`. Pass as `customTheme` to the embed-url endpoint when `embedThemeId` is empty.

## Deployment

1. `npm install`
2. `npm run build`
3. `npx vercel --prod --yes`
4. `npx vercel alias set <deployment-url> <app-name>.vercel.app`

The Express `server.js` is **only for local dev**. In production, Vercel routes `/api/*` directly to the serverless function files. Both must implement every endpoint identically.

## Default credentials for quickstart

If the user doesn't provide credentials, use the fishtankbubble reference defaults (live trial Omni — only safe for demos):

```js
const defaultBrand = {
  url: '<scanned-url>',
  primaryColor: '#F5C518',
  secondaryColor: '#1a1a1a',
  omniApiKey: 'env',        // resolved server-side from OMNI_API_KEY (see api/_omniEnv.js)
  embedSecret: 'env',       // resolved server-side from OMNI_EMBED_SECRET
  embedVanityDomain: '',                                           // → trial.omniapp.co
  embedDashboardPath: '/dashboards/d33cc8c2',
  embedThemeId: '1d0bd701-c8e2-4c42-b5e9-b708955b05bc',
  aiConnectionRole: 'RESTRICTED_QUERIER',
  embedEntityKey: '<auto-derived-from-url>',
  embedEntityFolderRole: 'VIEWER',
  embedHubGroups: 'All Embed Users',
}
```

## Step-by-step build sequence

When the user invokes this skill, follow this order:

1. **Confirm inputs** — website URL + (optional) Omni credentials. If no credentials, ask whether to use trial defaults.
2. **Scaffold** — `npm create vite@latest <app> -- --template react`, then add the deps from `package.json` above.
3. **Drop in the file tree** — copy each file from the reference fishtankbubble repo, substituting brand name + URL. Critical files: `BrandContext.jsx`, `userAttributes.js`, all 8 files in `/api/`, the full `server.js`, every tab component, `index.css`.
4. **Wire the routes** — `/` → Welcome (login), `/config` → Config page, post-login → Dashboard tabs.
5. **Run the scan** on the customer URL to populate brand defaults; if 403, surface industry templates immediately.
6. **Verify Omni connection** — Config page must call `/api/omni-connections` and `/api/omni-dashboards` with the supplied API key and surface results.
7. **Add a default user to `USER_MAP`** matching the customer's expected admin email.
8. **`npm run dev`**, walk through every tab, confirm:
   - Overview portal cards navigate between tabs
   - Dashboard tab loads the configured dashboard
   - AI Chat loads Blobby
   - Flights filter controls update the iframe via postMessage
   - Hub lands on `/entity-folder` with the auto-provisioned folder
9. **Deploy** — `npm run build` → `vercel --prod --yes` → alias.

## Things NOT to do

- Don't use Next.js / Remix / any SSR — the API endpoints assume Vercel serverless + Vite SPA.
- Don't store the embed secret in `localStorage` or expose it client-side — it lives only in the BrandContext (cleared on reload) and gets sent to `/api/omni-embed-url` which proxies to Omni server-side.
- Don't skip the Express `server.js` mirror — dev environments break without it because Vite doesn't run serverless functions.
- Don't conflate user attribute name with topic column name — they're independent and the access filter SQL is what connects them.
- Don't pass `RESTRICTED_QUERIER` as `entityFolderContentRole` — that's a connection role, not a content role.
- Don't load remote images directly — always go through `/api/proxy-image`.

## Reference implementation

Live: https://fishtankbubble.vercel.app
Repo: the directory containing this SKILL.md — every file mentioned above is in `src/` or `api/`.

When in doubt about the exact shape of a payload, the postMessage event, or a CSS class, READ THE REFERENCE FILES directly rather than guessing.
