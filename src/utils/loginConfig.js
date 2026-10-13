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

const EDUCATION_BRAND = {
  ...defaultBrand,
  configured: true,
  name: 'Education',
  logo: '',
  logoUrl: '/logos/education.svg',
  primaryColor: '#2563eb',
  secondaryColor: '#0f172a',
  description: 'A connected view of student outcomes, enrollment, and the day-to-day work that supports every learner.',
  keyMessages: ['Better insights for every learner.'],
  products: [],
  omniApiKey: 'env',
  embedSecret: 'env',
  embedSecretProfile: 'education-dashboard',
  embedVanityDomain: 'trial.omniapp.co',
  embedDashboardPath: '/dashboards/a6d31aba',
  embedThemeId: '479284cf-da03-4107-805d-f757bdb9bc09',
  embedAppPath: '/apps/a810a3e6',
  embedAppSecretProfile: 'education-app',
  embedAppVanityDomain: 'omni.demo.exploreomni.dev',
  embedAppThemeId: '',
  embedSendRegionAttribute: false,
  embedEntityKey: 'education',
}

export function resolveLogin(rawId, password) {
  const id = (rawId || '').trim().toLowerCase()

  if (id === 'education') {
    if ((password || '').trim()) {
      return { ok: false, error: 'Education login does not use a password.' }
    }
    return {
      ok: true,
      brand: EDUCATION_BRAND,
      user: { ...resolveUser(id), externalId: 'education-demo-user', name: 'Education Demo User' },
    }
  }

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
