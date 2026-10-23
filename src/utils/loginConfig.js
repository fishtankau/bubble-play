// Maps login credentials to the brand + Omni user context that should load.
//
//   AUfleet (no pass)  → Custom Fleet "Fleet Console", fleet_tenant = AU
//   NZfleet (no pass)  → Custom Fleet "Fleet Console", fleet_tenant = NZ
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
    embedSendUserAttributes: false,
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
  embedSendUserAttributes: false,
  embedEntityKey: 'education',
}

// ── Custom Fleet (Fleet Console) ──────────────────────────────────────────
// Brand identity from customfleet.com.au; logo straight from Fleet Office.
// Secrets resolve server-side from FLEET_* env vars via the 'fleet-console'
// secret profile, so only the non-secret sentinel lives here.
export const CUSTOM_FLEET_LOGO = 'https://securelogin.customfleet.com/customfleet/resources/image/cpfo/CF_HeaderLogo.svg'

// The three Omni apps that sit between AI Chat and Hub.
const FLEET_APP_TABS = [
  { id: 'fleet-cost', label: 'Fleet cost & utilisation', path: '/apps/1c141a04' },
  { id: 'driver-safety', label: 'Driver safety & compliance', path: '/apps/5321c938' },
  { id: 'safety-coaching', label: 'Safety action & coaching centre', path: '/apps/3bc764c4' },
]

const FLEET_CONSOLE_BRAND = {
  ...defaultBrand,
  configured: true,
  name: 'Custom Fleet',
  logo: '',
  logoUrl: CUSTOM_FLEET_LOGO,
  primaryColor: '#D6001C',
  secondaryColor: '#1A1A1A',
  description: 'Fleet expertise and technology combined, so organisations across Australia and New Zealand can manage their vehicles with more confidence.',
  keyMessages: [
    'Intelligence in motion.',
    'Safer, more efficient, future-ready. Move with greater confidence every day.',
    'Turn data into progress. Predictive insights that surface efficiencies before they cost you.',
    'Sustainability is not an add-on. Electrification and decarbonisation planned into the fleet.',
  ],
  products: [
    { name: 'Fleet Management', description: 'End-to-end support across accident management, insurance, maintenance and tyres, roadside assistance, registration, fuel cards and tolls.' },
    { name: 'Telematics & Driver Safety', description: 'Data-driven tools, including the Drive app, to support safer driving and lower risk across the fleet.' },
    { name: 'EV Transition', description: 'Fleet electrification and decarbonisation advisory to cut emissions and plan the move to electric.' },
    { name: 'Strategic Advisory', description: 'Data-led consulting on cost pressure, regulatory change, utilisation reviews and transition planning.' },
  ],
  omniApiKey: 'env',
  embedSecret: 'env',
  embedSecretProfile: 'fleet-console',
  embedVanityDomain: 'trial.omniapp.co',
  embedDashboardPath: FLEET_APP_TABS[0].path,
  embedThemeId: '',
  // No airport_region (hides Flights), but DO send fleet_tenant.
  embedSendRegionAttribute: false,
  embedSendUserAttributes: true,
  // The three app tabs replace the generic Dashboard tab for this brand.
  showDashboardTab: false,
  appTabs: FLEET_APP_TABS,
  // Hub entity folder, plus the same three apps surfaced inside it.
  embedEntityKey: 'Custom Fleet',
  hubApps: FLEET_APP_TABS,
}

// fleet_tenant drives the Omni access filter for the Custom Fleet apps.
const FLEET_LOGINS = {
  aufleet: { tenant: 'AU', name: 'AU Fleet' },
  nzfleet: { tenant: 'NZ', name: 'NZ Fleet' },
}

// Logins that take no password (the field hides itself in the UI).
const PASSWORDLESS_LOGINS = new Set(['education', ...Object.keys(FLEET_LOGINS)])

export function isPasswordlessLogin(rawId) {
  return PASSWORDLESS_LOGINS.has((rawId || '').trim().toLowerCase())
}

export function resolveLogin(rawId, password) {
  const id = (rawId || '').trim().toLowerCase()

  // Custom Fleet — no password; fleet_tenant scopes the data to AU or NZ.
  const fleet = FLEET_LOGINS[id]
  if (fleet) {
    return {
      ok: true,
      brand: { ...FLEET_CONSOLE_BRAND },
      user: {
        ...resolveUser(id),
        name: fleet.name,
        userAttributes: { fleet_tenant: fleet.tenant },
      },
    }
  }

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
