// Resolves Omni secrets from server-side environment variables so the real
// API keys and embed secrets never live in the source or the client bundle.
//
// The client sends a non-secret sentinel ('env') for `apiKey` / `secret` plus
// the (non-secret) `vanityDomain`. We map the domain to the matching env var.
// A REAL value in the request body (e.g. the Config page's custom-site scan,
// where a user pastes their own key) always takes precedence.
//
// Env vars (set locally in .env and in the Vercel project):
//   OMNI_API_KEY / OMNI_EMBED_SECRET            → omni.demo.exploreomni.dev
//   SEATAC_OMNI_API_KEY / SEATAC_EMBED_SECRET   → trial.omniapp.co (default brand)
const SENTINELS = new Set(['', 'env', '__env__']);

function isSentinel(v) {
  return v == null || SENTINELS.has(String(v));
}

function hostOf(vanityDomain = '') {
  return String(vanityDomain).replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
}

export function resolveApiKey(body = {}) {
  if (!isSentinel(body.apiKey)) return body.apiKey;
  const host = hostOf(body.vanityDomain);
  if (host.includes('trial.omniapp.co')) return process.env.SEATAC_OMNI_API_KEY || '';
  if (host.includes('exploreomni')) return process.env.OMNI_API_KEY || '';
  return process.env.OMNI_API_KEY || process.env.SEATAC_OMNI_API_KEY || '';
}

export function resolveEmbedSecret(body = {}) {
  if (!isSentinel(body.secret)) return body.secret;
  const host = hostOf(body.vanityDomain);
  if (host.includes('trial.omniapp.co')) return process.env.SEATAC_EMBED_SECRET || '';
  if (host.includes('exploreomni')) return process.env.OMNI_EMBED_SECRET || '';
  return process.env.OMNI_EMBED_SECRET || process.env.SEATAC_EMBED_SECRET || '';
}
