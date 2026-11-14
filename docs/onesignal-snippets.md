# OneSignal web push — code snippets

How push works in this portal, in the order a notification travels:

1. **Browser subscribes** — the portal loads the OneSignal Web SDK and registers the service worker.
2. **Something asks for a push** — either the bell button in the header, or an embedded Omni app posting a message to the portal.
3. **The portal's server sends it** — `/api/onesignal-send-template` calls the OneSignal REST API with the server-only key.

Embedded Omni apps can't call OneSignal themselves (their HTML runs in a sandboxed frame), so they hand the request to the parent portal with `postMessage`.

| Setting | Where | Value |
|---|---|---|
| OneSignal App ID (public) | `VITE_ONESIGNAL_APP_ID` (client), `ONESIGNAL_APP_ID` (server) | defaults to `34b0ba78-2d0f-4762-855f-9a34900c5ea9` |
| REST API key (secret) | `ONESIGNAL_REST_API_KEY` — Vercel env only, never a `VITE_` variable | — |
| Template | `TEMPLATE_ID` in the API route | `efe57c9b-a8f2-48e9-b6c4-51e73e0475e6` |
| Audience for broadcasts | OneSignal segment | `Total Subscriptions` |
| Web Push site URL (OneSignal dashboard) | | `https://bubble-play.vercel.app` |

---

## 1. Service worker — `public/OneSignalSDKWorker.js`

Served from the site root so it can control the whole origin.

```js
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
```

## 2. Load and initialise the SDK — `src/utils/oneSignal.js`

Loads the SDK once; safe to call from several places.

```js
const ONESIGNAL_SDK_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
const appId = import.meta.env.VITE_ONESIGNAL_APP_ID || '34b0ba78-2d0f-4762-855f-9a34900c5ea9'

let initialization

/** Loads OneSignal once and initializes it when the app ID is configured. */
export function initializeOneSignal() {
  if (!appId) return Promise.resolve(null)
  if (initialization) return initialization

  initialization = new Promise((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(async OneSignal => {
      try {
        await OneSignal.init({
          appId,
          serviceWorkerPath: '/OneSignalSDKWorker.js',
        })
        resolve(OneSignal)
      } catch (error) {
        reject(error)
      }
    })

    const script = document.createElement('script')
    script.src = ONESIGNAL_SDK_URL
    script.defer = true
    script.onerror = () => reject(new Error('Could not load the OneSignal Web SDK.'))
    document.head.appendChild(script)
  })

  return initialization
}

export function isOneSignalConfigured() {
  return Boolean(appId)
}
```

Called once when the dashboard mounts (`src/components/Dashboard.jsx`):

```jsx
useEffect(() => {
  if (!isOneSignalConfigured()) return
  initializeOneSignal().catch(error => console.error('OneSignal initialization failed:', error))
}, [])
```

## 3. Bell button — broadcast to all subscribers (`src/components/Dashboard.jsx`)

Sends with no `action`/`message`, so OneSignal uses the template's own copy.

```jsx
const [pushSending, setPushSending] = useState(false)
const [pushFeedback, setPushFeedback] = useState('')

const handlePushClick = useCallback(async ({ quiet = false } = {}) => {
  if (pushSending) return
  setPushFeedback('')
  setPushSending(true)
  try {
    const response = await fetch('/api/onesignal-send-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sendToAll: true }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || 'Could not send the push message.')
  } catch (error) {
    console.error('Could not send the OneSignal broadcast:', error)
    if (!quiet) setPushFeedback(error.message || 'Could not send the push message.')
  } finally {
    setPushSending(false)
  }
}, [pushSending])
```

```jsx
{isOneSignalConfigured() && (
  <button
    className="btn-icon"
    onClick={() => handlePushClick()}
    title="Send a push message to all subscribers"
    aria-label="Send a push message to all subscribers"
    disabled={pushSending}
  >
    <Bell size={20} />
  </button>
)}

{pushFeedback && (
  <div role="status" aria-live="polite" style={{ position: 'fixed', top: 72, right: 16, zIndex: 1000, padding: '10px 14px', borderRadius: 8, background: '#fff', color: '#312e81', boxShadow: '0 4px 18px rgba(15, 23, 42, 0.18)', fontSize: 13 }}>
    {pushFeedback}
  </div>
)}
```

