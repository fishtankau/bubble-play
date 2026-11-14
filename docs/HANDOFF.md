# Bubble Play — handoff and setup guide

Everything needed to rebuild this working setup in a fresh Claude Code environment and carry on from where it stopped (state as of **14 Nov 2026**).

> This file deliberately contains **no secret values**. Every key and secret is referred to by its environment variable name. Move the real values separately and securely (see step 2).

---

## 0. What this project is

**Bubble Play** is a white-label React + Vite portal that embeds Omni Analytics behind per-login customer brands. Each login switches the whole portal — logo, colours, a visual Overview page, the embedded Omni app, AI Chat (Blobby) and the Hub — to that customer's demo.

| | |
|---|---|
| Live site | https://bubble-play.vercel.app |
| Repo | https://github.com/fishtankau/bubble-play (remote name `bubble`) |
| Local folder | `fishtankbubble/` (git branch `clean-push`) |
| Vercel | team `fishtankaus-projects`, project **`bubble-play`** |
| Omni instance | `trial.omniapp.co` (embed host `trial.embed-omniapp.co`) — also `omni.demo.exploreomni.dev` for the industry templates |
| Push | OneSignal web push (app `34b0ba78-2d0f-4762-855f-9a34900c5ea9`) |

---

## 1. ⚠️ Do this first, on the current machine

**The latest code is not on GitHub.** Branch `clean-push` is **25 commits ahead** of GitHub `main`, plus an untracked `docs/` folder. GitHub `main` is the old version.

This also causes a live problem: **every change pushed or uploaded to GitHub `main` triggers a Vercel auto-deploy of that old code to production**, which wipes out all the CBA, Beamtree, Fleet, Kernel and Acenda work. This has already happened twice.

Pick one way to carry the code over:

**A. Push to GitHub (recommended — also stops the rollbacks).** Needs a GitHub personal access token (classic) with `repo` scope for `fishtankau/bubble-play`.

```bash
cd fishtankbubble
git add docs && git commit -m "Add handoff and OneSignal docs"
git push bubble clean-push:main
```

**B. No token yet — bundle the repo into one file and copy it across.**

```bash
cd fishtankbubble
git add docs && git commit -m "Add handoff and OneSignal docs"
git bundle create ../bubble-play.bundle --all
```

On the new machine: `git clone bubble-play.bundle fishtankbubble && cd fishtankbubble && git remote add bubble https://github.com/fishtankau/bubble-play.git`

If you push later, push `clean-push` to `main` **before** anyone touches GitHub `main` again.

---

## 2. Secrets to move (securely — not in this file)

Copy `fishtankbubble/.env` to the new machine through a password manager or secure transfer. It is gitignored and must never be committed. It holds:

| Variable pair | Secret profile | Used by |
|---|---|---|
| `OMNI_API_KEY` / `OMNI_EMBED_SECRET` | (host `exploreomni`) | Industry templates (summer, vincent) on `omni.demo.exploreomni.dev` |
| `SEATAC_OMNI_API_KEY` / `SEATAC_EMBED_SECRET` | (host `trial.omniapp.co`) | Default SEATAC brand |
| `PLAYGROUND_OMNI_API_KEY` / `PLAYGROUND_EMBED_SECRET` | — | Playground instance |
| `FLEET_OMNI_API_KEY` / `FLEET_EMBED_SECRET` | `fleet-console` | AUfleet, NZfleet |
| `BEAMTREE_OMNI_API_KEY` / `BEAMTREE_EMBED_SECRET` | `beamtree` | clive, ashima, conor |
| `CBA_OMNI_API_KEY` / `CBA_EMBED_SECRET` | `cba` | cba |
| `KERNEL_OMNI_API_KEY` / `KERNEL_EMBED_SECRET` | `kernel` | syd, armin, cory |
| `ACENDA_OMNI_API_KEY` / `ACENDA_EMBED_SECRET` | `acenda` | acenda |

Only set in **Vercel** (not in the local `.env`): `EDUCATION_OMNI_API_KEY`, `EDUCATION_EMBED_SECRET`, `EDUCATION_APP_OMNI_API_KEY`, `EDUCATION_APP_EMBED_SECRET`, `ONESIGNAL_REST_API_KEY`. Vercel stores these as hidden secrets, so they can't be pulled back out — get the values from Omni / OneSignal if you need them locally.

All Vercel production variables are already set; nothing needs re-adding unless you create a new Vercel project.

