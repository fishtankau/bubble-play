const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '34b0ba78-2d0f-4762-855f-9a34900c5ea9';
const TEMPLATE_ID = 'efe57c9b-a8f2-48e9-b6c4-51e73e0475e6';
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
          ? { included_segments: ['Subscribed Users'] }
          : { include_subscription_ids: [subscriptionId] }),
        template_id: TEMPLATE_ID,
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

    return res.status(200).json({ id: data.id || null });
  } catch (error) {
    console.error('OneSignal request failed:', error.message);
    return res.status(502).json({ error: 'Could not reach OneSignal' });
  }
}