## 4. Push bridge — receive requests from embedded Omni apps (`src/components/Dashboard.jsx`)

The single `message` listener for push requests. It:

- accepts `bubble-play:send-push` and `fishtank:onesignal-send`;
- only trusts Omni embed hosts, or the sandboxed app frame (origin `"null"`) when the portal is the top-level window;
- builds the notification body from whichever app's fields are present;
- collapses identical requests within 5 seconds (apps post once per app id);
- replies `<type>:result` so the app can confirm the hand-off.

```jsx
const lastPushRef = useRef({ key: '', at: 0 })
useEffect(() => {
  const EMBED_HOST_SUFFIXES = ['.embed-omniapp.co', '.omniapp.co', '.exploreomni.dev']
  const PUSH_TYPES = new Set(['bubble-play:send-push', 'fishtank:onesignal-send'])
  const str = (v, max = 120) => (typeof v === 'string' ? v.slice(0, max) : '')

  // Omni runs an app's custom HTML inside a sandboxed frame, which gets an
  // opaque origin reported as the string "null". We still accept those, but
  // only when this page is the top-level window (so nobody has framed the
  // portal) and the message came from a frame below us.
  const isTrustedEmbedOrigin = (origin, source) => {
    if (origin === 'null' || origin === '') {
      return window.top === window.self && source !== window.self && source !== window.parent
    }
    try {
      const host = new URL(origin).hostname.toLowerCase()
      return EMBED_HOST_SUFFIXES.some(sfx => host.endsWith(sfx))
    } catch { return false }
  }

  const onMessage = async event => {
    const data = event.data
    if (!data || typeof data !== 'object' || !PUSH_TYPES.has(data.type)) return
    if (!isTrustedEmbedOrigin(event.origin, event.source)) {
      console.warn('[push] rejected: untrusted origin', event.origin)
      setPushFeedback(`Push blocked: untrusted origin ${event.origin}`)
      setTimeout(() => setPushFeedback(''), 4000)
      return
    }

    const action = str(data.action) || 'Fleet action'
    // An explicit message wins; otherwise build one from whichever app's
    // fields are present (Custom Fleet: rego/driver/depot; Beamtree:
    // flag title, hospital, indicator, episode, description).
    const detail = str(data.message, 200) || [
      str(data.rego, 32), str(data.driver, 48), str(data.depot, 48),
      str(data.title, 80), str(data.hospitalName, 48), str(data.indicator, 60),
      str(data.episodeKey, 32) && `Episode ${str(data.episodeKey, 32)}`,
      str(data.description, 120),
    ].filter(Boolean).join(' · ').slice(0, 200)

    // The embedded app posts once per OneSignal app id, but the portal sends to
    // its single configured app — collapse identical payloads within 5s.
    const dedupeKey = `${action}|${detail}`
    const now = Date.now()
    if (lastPushRef.current.key === dedupeKey && now - lastPushRef.current.at < 5000) return
    lastPushRef.current = { key: dedupeKey, at: now }

    let ok = false
    let why = ''
    try {
      const res = await fetch('/api/onesignal-send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendToAll: true, action, message: detail }),
      })
      ok = res.ok
      if (!ok) why = await res.text()
    } catch (err) {
      why = String(err)
    }
    setPushFeedback(ok ? `Push sent · ${action}` : `Push failed · ${why.slice(0, 90)}`)
    setTimeout(() => setPushFeedback(''), 4000)

    // Reply so the app can confirm the hand-off actually landed.
    try {
      event.source?.postMessage(
        { type: `${data.type}:result`, ok, action, appId: str(data.appId, 64) },
        event.origin,
      )
    } catch { /* the frame may already be gone */ }
  }

  window.addEventListener('message', onMessage)
  return () => window.removeEventListener('message', onMessage)
}, [])
```

## 5. Send endpoint — `api/onesignal-send-template.js` (Vercel serverless)

Holds the REST API key server-side. `sendToAll` targets the `Total Subscriptions` segment; otherwise it needs a single `subscriptionId`. When `action` is supplied it overrides the template heading, and `message` overrides the body.