**Rotate:** several of these keys, and GitHub tokens, were pasted into earlier chat sessions. Consider rotating the Omni API keys and embed secrets, and revoke any GitHub tokens that were shared.

---

## 3. Accounts and access the new environment needs

- **Claude Code** signed in on the new plan.
- **GitHub** access to `fishtankau/bubble-play` (token with `repo` scope to push).
- **Vercel** member of team `fishtankaus-projects` → `npx vercel login`, then `npx vercel link` inside `fishtankbubble/` and pick project **`bubble-play`** (not `fishtank-bubble` — see gotchas).
- **Omni** admin on `trial.omniapp.co` (for app moves, folders, models). The API keys in `.env` cover API work.
- **OneSignal** dashboard access for app `34b0ba78-…` (Web Push site URL is `https://bubble-play.vercel.app`).
- **Optional MCP connector:** the Omni docs/query MCP server (used for `searchOmniDocs`). Re-add it in the new environment if available; everything else uses plain REST calls.

Memory, chat history and session forks from the old account **do not carry over** — this file replaces them.

> Check that moving this work (customer demo material and Omni credentials) to a personal account is OK under your company's policies before you do it.

---

## 4. Local setup on the new machine

```bash
git clone https://github.com/fishtankau/bubble-play.git fishtankbubble   # or the bundle, step 1B
cd fishtankbubble
git checkout clean-push        # skip if you pushed clean-push to main
npm install
# put the .env from step 2 in this folder
npx vercel link                # team fishtankaus-projects, project bubble-play
npm run dev                    # Express API on :3001 + Vite on :5173
```

Open http://localhost:5173 and log in with any login from section 7. Node 24 is what's in use.

Local dev runs `server.js` (Express) for `/api/*`; **production runs the Vercel functions in `api/`**. They are separate copies — see gotchas.

---

## 5. Deploying

Always deploy from inside `fishtankbubble/`, as a prebuilt production deploy:

```bash
cd fishtankbubble
rm -rf .vercel/output
npx vercel build --prod --yes
npx vercel deploy --prebuilt --prod --yes
```

Then verify the live site serves the new bundle (the edge cache can hold the old `index.html` briefly):

```bash
curl -s -H 'Cache-Control: no-cache' "https://bubble-play.vercel.app/?b=$RANDOM" | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js'
ls .vercel/output/static/assets/index-*.js    # should match
```

Users may need a hard refresh after a deploy.

---

## 6. How it works

| Piece | File |
|---|---|
| Login → brand + user resolution (every login lives here) | `src/utils/loginConfig.js` |
| Default brand, `updateBrand` (merge) and `replaceBrand` (reset then apply) | `src/context/BrandContext.jsx` |
| Login card (brand-neutral; shows a logo only for branded logins, hides password for passwordless ones) | `src/components/Login.jsx` |
| Nav tabs, app tabs, OneSignal bell, push bridge | `src/components/Dashboard.jsx` |
| Generic app/dashboard embed | `src/components/OmniEmbed.jsx` |
| AI Chat (`/chat`, `SINGLE_CONTENT`) | `src/components/tabs/AIChat.jsx` |
| Hub (`/root`, `APPLICATION`, per-brand entity folder) | `src/components/tabs/Hub.jsx` |
| Visual Overview (used when a brand has `overview`) / original Overview | `src/components/tabs/OverviewVisual.jsx`, `Overview.jsx` |
| Server-side secret lookup (`secretProfile` → env vars) | `api/_omniEnv.js` |
| Omni SSO URL signing (prod) | `api/omni-embed-url.js` |
| OneSignal send | `api/onesignal-send-template.js` — full walkthrough in `docs/onesignal-snippets.md` |

**Secrets never reach the browser.** The client sends the sentinel `'env'` plus a `secretProfile`; the server swaps in the real key/secret.

**Per-brand embed settings** (all in `loginConfig.js`):

| Setting | Effect |
|---|---|
| `embedSecretProfile`, `embedVanityDomain` | which Omni instance/credentials |
| `appTabs: [{id,label,path}]` | app tabs between AI Chat and Hub |
| `showDashboardTab: false` | hide the generic Dashboard tab |
| `embedSendRegionAttribute: false` | hide Flights, don't send `airport_region` |
| `embedConnectionRoles: {connId: role}` | connection access for app embeds |
| `aiConnectionId`, `aiConnectionRole`, `aiModelRoles` | AI Chat access (`modelRoles` scopes chat to one model) |
| `hubConnectionRole` | Hub user's connection role (separate embed user from chat) |
| `embedEntityKey`, `embedEntityFolderRole` | Hub entity folder and its content role |
| `overview: {…}`, `inkColor`, `heroImage`, `stats`, `products` | visual Overview page content and colours |

