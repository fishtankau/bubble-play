import { createContext, useContext, useState } from 'react'

const BrandContext = createContext()

const defaultBrand = {
  // Pre-configured so the Config page skips its auto-scan-on-mount and
  // shows these baked-in SEATAC defaults verbatim. Users can still click
  // Scan to refresh from the live portseattle.org site if they want.
  configured: true,
  url: 'https://www.portseattle.org/sea-tac',
  name: 'SEATAC AIRPORT',
  logo: '',
  logoUrl: 'https://www.portseattle.org/themes/portseattleflysea/logo.svg',
  primaryColor: '#16a34a',
  secondaryColor: '#1a1a1a',
  description: '',
  keyMessages: ['SEATAC'],
  products: [],
  // Secrets are resolved server-side from env (see api/_omniEnv.js). The client
  // only carries a non-secret sentinel + the vanityDomain used to pick the env.
  omniApiKey: 'env',
  embedSecret: 'env',
  embedVanityDomain: 'trial.omniapp.co',
  embedDashboardPath: '/dashboards/a73297b4',
  embedThemeId: '096bbffc-fa73-48c3-b7b8-5fbe9366fd96',
  // AI Chat defaults to "All Connections" mode with RESTRICTED_QUERIER.
  // Empty `aiConnectionId` triggers the AIChat tab to loop through
  // `allConnections` instead of pinning a single one. `allConnections`
  // is pre-seeded with the trial Omni's Demo Connection so the tab
  // works on first launch; Config page overwrites this from
  // /api/omni-connections when a different API key is entered.
  aiConnectionId: '',
  aiConnectionRole: 'RESTRICTED_QUERIER',
  allConnections: [
    { id: '821764ab-1015-4ce7-bde8-65c518127b99', name: 'Demo Connection', dialect: 'snowflake', database: 'ANALYTICS_PROD' },
  ],
  // Hub tab (Omni APPLICATION mode with per-brand entity folder)
  embedEntityKey: 'portseattle',
  // MANAGER so embed users can open/edit dashboards inside their entity
  // folder and create new ones. Lower it to EDITOR/VIEWER per brand
  // via the Config page if you need a more locked-down view.
  embedEntityFolderRole: 'MANAGER',
  embedHubGroups: 'All Embed Users',
  // Whether to send the `region` user attribute on embed SSO. Turn off
  // for Omni instances that don't define a `region` attribute, otherwise
  // Omni rejects the request with: "The provided user attributes do not
  // match the names of existing user attributes."
  embedSendRegionAttribute: true,
}

export function BrandProvider({ children }) {
  const [brand, setBrand] = useState(defaultBrand)
  const [currentUser, setCurrentUser] = useState(null)

  const updateBrand = (data) => {
    setBrand(prev => ({ ...prev, ...data, configured: true }))
  }

  const resetBrand = () => setBrand(defaultBrand)

  return (
    <BrandContext.Provider value={{ brand, updateBrand, resetBrand, currentUser, setCurrentUser }}>
      {children}
    </BrandContext.Provider>
  )
}

export function useBrand() {
  const ctx = useContext(BrandContext)
  if (!ctx) throw new Error('useBrand must be used within BrandProvider')
  return ctx
}
