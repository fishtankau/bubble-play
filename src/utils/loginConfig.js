// Maps login credentials to the brand + Omni user context that should load.
//
//   clive   (no pass)  → Beamtree, executive · Magnolia Regional (2RC) · Observe
//   ashima  (no pass)  → Beamtree, clinician · Hillcrest Medical (4VH) · Explore
//   conor   (no pass)  → Beamtree, analyst · Poppy Regional (U7Q) · Analyse
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
export const CUSTOM_FLEET_LOGO = 'https://roadtrafficaccidenttrust.org.nz/wp-content/uploads/2025/07/Custom-Fleet-logo-5cmx5cm-002.png'

// Custom Fleet's own homepage hero photo, served from their Contentful CDN
// (sized/compressed by the CDN's own query params).
const CUSTOM_FLEET_HERO = 'https://images.ctfassets.net/9g4sdlwetik5/4pC2DgQvInIoTRaMV2OmhB/86e6bb02d40af17c483e904e2136d3da/AU_home_page_hero_v2.jpg?w=2000&q=72'

// The single consolidated Omni app that sits between AI Chat and Hub.
const FLEET_APP_TABS = [
  { id: 'fleet-portal', label: 'Fleet portal', path: '/apps/8d10cf9f' },
]

const FLEET_CONSOLE_BRAND = {
  ...defaultBrand,
  configured: true,
  name: 'Custom Fleet',
  logo: '',
  logoUrl: CUSTOM_FLEET_LOGO,
  heroImage: CUSTOM_FLEET_HERO,
  primaryColor: '#D6001C',
  secondaryColor: '#1A1A1A',
  description: 'Fleet expertise and technology combined, so organisations across Australia and New Zealand can manage their vehicles with more confidence.',
  keyMessages: [
    'Intelligence in motion.',
    'Safer, more efficient, future-ready. Move with greater confidence every day.',
    'Turn data into progress. Predictive insights that surface efficiencies before they cost you.',
    'Sustainability is not an add-on. Electrification and decarbonisation planned into the fleet.',
  ],
  // Visual Overview copy (rendered by OverviewVisual).
  overview: {
    eyebrow: 'Custom Fleet · Fleet Console',
    chatCta: 'Ask about the fleet',
    features: [
      {
        icon: 'gauge',
        eyebrow: 'Cost & utilisation',
        title: 'See exactly what the fleet costs',
        body: 'Total cost of ownership, leases ending, under-used vehicles, idle fuel and after-hours driving — every depot in one view, refreshed daily.',
        points: ['Cost vs budget by department', 'Leases ending in the next 6 months', 'Under-used vehicles worth right-sizing'],
        metric: '$6.1M',
        caption: 'Total fleet cost · last 12 months',
      },
      {
        icon: 'shield',
        eyebrow: 'Safety & compliance',
        title: 'Spot risk before it becomes a claim',
        body: 'Driver behaviour, harsh events and compliance gaps surfaced early, so you can act on the vehicles and depots that need attention first.',
        points: ['Driver risk scoring by depot', 'Harsh braking and speeding trends', 'Compliance gaps flagged automatically'],
        metric: '17%',
        caption: 'Share of km outside 7am–6pm',
      },
      {
        icon: 'coach',
        eyebrow: 'Action & coaching',
        title: 'Turn insight into a next step',
        body: 'Assign coaching, book servicing or flag a vehicle as idle straight from the data — the action goes to the right person without leaving the portal.',
        points: ['Assign coaching in one click', 'Book servicing from the vehicle record', 'Track what has actually been actioned'],
        metric: '270',
        caption: 'Vehicles under management',
      },
    ],
    productIcons: ['wrench', 'shield', 'leaf', 'car', 'wallet', 'chart'],
    servicesSub: 'Fleet expertise across the whole lifecycle — from funding and maintenance to safety and electrification.',
    ctaTitle: 'Ready to look at your fleet?',
    ctaSub: 'Jump straight into the numbers, or ask a question in plain English.',
  },
  // Trust markers taken from customfleet.com.au.
  stats: [
    { value: '1,600+', label: 'Customers across A & NZ' },
    { value: '40+', label: 'Years in fleet' },
    { value: '55+', label: 'Countries via Element-Arval' },
    { value: 'A & NZ', label: 'Operating markets' },
  ],
  products: [
    { name: 'Fleet Management', description: 'End-to-end support across accident management, insurance, maintenance and tyres, roadside assistance, registration, fuel cards and tolls.' },
    { name: 'Telematics & Driver Safety', description: 'Data-driven tools, including the Drive app, to support safer driving and lower risk across the fleet.' },
    { name: 'EV Transition', description: 'Fleet electrification and decarbonisation advisory to cut emissions and plan the move to electric.' },
    { name: 'Operating Leasing', description: 'Business lease options including sale and leaseback, Next Lease, and tailored offers for small business fleets.' },
    { name: 'Novated Leasing', description: 'Salary-packaged vehicle leasing for employees, bundled with insurance, calculators and current offers.' },
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

// ── Beamtree (Clinical Informatics) ───────────────────────────────────────
// Brand identity and imagery from beamtree.com.au. Secrets resolve server-side
// from BEAMTREE_* env vars via the 'beamtree' secret profile.
export const BEAMTREE_LOGO = 'https://beamtree.com.au/wp-content/themes/beamtree/assets/dist/images/logo-colored.svg'
const BEAMTREE_HERO = 'https://beamtree.com.au/wp-content/uploads/2021/08/Home-Image01-1.jpg'

// The Hospital Performance topic lives on the demo-dbt model, on this
// connection — the embed grants QUERIER on it.
const BEAMTREE_CONNECTION_ID = 'aa611249-952f-4a67-a3be-b415a692101b'

const BEAMTREE_APP_TABS = [
  { id: 'hospital-performance', label: 'Hospital Performance', path: '/apps/4d9d2162' },
]

const BEAMTREE_BRAND = {
  ...defaultBrand,
  configured: true,
  name: 'Beamtree',
  logo: '',
  logoUrl: BEAMTREE_LOGO,
  // Routed through the image proxy: it's a WordPress upload, not a CDN asset,
  // so hotlink rules on their side could otherwise block it.
  heroImage: `/api/proxy-image?url=${encodeURIComponent(BEAMTREE_HERO)}`,
  primaryColor: '#754FD0',
  secondaryColor: '#1B1446',
  description: 'The Australian company setting new standards in healthcare data to improve quality, safety and efficiency around the world.',
  keyMessages: [
    'Better has no limit.',
    'It all starts with better data. Clinical records coded and validated to best practice, so every measure stands up.',
    'Benchmark with confidence. Real-time safety and quality information compared against peer hospitals.',
    'And ends in better care. Decision support that turns performance data into better patient outcomes.',
  ],
  // Trust markers taken from beamtree.com.au.
  stats: [
    { value: '1,000+', label: 'Locations implemented' },
    { value: '20+', label: 'Years in healthcare data' },
    { value: '3', label: 'Views: Observe · Explore · Analyse' },
    { value: 'Global', label: 'Hospitals, clinics & pathology labs' },
  ],
  products: [
    { name: 'Clinical Coding', description: 'The computer coding of clinical records to ensure best practice, so the data behind every indicator can be trusted.' },
    { name: 'Safety & Quality', description: 'Real-time management information, benchmarking, enhanced surveillance and compliance across the hospital.' },
    { name: 'Reporting', description: 'Customisable decision support that helps clinical and executive teams inform and manage.' },
    { name: 'Patient Outcomes', description: 'Better patient outcomes through analysis and education, from the ward to the board.' },
    { name: 'PICQ', description: 'Performance indicators for coding quality — automated checks that flag coding errors before they reach reporting.' },
    { name: 'RippleDown', description: 'A knowledge-based rules engine that automates pathology result validation and interpretive reporting.' },
  ],
  overview: {
    eyebrow: 'Beamtree · Clinical Informatics',
    primaryCta: 'Open Hospital Performance',
    chatCta: 'Ask about hospital performance',
    heroLinksStatic: true,
    heroLinks: [
      { label: 'Observe — how is my hospital tracking?', icon: 'eye' },
      { label: 'Explore — who is affected and where?', icon: 'compass' },
      { label: 'Analyse — what is behind the number?', icon: 'microscope' },
    ],
    features: [
      {
        icon: 'eye',
        eyebrow: 'Observe',
        title: 'See how your hospital is tracking',
        body: 'Indicator cards, peer comparison, a four-year trend and a forecast band for every key measure — your hospital against its peers at a glance.',
        points: ['Peer comparison on every indicator', 'Four-year trend with a forecast band', 'Flags where you sit outside the expected range'],
        metric: '4-yr',
        caption: 'Trend and forecast per indicator',
        linkLabel: 'Open Observe',
      },
      {
        icon: 'compass',
        eyebrow: 'Explore',
        title: 'Understand who is affected',
        body: 'Break indicators down by age group and diagnostic category to see where outcomes differ, so clinical governance can focus where it matters.',
        points: ['Splits by age group', 'Splits by major diagnostic category', 'Benchmarked against all participating hospitals'],
        metric: '180',
        caption: 'Hospitals in the benchmark universe',
        linkLabel: 'Open Explore',
      },
      {
        icon: 'microscope',
        eyebrow: 'Analyse',
        title: 'Get to the episode behind the number',
        body: 'Drill from an indicator to the individual admitted episodes and emergency presentations that drive it, and see exactly what to review.',
        points: ['Admitted episode detail', 'Emergency presentations', 'Episode-level benchmark across hospitals'],
        metric: '1 click',
        caption: 'From indicator to the episodes behind it',
        linkLabel: 'Open Analyse',
      },
    ],
    productIcons: ['clipboard', 'shield', 'report', 'heart', 'activity', 'brain'],
    servicesSub: 'Healthcare data solutions for hospitals, clinics and pathology labs — from coding quality to decision support.',
    ctaTitle: 'Ready to see how your hospital performs?',
    ctaSub: 'Open Hospital Performance, or ask a question in plain English.',
  },
  omniApiKey: 'env',
  embedSecret: 'env',
  embedSecretProfile: 'beamtree',
  embedVanityDomain: 'trial.omniapp.co',
  embedDashboardPath: BEAMTREE_APP_TABS[0].path,
  embedThemeId: '',
  // Querier on the Hospital Performance connection, for every embed.
  aiConnectionId: BEAMTREE_CONNECTION_ID,
  aiConnectionRole: 'QUERIER',
  allConnections: [],
  embedConnectionRoles: { [BEAMTREE_CONNECTION_ID]: 'QUERIER' },
  // No airport_region (hides Flights), but DO send the hp_* attributes.
  embedSendRegionAttribute: false,
  embedSendUserAttributes: true,
  showDashboardTab: false,
  appTabs: BEAMTREE_APP_TABS,
  embedEntityKey: 'Beamtree',
  embedEntityFolderRole: 'EDITOR',
}

// hp_hospital_id feeds an access filter with SQL LIKE wildcards against a
// pipe-delimited `visible_to` column (e.g. "|2RC|3TU|…|"), so it must be sent
// as the pattern "%|<id>|%". The model's Viewer view strips the wrapping back
// off for display. Hospital IDs come from se_sandbox_fish__hp_dim_hospital.
const BEAMTREE_LOGINS = {
  clive: {
    name: 'Clive', persona: 'executive', hospitalId: '2RC', hospital: 'Magnolia Regional',
    landing: 'Observe', mode: 'SINGLE_CONTENT', folderRole: 'EDITOR',
  },
  ashima: {
    name: 'Ashima', persona: 'clinician', hospitalId: '4VH', hospital: 'Hillcrest Medical',
    landing: 'Explore', mode: 'SINGLE_CONTENT', folderRole: 'EDITOR',
  },
  conor: {
    name: 'Conor', persona: 'analyst', hospitalId: 'U7Q', hospital: 'Poppy Regional',
    landing: 'Analyse', mode: 'APPLICATION', folderRole: 'MANAGER',
  },
}

// ── CommBank (CBA) ─────────────────────────────────────────────────────
// Brand identity, copy and imagery from commbank.com.au/home-loans/offers.html.
// No Omni credentials were supplied for CBA, so its embeds use the default
// SEATAC instance until a dedicated profile is added.
export const CBA_LOGO = 'https://www.commbank.com.au/content/dam/commbank/commBank-logo.svg'
const CBA_HERO = 'https://assets.commbank.com.au/is/image/commbank/CNCB0594?wid=2000'
// "Demo Connection" and its "Demo Connection 2" shared model on trial.omniapp.co.
const CBA_CONNECTION_ID = '821764ab-1015-4ce7-bde8-65c518127b99'
const CBA_CHAT_MODEL_ID = '199c89f0-59c0-4406-9006-4b813fbd02a1'

const CBA_BRAND = {
  ...defaultBrand,
  configured: true,
  name: 'CommBank',
  logo: '',
  logoUrl: CBA_LOGO,
  heroImage: `/api/proxy-image?url=${encodeURIComponent(CBA_HERO)}`,
  primaryColor: '#FFCC00',
  secondaryColor: '#000000',
  // Yellow is too light for text on white, so copy and icons use near-black.
  inkColor: '#1a1a1a',
  description: 'Take advantage of our current home loan offers that could help with your new, existing or next property.',
  keyMessages: [
    'Home loan offers that give you more.',
    'Earn 100,000 Yello points. Apply online and settle an eligible home loan of $100,000 or more.',
    'Get at least 0.10% off your rate. On eligible Simple and Standard Variable Rate home loans with a minimum balance of $150,000.',
    'Settle with $699 conveyancing. Home-in guides you through the process with real-time updates in its app.',
  ],
  // Offer figures taken from the home loan offers page.
  stats: [
    { value: '100,000', label: 'Yello points on an eligible home loan' },
    { value: '0.10%', label: 'At least off the advertised rate' },
    { value: '$699', label: 'Conveyancing with Home-in' },
    { value: '24,000', label: 'Yello points a year with Amber Electric' },
  ],
  products: [
    { name: 'Home loan offers', description: 'Earn 100,000 CommBank Yello points when you apply online and settle an eligible home loan.' },
    { name: 'Rate discount', description: 'At least 0.10% p.a. off the advertised rate on eligible Simple and Standard Variable Rate home loans.' },
    { name: 'Home-in conveyancing', description: '$699 conveyancing, six-hour contract reviews and one of the industry\'s best on-time settlement rates.' },
    { name: 'More nbn & mobile', description: '$25 off monthly on new More nbn plans for 36 months, and Yello points on new services.' },
    { name: 'Amber Electric', description: 'Earn up to 24,000 CommBank Yello points per year when you sign up with Amber Electric.' },
    { name: 'Exclusive access', description: 'Mastercard presale and preferred tickets to shows, plus money-can\'t-buy experiences.' },
  ],
  overview: {
    eyebrow: 'CommBank · Home loans',
    primaryCta: 'View Dashboards',
    chatCta: 'Ask about your offers',
    heroLinksStatic: true,
    heroLinks: [
      { label: 'Offers — earn points', icon: 'gift' },
      { label: 'Banking — earn points', icon: 'home' },
      { label: 'Perks — for your tier', icon: 'ticket' },
    ],
    features: [
      {
        icon: 'home',
        eyebrow: 'Home loan offers',
        title: 'More from your next property',
        body: 'Current offers for new, existing or next property — Yello points when you settle, a discount off the advertised rate and $699 conveyancing.',
        points: ['100,000 Yello points on an eligible home loan', 'At least 0.10% p.a. off eligible variable rates', '$699 conveyancing with Home-in'],
        metric: '100,000',
        caption: 'Yello points when you apply online and settle',
        linkLabel: 'View the dashboards',
      },
      {
        icon: 'gift',
        eyebrow: 'CommBank Yello',
        title: 'Rewards for banking with us',
        body: 'CommBank Yello is our customer recognition program — discounts, points and exclusive access, our way of thanking you for banking with us.',
        points: ['Earn points on More nbn and mobile plans', 'Up to 24,000 points a year with Amber Electric', 'Presale and preferred tickets with Mastercard'],
        metric: '24,000',
        caption: 'Yello points a year with Amber Electric',
        linkLabel: 'Ask about your points',
        target: 'aichat',
      },
      {
        icon: 'chat',
        eyebrow: "We're here to help",
        title: 'Help when you need it',
        body: 'Book a Home Loan Specialist, manage your loan online, or get instant help from our virtual assistant and specialists.',
        points: ['Book an appointment at a time that suits you', 'Redraw or change repayments online', 'Message us for instant help'],
        metric: '6 hrs',
        caption: 'Target for Home-in contract reviews',
        linkLabel: 'Open the Hub',
        target: 'hub',
      },
    ],
    productIcons: ['home', 'percent', 'key', 'phone', 'leaf', 'ticket'],
    servicesEyebrow: 'Benefits and offers',
    servicesSub: 'Offers and discounts for CommBank home loan customers. Eligibility criteria and T&Cs apply.',
    ctaTitle: 'Ready to make the most of your home loan?',
    ctaSub: 'Explore the dashboards, or ask a question in plain English.',
  },
  // AI Chat is scoped to the "Demo Connection 2" shared model (topics: Home
  // Loan Applications, Rate Decrease Requests). VIEWER on the connection keeps
  // its other models out of the topic picker; the model role lifts this one
  // to querying.
  aiConnectionId: CBA_CONNECTION_ID,
  aiConnectionRole: 'VIEWER',
  aiModelRoles: { [CBA_CHAT_MODEL_ID]: 'RESTRICTED_QUERIER' },
  allConnections: [],
  // The Hub signs in as a separate embed user: connection QUERIER, content
  // MANAGER on the CBA entity folder.
  hubConnectionRole: 'QUERIER',
  embedEntityFolderRole: 'MANAGER',
  // No airport_region (hides Flights) and no user attributes for this brand.
  embedSendRegionAttribute: false,
  embedSendUserAttributes: false,
  embedEntityKey: 'CBA',
}

const CBA_LOGINS = {
  cba: { name: 'CommBank Demo User' },
}

// fleet_tenant drives the Omni access filter for the Custom Fleet apps.
const FLEET_LOGINS = {
  aufleet: {
    tenant: 'AU', name: 'AU Fleet', market: 'Australia',
    primaryColor: '#2563EB', secondaryColor: '#0B2545',
  },
  nzfleet: {
    tenant: 'NZ', name: 'NZ Fleet', market: 'Aotearoa New Zealand',
    primaryColor: '#0E9F8E', secondaryColor: '#06332F',
  },
}

// The logo is specific to the Custom Fleet logins, so the login screen only
// shows it once one of those usernames is typed.
export function loginLogoFor(rawId) {
  return loginBrandFor(rawId)?.logo || null
}

// Logo + name to show on the login card once a branded username is typed.
export function loginBrandFor(rawId) {
  const id = (rawId || '').trim().toLowerCase()
  if (FLEET_LOGINS[id]) return { logo: CUSTOM_FLEET_LOGO, name: 'Custom Fleet' }
  if (BEAMTREE_LOGINS[id]) return { logo: BEAMTREE_LOGO, name: 'Beamtree' }
  if (CBA_LOGINS[id]) return { logo: CBA_LOGO, name: 'CommBank' }
  return null
}

// Logins that take no password (the field hides itself in the UI).
const PASSWORDLESS_LOGINS = new Set(['education', ...Object.keys(FLEET_LOGINS), ...Object.keys(BEAMTREE_LOGINS), ...Object.keys(CBA_LOGINS)])

export function isPasswordlessLogin(rawId) {
  return PASSWORDLESS_LOGINS.has((rawId || '').trim().toLowerCase())
}

export function resolveLogin(rawId, password) {
  const id = (rawId || '').trim().toLowerCase()

  // Beamtree — no password. Each login carries its persona, hospital and
  // landing page as hp_* attributes, plus its own embed mode and folder role.
  // NB: 'clive' used to be a SEATAC east user; Beamtree now takes precedence
  // (the email form clive@omni.co still resolves to SEATAC).
  const bt = BEAMTREE_LOGINS[id]
  if (bt) {
    return {
      ok: true,
      brand: {
        ...BEAMTREE_BRAND,
        description: `Healthcare data that improves quality, safety and efficiency — showing ${bt.hospital} against its peer hospitals.`,
      },
      user: {
        ...resolveUser(id),
        name: bt.name,
        embedMode: bt.mode,
        entityFolderRole: bt.folderRole,
        userAttributes: {
          hp_persona: bt.persona,
          hp_hospital_id: `%|${bt.hospitalId}|%`,
          hp_landing_page: bt.landing,
        },
      },
    }
  }

  // CommBank — no password; visual Overview, default SEATAC embeds.
  const cba = CBA_LOGINS[id]
  if (cba) {
    return {
      ok: true,
      brand: CBA_BRAND,
      user: { ...resolveUser(id), name: cba.name },
    }
  }

  // Custom Fleet — no password; fleet_tenant scopes the data to AU or NZ.
  const fleet = FLEET_LOGINS[id]
  if (fleet) {
    return {
      ok: true,
      brand: {
        ...FLEET_CONSOLE_BRAND,
        // AU gets the blue interface, NZ the green one.
        primaryColor: fleet.primaryColor,
        secondaryColor: fleet.secondaryColor,
        description: `Fleet expertise and technology combined, so organisations across ${fleet.market} can manage their vehicles with more confidence.`,
      },
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
