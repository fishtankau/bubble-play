// Proxies the Omni "create schedule" REST API so the API key never reaches the
// browser. Docs: https://docs.omni.co/api/schedules/create-schedule
//   POST https://{host}/api/v1/schedules
//   Authorization: Bearer <orgApiKey|PAT>
import { resolveApiKey } from './_omniEnv.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      vanityDomain,
      identifier,      // dashboard id, e.g. "645cf6e2"
      name,
      schedule,        // AWS EventBridge cron, e.g. "0 9 ? * MON *"
      timezone,
      format,          // csv | json | pdf | png | xlsx | link_only
      recipients,      // string | string[]
      subject,
      textBody,
      destinationType, // email | slack | webhook | sftp | s3
    } = req.body || {};
    const apiKey = resolveApiKey(req.body);

    if (!apiKey) return res.status(400).json({ error: 'apiKey is not configured on the server' });
    if (!identifier) return res.status(400).json({ error: 'identifier (dashboard id) is required' });
    if (!schedule) return res.status(400).json({ error: 'schedule (cron expression) is required' });

    const recipientList = Array.isArray(recipients)
      ? recipients.filter(Boolean)
      : (recipients ? [recipients] : []);
    const type = destinationType || 'email';
    if ((type === 'email' || type === 'slack') && recipientList.length === 0) {
      return res.status(400).json({ error: 'At least one recipient is required' });
    }

    const omniHost = vanityDomain || 'trial.omniapp.co';
    const body = {
      identifier,
      name: name || 'Scheduled delivery',
      schedule,
      timezone: timezone || 'UTC',
      format: format || 'pdf',
      destinationType: type,
      recipients: recipientList,
    };
    if (type === 'email') body.subject = subject || body.name;
    if (textBody) body.textBody = textBody;

    const response = await fetch(`https://${omniHost}/api/v1/schedules`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || data.error || `Failed to create schedule (HTTP ${response.status})`,
        detail: data,
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Omni create-schedule error:', err.message);
    res.status(500).json({ error: 'Failed to create schedule: ' + err.message });
  }
}