**Per-login user settings:** `embedMode` (`SINGLE_CONTENT` / `APPLICATION`), `entityFolderRole` (`MANAGER` / `EDITOR` / `VIEWER`), `userAttributes`.

**Rule learned the hard way:** a user with only the default / `RESTRICTED_QUERIER` role can query **topics only**. Apps that query tables directly (e.g. Fleet's `CF Actions`) return nothing, and Blobby is hidden. Give such users `QUERIER` on the connection.

---

## 7. Logins

**Passwordless:**

| Login | Brand | Opens | Mode | Content role | Notes |
|---|---|---|---|---|---|
| clive | Beamtree | Hospital Performance `/apps/4d9d2162` (Observe) | Single content | Editor | executive · Magnolia Regional (2RC) |
| ashima | Beamtree | same (Explore) | Single content | Editor | clinician · Hillcrest Medical (4VH) |
| conor | Beamtree | same (Analyse) | Application | Manager | analyst · Poppy Regional (U7Q) |
| AUfleet | Custom Fleet (blue) | Fleet portal `/apps/8d10cf9f` | Single content | Manager | `fleet_tenant=AU`, QUERIER on demo-dbt |
| NZfleet | Custom Fleet (green) | Fleet portal | Application | Viewer | `fleet_tenant=NZ`, QUERIER on demo-dbt |
| cba | CommBank | CBA Broker Book `/apps/ff500766` | Application | Manager | chat scoped to the Demo Connection 2 model; Hub user QUERIER |
| syd | Kernel | Kernel Advisor Hub `/apps/59ee8ab5?ap--persona=advisor` | Single content | Viewer | connection VIEWER |
| armin | Kernel | same, `persona=firm` | Application | Manager | connection QUERIER |
| cory | Kernel | same, `persona=ops` | Application | Viewer | connection QUERIER |
| acenda | Acenda Life | Life Insurance Insights `/apps/d8895f47` | Application | Manager | `tenant_extension=acenda` |
| education | Education | dashboard `/dashboards/a6d31aba` + App `/apps/a810a3e6` | — | — | rejects a password |

**With password:** `summer` / `endowus` (Endowus Portfolio), `vincent` / `endowus` (Endowus Fintech App Analytics).

**Default SEATAC brand (any password):** `fish` / fish@omni.co (region all), `clive@omni.co` and `east` (east), `anika` / anika@omni.co and `west` (west). Any other username also lands here, unvalidated.

---

## 8. Omni-side setup (on `trial.omniapp.co`)

| Thing | ID / value |
|---|---|
| demo-dbt connection (Beamtree, Fleet, Kernel, Acenda) | `aa611249-952f-4a67-a3be-b415a692101b` |
| Demo Connection (CBA, default AI Chat) | `821764ab-1015-4ce7-bde8-65c518127b99` |
| demo-dbt shared model | `1cf4b496-4ff3-4ae1-9b33-59719aa73429` |
| "Demo Connection 2" shared model (CBA; topics Home Loan Applications, Rate Decrease Requests) | `199c89f0-59c0-4406-9006-4b813fbd02a1` |
| Entity folders (Hub) | `omni-system-sso-embed-entity-folder-<entity>` — e.g. `-custom-fleet`, `-beamtree`, `-cba` |
| Apps placed in their brand's folder | Fleet portal → Custom Fleet; Hospital Performance → Beamtree; CBA Broker Book → CBA; Life Insurance Insights → Acenda |

Move an app into a folder: `PUT /api/v1/documents/<id>/move` with `{"folderPath": "omni-system-sso-embed-entity-folder-<entity>"}`.

**User attributes in use:** `fleet_tenant` (AU/NZ), `tenant_extension` (customfleet, beamtree, kernel, acenda — routes each brand to its shared model extension), `hp_persona`, `hp_hospital_id` (sent as the pattern `%|<id>|%` for a LIKE-wildcard access filter), `hp_landing_page`, `airport_region` (SEATAC).

**Embed quirks:** `userAttributes` must be a URL-encoded JSON string; nonces are single-use; `connectionRoles` / `modelRoles` are JSON strings. A model role only works alongside a base connection role (e.g. connection `VIEWER` + model `RESTRICTED_QUERIER`).

**Beamtree Hospital Performance app source** lives outside the repo, in `omni deals/Beamtree/hospital-performance-rebuild/`: the app HTML is `hospital-performance-omni-app.html`, and `build/publish_perf.py` patches and publishes it (`PUT /api/v2/documents/4d9d2162/draft/app` then `POST …/draft/publish`). `build/make_omni_app.py` regenerates from the template and would restore the old footer text. Customer deal plans for CBA, Acenda, Custom Fleet and Kernel are in `omni deals/`.

---

## 9. Gotchas

1. **GitHub auto-deploy rollback.** Any commit on GitHub `main` (even an image upload) redeploys the old code to production. Fix by pushing `clean-push` to `main` (step 1).
2. **Two Vercel projects.** The parent `Projects/` folder is linked to a different project, `fishtank-bubble`. Always build and deploy from inside `fishtankbubble/`, which is linked to `bubble-play`.
3. **Local dev ≠ production API.** `server.js` duplicates the `/api` routes but lags behind: it doesn't pass `modelRoles` (so CBA's chat scoping only works on Vercel) and has no OneSignal route. Test those on the live site, or port the changes into `server.js`.
4. **Edge cache.** Right after a deploy, the live `index.html` can still point at the old bundle — check with a cache-buster.
5. **Omni app frames are sandboxed** (origin `"null"`). The push bridge accepts `null` only when the portal is the top window. The Beamtree app posts once per app id (`a13c85a0`, `a810a3e6`); the bridge de-duplicates within 5 s.
6. **Brand switching** must use `replaceBrand` (not `updateBrand`), or keys from the previous brand leak into the next.
7. **`clive` collision.** Plain `clive` is Beamtree; `clive@omni.co` is still SEATAC east.
8. **Light brand colours** (CommBank yellow) need `inkColor` for readable text; the Overview picks dark CTA text automatically.
9. A **design-drift plugin hook** errors on every edit (unquoted space in its path). It's harmless; ignore it.

