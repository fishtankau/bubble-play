# Fishtank Bubble

White-label React + Vite portal that embeds **Omni Analytics** — dashboards, AI chat, per-customer entity folders, and access-filtered data — behind a configurable brand.

**Live demo app:** <https://fishtankbubble.vercel.app>

## 🎥 Recording Summaries

### First Recording: Overview of the Default Embed Demo Portal

📹 **[Watch on Roam →](https://ro.am/share/kf9rvxy2-ozyawaf7-v4gvj2ai-0mle9r94)**

This recording provides a walkthrough of the **standard embed portal demo**, showcasing another embed portal user experience using generic data.

* **Default Portal Experience:** Displays a pre-configured "SEATAC Airport" brand, featuring a landing page with an overview portal page and Omni embed tabs.
* **Performance Comparison:** Showcases a dedicated tab for comparing load times and performance between JavaScript events and URL parameter embedding.
* **Identity & Access:** Demonstrates Role-Based Access Control (RBAC) and the use of user attributes to filter dashboard data (e.g., East Region Manager view).
* **Custommisation:** Highlights the integration of application filters passing values to Omni embedded dashboards.

---

### Second Recording: Configuring Custom POCs and Demo Instances

📹 **[Watch on Roam →](https://ro.am/share/gkr2v39j-5qtvqps2-0vldo04z-cljhd3l6)**

This recording demonstrates how to use the **configuration page** to transition from the default setup to a specific customer Proof of Concept (POC) or leverage demo instance.

* **Advanced Configuration:** Details how to expand "Advanced Options" to input instance API and Embed keys, allowing the app to fetch specific dashboards from different environments.
* **Dynamic Customization:** Shows how to override scanned data with manual values for products and services, accelerating a more custom demo aligned to prospect's industry.
* **Instance Switching:** Provides a step-by-step guide on generating new keys and updating domain settings to successfully launch a tailored customer instance.

---

## What this app is

A single React app that lets you:

- Point at **any customer website URL** and auto-generate a branded portal (logo, colors, key messages, products) from the site's HTML.
- Fall back to a **industry template library** (Healthcare, Finance, Tech, Retail, …) when the site blocks scraping.
- Embed **Omni dashboards** via signed SSO URLs, themed per-brand on the fly.
- Embed Omni's **AI chat agent (Blobby)** with configurable connection scope.
- Spin up a **per-brand Hub** using Omni's APPLICATION-mode entity folder — Omni auto-provisions one folder per `entity` key on first SSO.
- Update dashboard filters from **outside the iframe** via `dashboard:filter-change-by-url-parameter` postMessage events (see the Flights tab).

## Quick start (local)

```bash
git clone https://github.com/fishtankau/fishtank-bubble.git
cd fishtank-bubble
npm install
npm run dev          # starts Express (port 3001) + Vite (port 5173) concurrently
```

Open <http://localhost:5173>.

## End-to-end flow of default demo setup

### 1. Welcome → Login (`/`)

[`src/pages/Welcome.jsx`](src/pages/Welcome.jsx) presents a login form. Enter one of the demo users (or any email):

| Login                  | Region   | Notes                                  |
|------------------------|----------|----------------------------------------|
| `fish` / `fish@omni.co`   | `all`    | Admin — sees every airport            |
| `clive` / `clive@omni.co` | `east`   | Scoped to East-coast airports         |
| `anika` / `anika@omni.co` | `west`   | Scoped to West-coast airports         |
| Anything else            | `other`  | Catches all non-mapped logins         |

Mapping lives in [`src/utils/userAttributes.js`](src/utils/userAttributes.js). The chosen region is sent to Omni as the `region` user attribute (`userAttributes: { region }`) and Omni's access filter on the topic compares that to the `airport_region` column to scope every query.

### 2. Configuration (`/config`)

The Settings gear in the top-right of every page returns here. [`src/pages/Config.jsx`](src/pages/Config.jsx) is one long form with these sections:

1. **Website URL → Scan.** Type a customer URL, hit Scan. [`api/scrape.js`](api/scrape.js) uses cheerio to pull `og:title`, description, theme color, top headings, logo, and `<img>`+heading product pairs out of the page's HTML.
2. **Industry Template.** If the scrape returns 403 (Cloudflare etc.), or you want a clean demo, pick one of 21 industries. Each is a complete mock from [`src/utils/industryMocks.js`](src/utils/industryMocks.js) — Healthcare, Finance, Tech, Manufacturing, Retail, Hospitality, HR, …
3. **Brand Identity** — name, URL, logo URL, description (editable text fields, all overwritten by the scrape).
4. **Theme Colors** — primary + secondary color pickers. The full Omni palette regenerates from the primary color via [`src/utils/colors.js`](src/utils/colors.js).
5. **Key Messages** — first line becomes the hero tagline; lines 2–5 become the value cards on the Overview page. Add/remove inline.
6. **Products / Services** — 3-column editable card grid. Each card has a name, optional description, optional thumbnail (proxied through `/api/proxy-image` for CORS). Remove any with the ✕ in the corner.
7. **Hub Tab (Entity Folder)** —
   - **Entity Key**: auto-derived from the scanned URL via [`src/utils/domain.js`](src/utils/domain.js) (e.g. `portseattle.org` → `portseattle`). Re-scanning a new URL re-derives it.
   - **Entity Folder Content Role**: `VIEWER` | `EDITOR` | `MANAGER` | `NO_ACCESS` (button group, single select).
   - **Groups**: comma-separated, defaults to `All Embed Users`.
8. **AI Chat Settings** — pick the Omni Connection (auto-populated from `/api/omni-connections`) and the Connection Role (default `RESTRICTED_QUERIER`). Used by the AI Chat tab.
9. **Advanced — Omni Configuration** (collapsed by default, click to expand):
   - **Omni API Key** — your org-level key or PAT. Drives `/api/omni-connections`, `/api/omni-dashboards`, distinct-value queries for filter pickers.
   - **Omni Embed Settings** — embed secret, vanity domain (`trial.omniapp.co` default), default dashboard path, optional Omni theme ID.
   - **User Attribute — `region`** — checks/creates the user attribute in Omni via `/api/omni-user-attributes`.

Hit **Save Configuration** to commit the form into the [`BrandContext`](src/context/BrandContext.jsx) and move to the dashboard.

### 3. Dashboard ([`src/components/Dashboard.jsx`](src/components/Dashboard.jsx))

Top-of-page tabs: **Overview · AI Chat · Dashboard · Flights · Hub**. The settings gear returns to `/config`; the door icon logs out; the moon/sun toggles dark mode (forwarded into Omni via `prefersDark`).

#### Overview tab
[`src/components/tabs/Overview.jsx`](src/components/tabs/Overview.jsx). Hero banner (gradient from secondary→primary, floating sparkles, brand description) + three portal CTA cards that navigate to AI Chat / Dashboard / Hub. Below, the Products grid renders the cards configured in step 6, and a stats strip + "Life at <brand>" section round out the page.

#### AI Chat tab
[`src/components/tabs/AIChat.jsx`](src/components/tabs/AIChat.jsx). Embeds Omni's Blobby agent inside an iframe. Uses the Connection ID + role you chose in Config step 8. Requires the embed secret.

#### Dashboard tab (labeled "Dashboard" in the nav)
[`src/components/tabs/Search.jsx`](src/components/tabs/Search.jsx). Embeds a single Omni dashboard at the path configured in step 9 ("Default dashboard path"). Themed via either a fixed Omni theme ID or a dynamically synthesized `customTheme` JSON built from your brand colors ([`src/utils/omniTheme.js`](src/utils/omniTheme.js)).

#### Flights tab
[`src/components/tabs/Flights.jsx`](src/components/tabs/Flights.jsx). Embedded dashboard **plus runtime filter controls** that live outside the iframe.

- Two multi-select pickers (Airport, Carrier) with searchable lists fetched from Omni via `/api/omni-query-distinct`. The list is pre-scoped to your region — a `west` user only sees west-coast airports in the picker.
- A **Clear All** button that pops up whenever any filter (the two pickers OR an in-dashboard filter `FFErjawy`) is active.
- Every toggle posts a `dashboard:filter-change-by-url-parameter` event into the iframe with the `f--<filterId>=<encoded-json>` shape Omni expects. The iframe also posts `dashboard:filter-changed` events back; we listen for those to keep the external UI in sync.

#### Hub tab
[`src/components/tabs/Hub.jsx`](src/components/tabs/Hub.jsx). Loads Omni in `mode=APPLICATION` with `contentPath=/entity-folder` and `entity=<your-key>`. Omni auto-provisions the per-brand folder on first SSO; subsequent loads land users inside that folder with the Omni sidebar visible.

Access filters from step 2's `region` user attribute still apply inside the Hub.

### 4. Region-based access in action

Open three browser tabs side by side, log in as `fish`, `clive`, and `anika` respectively. Walk through Flights or Dashboard — each session shows a different subset of the data even though they're hitting the same embedded dashboard. The access filter on the Omni topic compares `users.attributes.region` to the `airport_region` column.

## Deployment

```bash
npm run build                                                   # vite build → dist/
npx vercel --prod --yes                                         # deploy
npx vercel alias set <deployment-url> fishtankbubble.vercel.app # alias
```

Vercel routes `/api/*` to the serverless functions in [`api/`](api/) and serves the SPA from `dist/`. The Express server in [`server.js`](server.js) is **only for local dev** — it mirrors every `/api/*` endpoint so Vite (which doesn't run serverless functions) has something to proxy to.

## Repo map

```
fishtank-bubble/
├── api/                       # Vercel serverless functions (production)
│   ├── omni-embed-url.js      # POST → Omni /embed/sso/generate-url
│   ├── omni-dashboards.js     # GET dashboards
│   ├── omni-connections.js    # GET connections
│   ├── omni-query-distinct.js # POST distinct-values for filter pickers
│   ├── omni-user-attributes.js
│   ├── omni-dashboard-filters.js
│   ├── proxy-image.js         # CORS image proxy
│   └── scrape.js              # cheerio website scanner
├── server.js                  # Express dev server (mirrors /api/*)
├── src/
│   ├── App.jsx                # routes
│   ├── main.jsx
│   ├── context/BrandContext.jsx
│   ├── pages/
│   │   ├── Welcome.jsx        # login
│   │   ├── Config.jsx         # configuration form
│   │   └── Output.jsx         # (legacy preview)
│   ├── components/
│   │   ├── Dashboard.jsx      # tabbed shell
│   │   └── tabs/{Overview,AIChat,Search,Flights,Hub}.jsx
│   ├── utils/{colors,domain,userAttributes,industryMocks,omniTheme}.js
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```

## Related

This repo is the canonical reference for the **`create-omni-embed-portal`** Claude Code skill at <https://github.com/fishtankau/omni-embed-portal-skills>. That skill lets anyone scaffold a fresh copy of this app for a new customer in a single Claude prompt.