```js
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '34b0ba78-2d0f-4762-855f-9a34900c5ea9';
const TEMPLATE_ID = 'efe57c9b-a8f2-48e9-b6c4-51e73e0475e6';
const ALL_SUBSCRIPTIONS_SEGMENT = 'Total Subscriptions';
const ALLOWED_ORIGINS = new Set([
  'https://omni.demo.exploreomni.dev',
  'https://bubble-play.vercel.app',
]);

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const sendToAll = req.body?.sendToAll === true;

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return res.status(403).json({ error: 'This request origin is not allowed' });
  }

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) {
      return res.status(403).json({ error: 'This request origin is not allowed' });
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (sendToAll && (!origin || !ALLOWED_ORIGINS.has(origin))) {
    return res.status(403).json({ error: 'Broadcast requests must come from an allowed app origin' });
  }

  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'OneSignal sending is not configured on the server' });
  }

  const asText = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const action = asText(req.body?.action, 120);
  const message = asText(req.body?.message, 200);

  const subscriptionId = req.body?.subscriptionId;
  if (!sendToAll && (typeof subscriptionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(subscriptionId))) {
    return res.status(400).json({ error: 'A valid OneSignal subscription ID is required' });
  }

  try {
    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        Authorization: `Key ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        target_channel: 'push',
        ...(sendToAll
          ? { included_segments: [ALL_SUBSCRIPTIONS_SEGMENT] }
          : { include_subscription_ids: [subscriptionId] }),
        template_id: TEMPLATE_ID,
        // An app-supplied action/message overrides the template's own copy.
        ...(action ? { headings: { en: action } } : {}),
        ...(action && message ? { contents: { en: message } } : {}),
      }),
      signal: AbortSignal.timeout(15000),
    });

    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
    if (!response.ok) {
      console.error('OneSignal send failed:', response.status, data);
      return res.status(response.status).json({ error: 'OneSignal could not send the push message' });
    }

    // OneSignal can return HTTP 200 without creating a message (e.g. no
    // eligible subscribers). Don't report that as a successful send.
    if (typeof data.id !== 'string' || !data.id) {
      return res.status(409).json({
        error: 'OneSignal did not create a push message because no eligible subscribed browsers matched the audience.',
      });
    }

    return res.status(200).json({ id: data.id });
  } catch (error) {
    console.error('OneSignal request failed:', error.message);
    return res.status(502).json({ error: 'Could not reach OneSignal' });
  }
}
```

Route in `vercel.json`:

```json
{ "source": "/api/onesignal-send-template", "destination": "/api/onesignal-send-template" }
```

## 6. Sender inside an embedded Omni app (Beamtree Hospital Performance app)

From the app's custom HTML. It posts to the top window for each portal origin; `postMessage` only delivers when the target origin matches the actual parent, so only the portal that's embedding the app receives it.

```js
const PUSH_APP_IDS = ["a13c85a0", "a810a3e6"];

function sendPush(msg) {
  try {
    PUSH_APP_IDS.forEach(appId => {
      const m = Object.assign({}, msg, { appId });
      window.top.postMessage(Object.assign({ type: "fishtank:onesignal-send" }, m), "https://fishtankbubble.vercel.app");
      window.top.postMessage(Object.assign({ type: "bubble-play:send-push" }, m), "https://bubble-play.vercel.app");
    });
    return true;
  } catch (err) { console.error("Push handoff to parent portal failed:", err); return false; }
}

// Example: when an episode is flagged
sendPush({
  action: "Episode flagged",          // → notification heading
  title: row.title,                   // ┐
  hospitalName: row.hospital_name,    // │ joined with " · " into the
  indicator: indicatorName,           // │ notification body (max 200 chars)
  episodeKey: row.episode_key,        // │
  description: row.description,       // ┘
  // or pass `message: "..."` to set the body directly
});
```

Optional — listen for the portal's confirmation:

```js
window.addEventListener("message", e => {
  if (e.data && e.data.type === "bubble-play:send-push:result") {
    console.log("Push", e.data.ok ? "sent" : "failed", e.data.action);
  }
});
```