---

## 10. Where things were left / open items

- **Push to GitHub** — 25 local commits plus `docs/` (step 1). Highest priority.
- **AI Chat default topic** — Omni has no documented way to preselect a topic in embedded `/chat`. CBA is scoped to two topics via `modelRoles`; Beamtree's "Hospital Performance" default was never solved. The alternative is `ai_chat_topics` in the model, which affects everyone on that shared model.
- **Deliveries button** in embedded apps — unconfirmed whether Omni apps support deliveries at all. Check the app in Omni directly; if not, a companion dashboard would get the button.
- **Fleet AI Chat and Hub** still use the default Demo Connection rather than demo-dbt, where the fleet data lives. Offered, not done.
- **OneSignal push** — the flag-details fix and the stale-listener removal were deployed but not tested end to end with a real push.
- **CBA AI Chat greeting** shows "Welcome to CommBroker!" and a "Repricing Triage" suggestion — this comes from Omni-side settings, not the portal.
- **NZfleet app header** now reads "Fleet analytics" — changed inside the Omni app, not by the portal.
- `src/ptpink.png` and `src/yellow.png` (uploaded on GitHub) aren't used anywhere yet.
- `/api/proxy-image` has no host allow-list (any URL can be proxied). Worth restricting.

---

## 11. Prompt to start the new Claude Code session

Paste this into the first message, from inside the `fishtankbubble/` folder:

```text
I'm continuing work on Bubble Play, a white-label React + Vite portal that embeds
Omni Analytics per customer login (live at https://bubble-play.vercel.app, Vercel
project "bubble-play" in team fishtankaus-projects, repo fishtankau/bubble-play).

Read docs/HANDOFF.md first — it has the architecture, every login, the Omni IDs,
the deploy procedure and the known gotchas. Secrets are in .env (never commit it);
the server resolves them via api/_omniEnv.js secret profiles.

Ground rules from previous work:
- Deploy only from inside fishtankbubble/ with the prebuilt flow in HANDOFF §5,
  then verify the live bundle hash.
- Before committing, scan the staged diff for secrets.
- Commit locally; ask me before pushing to GitHub.
- New brands follow the existing pattern in src/utils/loginConfig.js (brand
  object + LOGINS map + resolveLogin branch + secret profile).

First, check the open items in HANDOFF §10 and tell me the current state.
```
