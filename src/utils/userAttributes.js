// Maps a login identifier (email or username) to the Omni user context
// that gets passed through the embed SSO JWT.
//
// The `airport_region` attribute drives the Omni access filter on the
// `demo__airline_delay_cause` topic:
//   - east  -> east-coast airports only
//   - west  -> west-coast airports only
//   - other -> everything else
//   - all   -> unrestricted (admin) via values_for_unfiltered
//
// Add more users by dropping them into USER_MAP.

const USER_MAP = {
  'fish@omni.co':   { region: 'all',   name: 'Fish (Admin)' },
  'clive@omni.co':  { region: 'east',  name: 'Clive — East' },
  'anika@omni.co':  { region: 'west',  name: 'Anika — West' },
  // Short-form logins also supported
  'fish':  { region: 'all',   name: 'Fish (Admin)' },
  'east':  { region: 'east',  name: 'East User' },
  'clive': { region: 'east',  name: 'Clive — East' },
  'west':  { region: 'west',  name: 'West User' },
  'anika': { region: 'west',  name: 'Anika — West' },
}

// What to send as `userAttributes` on the embed SSO request.
//
// Kept separate from `embedSendRegionAttribute` (which only controls whether the
// Port-of-Seattle Flights tab is available) so a brand can send its own
// attributes — e.g. the Custom Fleet `fleet_tenant` — without exposing Flights.
// Empty objects are returned as undefined so Omni never receives `userAttributes={}`.
export function embedUserAttributes(brand, user) {
  if (brand?.embedSendUserAttributes === false) return undefined
  const attrs = user?.userAttributes
  if (!attrs || typeof attrs !== 'object' || Object.keys(attrs).length === 0) return undefined
  return attrs
}

export function resolveUser(rawId) {
  const id = (rawId || '').trim().toLowerCase()
  const matched = USER_MAP[id]
  const region = matched?.region || 'other'
  const name = matched?.name || (id ? id.split('@')[0] : 'Guest')
  const externalId = id || 'guest'
  // Omni's SSO populates the `omni_user_email` system attribute from this.
  // Ensure it's always a valid-looking email so downstream filters using
  // system attributes don't choke on a bare username.
  const email = id.includes('@') ? id : `${(id || 'guest').replace(/[^a-z0-9._-]/g, '')}@fishtank.local`

  return {
    externalId,
    email,
    name,
    region,
    isAdmin: region === 'all',
    // The payload that gets URL-encoded and sent as `userAttributes`
    // in the Omni SSO generate-url request.
    userAttributes: { airport_region: region },
  }
}
