// Maps login credentials to the brand + Omni user context that should load.
//
//   summer  / endowus  → Portfolio template
//   vincent / endowus  → Fintech App Analytics template
//   east | west (any)  → default SEATAC Airport brand (region drives the
//                        airport_region access filter on the flights topic)
//   anything else      → default SEATAC brand (region from the user map)
import { defaultBrand } from '../context/BrandContext'
import { industryMocks } from './industryMocks'
import { resolveUser } from './userAttributes'

// Shared logo for the endowus demo logins (Portfolio + Fintech).
const BRAND_LOGO = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSajyN6TVgmNQn-0gGN6PCP_mi_YtXnUd-0hKZG8FFnYI5w2-mSKYZFy24H&s=10'

function slug(s = '') {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

// Build a complete brand object from an industry template — mirrors what the
// (now-removed) Config page used to do when applying a template.
function brandFromMock(mock) {
  return {
    ...defaultBrand,
    ...mock,
    configured: true,
    logo: '',
    logoUrl: BRAND_LOGO,
    embedThemeId: mock.embedThemeId || '',
    aiConnectionId: mock.aiConnectionId || '',
    aiConnectionRole: mock.aiConnectionRole || 'QUERIER',
    // Industry templates don't use the SEATAC airport_region attribute — turning
    // it off also hides the Flights tab (which is Port-of-Seattle specific).
    embedSendRegionAttribute: false,
    embedEntityKey: slug(mock.name) || defaultBrand.embedEntityKey,
  }
}

// Password-gated logins that switch to an industry template.
const INDUSTRY_LOGINS = {
  summer: { password: 'endowus', industry: 'Portfolio' },
  vincent: { password: 'endowus', industry: 'Fintech App Analytics' },
}

export function resolveLogin(rawId, password) {
  const id = (rawId || '').trim().toLowerCase()

  const special = INDUSTRY_LOGINS[id]
  if (special) {
    if (password !== special.password) {
      return { ok: false, error: 'Incorrect password.' }
    }
    const mock = industryMocks[special.industry]
    if (!mock) return { ok: false, error: 'Configuration missing for this login.' }
    return { ok: true, brand: brandFromMock(mock), user: resolveUser(id) }
  }

  // Everyone else → default SEATAC Airport brand. resolveUser maps
  // east/west (and other demo users) to the airport_region attribute.
  return { ok: true, brand: { ...defaultBrand }, user: resolveUser(id) }
}
