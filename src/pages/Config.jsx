import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBrand } from '../context/BrandContext'
import { generatePalette } from '../utils/colors'
import { domainToEntityKey } from '../utils/domain'
import { INDUSTRY_OPTIONS, industryMocks } from '../utils/industryMocks'
import {
  ArrowLeft, Search, Loader2, CheckCircle2, ExternalLink,
  Palette, MonitorDot, MessageCircle, Key, RefreshCw, FolderKanban,
  Sparkles, Plus, X
} from 'lucide-react'

export default function Config() {
  const navigate = useNavigate()
  const { brand, updateBrand } = useBrand()
  const [url, setUrl] = useState(brand.url || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scanned, setScanned] = useState(brand.configured)
  const [editData, setEditData] = useState(brand.configured ? { ...brand } : null)

  // Omni API fetch state
  const [omniLoading, setOmniLoading] = useState(false)
  const [omniError, setOmniError] = useState('')
  const [dashboards, setDashboards] = useState([])
  const [connections, setConnections] = useState([])
  const [omniFetched, setOmniFetched] = useState(false)

  // User attribute check state
  const [attrStatus, setAttrStatus] = useState(null) // null | 'checking' | 'exists' | 'missing' | 'error'
  const [attrMessage, setAttrMessage] = useState('')

  // The baked-in SEATAC defaults. Used to detect whether the user has
  // moved off the default brand/Omni instance — survives navigation back
  // to /config (a useRef snapshot wouldn't, because the component
  // remounts and re-snapshots the new brand as "initial").
  // Secrets live server-side (env); the client uses the 'env' sentinel.
  const SEATAC_API_KEY = 'env'
  const SEATAC_EMBED_SECRET = 'env'

  // Industry template selection — derive from brand state on mount so it
  // persists across navigation. We match an industry by api key + dashboard
  // path (api key alone isn't unique since all 10 industries share one).
  const [selectedIndustry, setSelectedIndustry] = useState(() => {
    const startBrand = brand.configured ? brand : null
    if (!startBrand) return ''
    for (const [industry, mock] of Object.entries(industryMocks)) {
      if (mock.omniApiKey && mock.embedDashboardPath
          && mock.omniApiKey === startBrand.omniApiKey
          && mock.embedDashboardPath === startBrand.embedDashboardPath) {
        return industry
      }
    }
    return ''
  })

  // Show the "User Attribute — region" section only when the user is still
  // on the default SEATAC instance. The moment they swap to a different
  // Omni instance (industry template or manual creds change), hide it.
  const omniCredsChanged = !!editData && (
    (editData.omniApiKey || '') !== SEATAC_API_KEY ||
    (editData.embedSecret || '') !== SEATAC_EMBED_SECRET
  )

  // Pull only the Omni-related config forward across scans. Brand identity
  // (name, logo, colors, description, products) is replaced by the scraper
  // so scanning a different site produces a fresh look.
  const pickOmniConfig = (source) => ({
    omniApiKey: source?.omniApiKey,
    embedSecret: source?.embedSecret,
    embedVanityDomain: source?.embedVanityDomain,
    embedDashboardPath: source?.embedDashboardPath,
    embedThemeId: source?.embedThemeId,
    aiConnectionId: source?.aiConnectionId,
    aiConnectionRole: source?.aiConnectionRole,
    allConnections: source?.allConnections,
    // Hub role/groups persist across scans; entity key re-derives from new URL
    embedEntityFolderRole: source?.embedEntityFolderRole,
    embedHubGroups: source?.embedHubGroups,
  })

  const handleScan = async (urlOverride) => {
    // Guard: onClick passes a SyntheticEvent — only treat string args as URL overrides.
    const override = typeof urlOverride === 'string' ? urlOverride : null
    const targetUrl = (override ?? url).trim()
    if (!targetUrl) return
    setLoading(true)
    setError('')
    setScanned(false)
    // New scan = fresh Omni data fetch
    setOmniFetched(false)
    autoOmniStarted.current = false

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scrape failed')

      // Keep Omni config, but let the scraper drive brand identity entirely
      // so a new URL yields a new look (logo, colors, name, description).
      // Entity key re-derives from the scanned URL (domain's first label).
      const derivedEntity = domainToEntityKey(data.url || targetUrl)
      setEditData(prev => ({
        ...pickOmniConfig(prev ?? brand),
        logoUrl: '', // clear stale custom logo so scraped logo takes over
        ...data,
        embedEntityKey: derivedEntity || prev?.embedEntityKey || brand.embedEntityKey || '',
      }))
      setScanned(true)
    } catch (err) {
      setError(err.message)
      setEditData(prev => ({
        ...pickOmniConfig(prev ?? brand),
        name: 'My Brand',
        url: targetUrl,
        logo: '',
        logoUrl: '',
        primaryColor: '#2563eb',
        secondaryColor: '#1e293b',
        description: '',
        keyMessages: [],
        products: [],
      }))
      setScanned(true)
    } finally {
      setLoading(false)
    }
  }

  const fetchOmniData = useCallback(async () => {
    const apiKey = editData?.omniApiKey
    const vanityDomain = editData?.embedVanityDomain
    if (!apiKey) {
      setOmniError('Enter an Omni API key first')
      return
    }

    setOmniLoading(true)
    setOmniError('')
    setDashboards([])
    setConnections([])

    try {
      const [dashRes, connRes] = await Promise.all([
        fetch('/api/omni-dashboards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey, vanityDomain })
        }),
        fetch('/api/omni-connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey, vanityDomain })
        })
      ])

      const dashData = await dashRes.json()
      const connData = await connRes.json()

      if (!dashRes.ok) throw new Error(dashData.error || 'Failed to fetch dashboards')
      if (!connRes.ok) throw new Error(connData.error || 'Failed to fetch connections')

      // Extract dashboard items from content response
      const contentItems = dashData.records || dashData.content || dashData || []
      const dashList = (Array.isArray(contentItems) ? contentItems : [])
        .filter(item => item.type === 'document' || item.contentPath?.startsWith('/dashboards') || item.contentPath?.startsWith('/workbooks'))
        .map(item => ({
          id: item.id || item.identifier,
          name: item.name || item.title || item.id,
          contentPath: item.contentPath || `/dashboards/${item.identifier || item.id}`,
        }))

      // Extract connections
      const connList = (connData.connections || connData.records || connData || [])
        .map(conn => ({
          id: conn.id,
          name: conn.name || conn.id,
          dialect: conn.dialect || '',
          database: conn.database || '',
        }))

      setDashboards(dashList)
      setConnections(connList)
      setOmniFetched(true)

      // Save all connections to brand context so embed tabs can use them
      updateField('allConnections', connList)

      // Auto-select first dashboard if none selected
      if (dashList.length > 0 && !editData.embedDashboardPath) {
        updateField('embedDashboardPath', dashList[0].contentPath)
      }

      // Auto-select an AI Chat connection. Prefer a Snowflake connection
      // (most common analytics warehouse for these demos); otherwise pick
      // whatever's first in the list. Only fires when nothing is already
      // selected so manual overrides stick.
      if (connList.length > 0 && !editData.aiConnectionId) {
        const snowflake = connList.find(c =>
          (c.dialect || '').toLowerCase() === 'snowflake' ||
          (c.name || '').toLowerCase().includes('snowflake')
        )
        updateField('aiConnectionId', (snowflake || connList[0]).id)
      }
    } catch (err) {
      setOmniError(err.message)
    } finally {
      setOmniLoading(false)
    }
  }, [editData?.omniApiKey, editData?.embedVanityDomain])

  // Auto-scan on mount if we have a default URL and haven't scanned yet
  const autoScanStarted = useRef(false)
  useEffect(() => {
    if (autoScanStarted.current) return
    if (scanned || loading) return
    if (!url.trim()) return
    autoScanStarted.current = true
    handleScan(url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-fetch Omni data once we have an API key and scan has completed
  const autoOmniStarted = useRef(false)
  useEffect(() => {
    if (autoOmniStarted.current) return
    if (!scanned || !editData?.omniApiKey) return
    if (omniLoading || omniFetched) return
    autoOmniStarted.current = true
    fetchOmniData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanned, editData?.omniApiKey])

  const handleSave = () => {
    if (!editData) return
    updateBrand(editData)
    navigate('/output')
  }

  const updateField = (field, value) => {
    setEditData(prev => {
      const next = { ...prev, [field]: value }
      // If the user is swapping Omni instances (new API key or embed
      // secret), auto-disable the `region` user attribute — the new
      // instance likely doesn't define it, and Omni 400s on unknown
      // attribute names. The section also auto-hides via omniCredsChanged.
      if (field === 'omniApiKey' || field === 'embedSecret') {
        const apiKey = field === 'omniApiKey' ? value : (prev?.omniApiKey || '')
        const secret = field === 'embedSecret' ? value : (prev?.embedSecret || '')
        const changed = apiKey !== SEATAC_API_KEY || secret !== SEATAC_EMBED_SECRET
        if (changed) next.embedSendRegionAttribute = false
      }
      return next
    })
  }

  const handleDashboardSelect = (contentPath) => {
    updateField('embedDashboardPath', contentPath)
  }

  // Key Messages — editable list (used in hero tagline + value cards)
  const updateKeyMessage = (idx, value) => {
    setEditData(prev => {
      const next = [...(prev?.keyMessages || [])]
      next[idx] = value
      return { ...prev, keyMessages: next }
    })
  }
  const removeKeyMessage = (idx) => {
    setEditData(prev => ({
      ...prev,
      keyMessages: (prev?.keyMessages || []).filter((_, i) => i !== idx),
    }))
  }
  const addKeyMessage = () => {
    setEditData(prev => ({
      ...prev,
      keyMessages: [...(prev?.keyMessages || []), ''],
    }))
  }

  // Products / Services — editable list
  const updateProduct = (idx, field, value) => {
    setEditData(prev => {
      const next = [...(prev?.products || [])]
      next[idx] = { ...(next[idx] || {}), [field]: value }
      return { ...prev, products: next }
    })
  }
  const removeProduct = (idx) => {
    setEditData(prev => ({
      ...prev,
      products: (prev?.products || []).filter((_, i) => i !== idx),
    }))
  }
  const addProduct = () => {
    setEditData(prev => ({
      ...prev,
      products: [...(prev?.products || []), { name: '', description: '', image: '' }],
    }))
  }

  // Apply an industry template — overwrites brand identity fields but
  // preserves Omni config, the scanned URL, and the scraped logo (in case
  // the user wants the real logo with a templated identity).
  const applyIndustryMock = (industry) => {
    const mock = industryMocks[industry]
    if (!mock) return
    // Derive the Hub entity key from the mock brand name — lowercase,
    // alphanumeric + hyphens only, with whitespace collapsed to hyphens.
    // e.g. "Vitalis Health" → "vitalis-health".
    const derivedEntity = (mock.name || '')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    // If the mock carries a different Omni instance (api key OR vanity OR
    // secret), drop stale connection/dashboard state so the Config page
    // re-fetches against the new instance.
    const switchingInstance = !!mock.omniApiKey && (
      mock.omniApiKey !== editData?.omniApiKey ||
      mock.embedVanityDomain !== editData?.embedVanityDomain ||
      mock.embedSecret !== editData?.embedSecret
    )
    setSelectedIndustry(industry)
    setEditData(prev => ({
      ...pickOmniConfig(prev ?? brand),
      url: prev?.url || url,
      logo: prev?.logo || '',
      logoUrl: prev?.logoUrl || '',
      ...mock,
      // If the mock doesn't carry a theme ID, force it to empty so the
      // synthesized customTheme is used (otherwise the SEATAC theme would
      // bleed into industry instances that don't have it).
      embedThemeId: mock.embedThemeId || '',
      embedEntityKey: derivedEntity || prev?.embedEntityKey || brand.embedEntityKey || '',
      // Industries don't use the SEATAC `airport_region` access filter,
      // so turn it off — this auto-hides the Flights tab in the dashboard.
      embedSendRegionAttribute: false,
      // AI Chat connection. If the mock pins a specific connection ID
      // (e.g. Entertainment → MotherDuck), honor it. Otherwise clear to ''
      // so fetchOmniData's auto-pick (Snowflake-first) takes over.
      aiConnectionId: mock.aiConnectionId || '',
      // AI Chat connection role — every industry defaults to QUERIER
      // (industries' demo dashboards typically need write/query access).
      // Mocks can still override via mock.aiConnectionRole.
      aiConnectionRole: mock.aiConnectionRole || 'QUERIER',
      // Hub entity-folder role — respect whatever the user picked in the
      // Config button group (prev value) so switching industries doesn't
      // clobber their manual selection. A mock can still pin a role, and
      // we fall back to MANAGER only when nothing has been chosen yet.
      embedEntityFolderRole: mock.embedEntityFolderRole || prev?.embedEntityFolderRole || brand.embedEntityFolderRole || 'MANAGER',
      // Clear the cached connection list when swapping instances so the
      // Config page re-fetches against the new Omni instance.
      ...(switchingInstance ? { allConnections: [] } : {}),
    }))
    if (switchingInstance) {
      setDashboards([])
      setConnections([])
      setOmniFetched(false)
      autoOmniStarted.current = false
    }
    // Make sure the results section is visible after picking
    setScanned(true)
    setError('')
  }

  const handleConnectionSelect = (connId) => {
    updateField('aiConnectionId', connId === '__all__' ? '' : connId)
  }

  const checkAirportRegionAttr = async () => {
    if (!editData?.omniApiKey) {
      setAttrStatus('error')
      setAttrMessage('Enter an Omni API key first')
      return
    }
    setAttrStatus('checking')
    setAttrMessage('')
    try {
      const res = await fetch('/api/omni-user-attributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: editData.omniApiKey,
          vanityDomain: editData.embedVanityDomain || '',
          name: 'airport_region',
          type: 'string',
        }),
      })
      const data = await res.json()
      if (data.exists) {
        setAttrStatus('exists')
        setAttrMessage('airport_region user attribute is configured in Omni.')
      } else if (data.created) {
        setAttrStatus('exists')
        setAttrMessage('Created airport_region via API.')
      } else {
        setAttrStatus('missing')
        setAttrMessage(data.instructions || data.error || 'Attribute is missing.')
      }
    } catch (err) {
      setAttrStatus('error')
      setAttrMessage(err.message)
    }
  }

  const palette = editData ? generatePalette(editData.primaryColor) : null

  return (
    <div className="config-page">
      <div className="config-header">
        <button className="btn-icon" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Brand Configuration</h1>
      </div>

      <div className="config-content">
        {/* Scan box auto-hides once an industry template is selected OR
            the user has switched off the default SEATAC Omni instance.
            The two flows are mutually exclusive (scan a real URL OR pick
            a mock industry). Clear the industry to bring it back. */}
        {!selectedIndustry && !omniCredsChanged && (
          <div className="config-scan-section">
            <label className="config-label">Website URL</label>
            <div className="config-input-row">
              <input
                type="text"
                className="config-input"
                placeholder="e.g. nike.com, apple.com, stripe.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan()}
              />
              <button className="btn btn-primary" onClick={() => handleScan()} disabled={loading || !url.trim()}>
                {loading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
                {loading ? 'Scanning...' : 'Scan'}
              </button>
            </div>
            {error && (
              <p className="config-error">
                {error} — pick a sample industry below to populate the Overview page, or edit the defaults manually.
              </p>
            )}
          </div>
        )}

        <div className="config-section config-industry-section">
          <h3>
            <Sparkles size={18} /> Industry Template
            {error && <span className="config-industry-eyebrow">— recommended</span>}
          </h3>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 1.6 }}>
            Pick an industry or function to populate brand name, description, colors, key messages,
            and products with a realistic mock — useful when a site can't be scanned or when you want
            a quick demo. Your Omni config and scanned URL are preserved.
          </p>
          <div className="config-button-group">
            {INDUSTRY_OPTIONS.map(opt => {
              const active = selectedIndustry === opt
              const accent = (editData?.primaryColor) || '#6366f1'
              return (
                <button
                  key={opt}
                  type="button"
                  className={`config-option-btn ${active ? 'active' : ''}`}
                  style={active ? { background: accent, color: '#fff', borderColor: accent } : {}}
                  onClick={() => active ? setSelectedIndustry('') : applyIndustryMock(opt)}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>

        {scanned && editData && (
          <div className="config-results">
            <div className="config-section">
              <h3><CheckCircle2 size={18} /> Brand Identity</h3>
              <div className="config-grid">
                <div className="config-field">
                  <label>Brand Name</label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={e => updateField('name', e.target.value)}
                  />
                </div>
                <div className="config-field">
                  <label>Scraped Logo (auto-detected)</label>
                  <div className="config-logo-row">
                    <input
                      type="text"
                      value={editData.logo}
                      onChange={e => updateField('logo', e.target.value)}
                      placeholder="Auto-detected from site"
                    />
                    {editData.logo && (
                      <img
                        src={editData.logo.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(editData.logo)}` : editData.logo}
                        alt="Logo"
                        className="config-logo-preview"
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    )}
                  </div>
                </div>
                <div className="config-field full-width">
                  <label>Logo URL (used in login & dashboard — paste your own logo URL here)</label>
                  <div className="config-logo-row">
                    <input
                      type="text"
                      value={editData.logoUrl || ''}
                      onChange={e => updateField('logoUrl', e.target.value)}
                      placeholder="e.g. https://example.com/logo.png"
                    />
                    {editData.logoUrl && (
                      <img
                        src={editData.logoUrl.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(editData.logoUrl)}` : editData.logoUrl}
                        alt="Custom Logo"
                        className="config-logo-preview"
                        style={{ height: 40, width: 'auto', maxWidth: 120 }}
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    )}
                  </div>
                </div>
                <div className="config-field full-width">
                  <label>Description</label>
                  <textarea
                    rows={2}
                    value={editData.description}
                    onChange={e => updateField('description', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="config-section">
              <h3><Palette size={18} /> Theme Colors</h3>
              <div className="config-color-row">
                <div className="config-color-field">
                  <label>Primary Color</label>
                  <div className="config-color-input">
                    <input
                      type="color"
                      value={editData.primaryColor}
                      onChange={e => updateField('primaryColor', e.target.value)}
                    />
                    <input
                      type="text"
                      value={editData.primaryColor}
                      onChange={e => updateField('primaryColor', e.target.value)}
                    />
                  </div>
                </div>
                <div className="config-color-field">
                  <label>Secondary Color</label>
                  <div className="config-color-input">
                    <input
                      type="color"
                      value={editData.secondaryColor}
                      onChange={e => updateField('secondaryColor', e.target.value)}
                    />
                    <input
                      type="text"
                      value={editData.secondaryColor}
                      onChange={e => updateField('secondaryColor', e.target.value)}
                    />
                  </div>
                </div>
                {palette && (
                  <div className="config-palette-preview">
                    <label>Generated Palette</label>
                    <div className="palette-swatches">
                      {Object.entries(palette).map(([key, color]) => (
                        <div key={key} className="swatch" style={{ background: color }} title={`${key}: ${color}`} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="config-section">
              <h3>Key Messages</h3>
              <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12, lineHeight: 1.5 }}>
                The first message becomes the hero tagline. The next 1–4 become value cards on the Overview page.
              </p>
              <div className="config-messages-edit">
                {(editData.keyMessages || []).map((msg, i) => (
                  <div key={i} className="config-message-row">
                    <span className="config-message-num">{i + 1}</span>
                    <input
                      type="text"
                      className="config-message-input"
                      value={msg}
                      placeholder={i === 0 ? 'Hero tagline (e.g. "Build software at the speed of thought.")' : 'Value card line'}
                      onChange={e => updateKeyMessage(i, e.target.value)}
                    />
                    <button
                      type="button"
                      className="config-message-remove"
                      onClick={() => removeKeyMessage(i)}
                      aria-label="Remove this line"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button type="button" className="config-message-add" onClick={addKeyMessage}>
                  <Plus size={14} /> Add message
                </button>
              </div>
            </div>

            <div className="config-section">
              <h3>Products / Services {editData.products?.length > 0 && `(${editData.products.length})`}</h3>
              <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12, lineHeight: 1.5 }}>
                Each card appears in the "Our Brands" section on the Overview page. Remove empty entries or edit names/descriptions inline.
              </p>
              <div className="config-products-edit">
                {(editData.products || []).map((p, i) => (
                  <div key={i} className="config-product-edit-card">
                    <div className="config-product-edit-header">
                      <span className="config-product-edit-num">{i + 1}</span>
                      <input
                        type="text"
                        className="config-product-edit-name"
                        value={p.name || ''}
                        placeholder="Product / service name"
                        onChange={e => updateProduct(i, 'name', e.target.value)}
                      />
                      <button
                        type="button"
                        className="config-message-remove"
                        onClick={() => removeProduct(i)}
                        aria-label="Remove this product"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      className="config-product-edit-desc"
                      value={p.description || ''}
                      placeholder="Short description (optional)"
                      onChange={e => updateProduct(i, 'description', e.target.value)}
                    />
                    {p.image && (
                      <img
                        src={`/api/proxy-image?url=${encodeURIComponent(p.image)}`}
                        alt={p.name}
                        className="config-product-edit-thumb"
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    )}
                  </div>
                ))}
                <button type="button" className="config-message-add" onClick={addProduct}>
                  <Plus size={14} /> Add product
                </button>
              </div>
            </div>

            <div className="config-section">
              <h3><FolderKanban size={18} /> Hub Tab (Entity Folder)</h3>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 1.6 }}>
                The Hub tab embeds Omni in <strong>APPLICATION mode</strong> scoped to a per-brand
                entity folder. Omni auto-provisions the folder on first SSO using the entity key below.
                Access filters still apply — each user sees only their region's content.
              </p>
              <div className="config-grid">
                <div className="config-field full-width">
                  <label>Entity Key</label>
                  <input
                    type="text"
                    value={editData.embedEntityKey || ''}
                    onChange={e => updateField('embedEntityKey', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="e.g. portseattle, mypassglobal"
                  />
                  <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 }}>
                    URL-safe key (lowercase, alphanumeric, hyphens). Re-scanning a new URL updates this automatically.
                  </span>
                </div>
                <div className="config-field full-width">
                  <label>Entity Folder Content Role</label>
                  <div className="config-button-group">
                    {['VIEWER', 'EDITOR', 'MANAGER', 'NO_ACCESS'].map(r => {
                      const active = (editData.embedEntityFolderRole || 'MANAGER') === r
                      return (
                        <button
                          key={r}
                          type="button"
                          className={`config-option-btn ${active ? 'active' : ''}`}
                          style={active ? { background: editData.primaryColor, color: '#fff', borderColor: editData.primaryColor } : {}}
                          onClick={() => updateField('embedEntityFolderRole', r)}
                        >
                          {r}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="config-field full-width">
                  <label>Groups (comma-separated)</label>
                  <input
                    type="text"
                    value={editData.embedHubGroups || ''}
                    onChange={e => updateField('embedHubGroups', e.target.value)}
                    placeholder="All Embed Users"
                  />
                </div>
              </div>
            </div>

            <div className="config-section">
              <h3><MessageCircle size={18} /> AI Chat Settings</h3>
              <div className="config-grid">
                <div className="config-field full-width">
                  <label>Connection</label>
                  {connections.length > 0 ? (
                    <select
                      value={editData.aiConnectionId || '__all__'}
                      onChange={e => handleConnectionSelect(e.target.value)}
                      className="config-select"
                    >
                      <option value="__all__">All Connections</option>
                      {connections.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.dialect ? ` (${c.dialect})` : ''}{c.database ? ` — ${c.database}` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={editData.aiConnectionId || ''}
                      onChange={e => updateField('aiConnectionId', e.target.value)}
                      placeholder="e.g. c0f12353-4817-4398-bcc0-d501e6dd2f64"
                    />
                  )}
                </div>
                <div className="config-field full-width">
                  <label>Connection Role</label>
                  <select
                    value={editData.aiConnectionRole || 'RESTRICTED_QUERIER'}
                    onChange={e => updateField('aiConnectionRole', e.target.value)}
                    className="config-select"
                  >
                    <option value="RESTRICTED_QUERIER">RESTRICTED_QUERIER (recommended)</option>
                    <option value="QUERIER">QUERIER</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12 }}>
                The AI Chat tab embeds Omni's AI agent. It requires an Embed Secret (above) and a Connection ID to query data.
              </p>
            </div>

            {/* ============================================================
                Advanced — Omni backend configuration (collapsed by default)
                ============================================================ */}
            <div className="config-advanced-divider">
              <span>Advanced — Omni configuration</span>
            </div>

            <details className="config-section config-collapsible">
              <summary>
                <h3><Key size={18} /> Omni API Key</h3>
              </summary>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 1.6 }}>
                Enter your Omni organization API key or personal access token to auto-populate dashboards and connections below.
              </p>
              <div className="config-grid">
                <div className="config-field full-width">
                  <label>API Key (from Omni Settings → API Keys)</label>
                  <div className="config-input-row">
                    <input
                      type="password"
                      value={editData.omniApiKey || ''}
                      onChange={e => updateField('omniApiKey', e.target.value)}
                      placeholder="Enter your Omni API key"
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none' }}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={fetchOmniData}
                      disabled={omniLoading || !editData.omniApiKey}
                    >
                      {omniLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                      {omniLoading ? 'Fetching...' : 'Fetch'}
                    </button>
                  </div>
                </div>
                <div className="config-field">
                  <label>Vanity Domain (optional)</label>
                  <input
                    type="text"
                    value={editData.embedVanityDomain || ''}
                    onChange={e => updateField('embedVanityDomain', e.target.value)}
                    placeholder="e.g. trial.embed-omniapp.co"
                  />
                </div>
              </div>
              {omniError && <p className="config-error" style={{ marginTop: 8 }}>{omniError}</p>}
              {omniFetched && !omniError && (
                <p style={{ fontSize: 12, color: '#10b981', marginTop: 8, fontWeight: 600 }}>
                  <CheckCircle2 size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Found {dashboards.length} dashboard{dashboards.length !== 1 ? 's' : ''} and {connections.length} connection{connections.length !== 1 ? 's' : ''}
                </p>
              )}
            </details>

            <details className="config-section config-collapsible">
              <summary>
                <h3><MonitorDot size={18} /> Omni Embed Settings</h3>
              </summary>
              <div className="config-grid">
                <div className="config-field full-width">
                  <label>Embed Secret (from Omni Settings → Embed → Admin)</label>
                  <input
                    type="password"
                    value={editData.embedSecret || ''}
                    onChange={e => updateField('embedSecret', e.target.value)}
                    placeholder="32-character embed secret"
                  />
                </div>
                <div className="config-field full-width">
                  <label>Dashboard Path</label>
                  {dashboards.length > 0 ? (
                    <select
                      value={editData.embedDashboardPath || ''}
                      onChange={e => handleDashboardSelect(e.target.value)}
                      className="config-select"
                    >
                      <option value="">Select a dashboard...</option>
                      {/* If the currently-selected path isn't in the fetched
                          dashboards list (e.g. industry template hard-codes
                          a path Omni's API didn't return), surface it as
                          an extra option so the dropdown shows it as picked. */}
                      {editData.embedDashboardPath && !dashboards.some(d => d.contentPath === editData.embedDashboardPath) && (
                        <option value={editData.embedDashboardPath}>
                          {editData.embedDashboardPath}
                        </option>
                      )}
                      {dashboards.map(d => (
                        <option key={d.id} value={d.contentPath}>
                          {d.name} ({d.contentPath})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={editData.embedDashboardPath || '/dashboards/a73297b4'}
                      onChange={e => updateField('embedDashboardPath', e.target.value)}
                      placeholder="/dashboards/abc123"
                    />
                  )}
                </div>
                <div className="config-field full-width">
                  <label>Custom Theme ID (optional)</label>
                  <div className="config-input-row">
                    <input
                      type="text"
                      value={editData.embedThemeId || ''}
                      onChange={e => updateField('embedThemeId', e.target.value)}
                      placeholder="Paste theme ID from Omni"
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none' }}
                    />
                    {editData.embedDashboardPath && (
                      <a
                        href={`https://${editData.embedVanityDomain || 'trial.omniapp.co'}${editData.embedDashboardPath}/themes`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ whiteSpace: 'nowrap', textDecoration: 'none' }}
                      >
                        <ExternalLink size={14} /> Open Themes
                      </a>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 }}>
                    Omni doesn't expose themes via API. Click "Open Themes" → select a theme → copy the ID from the URL.
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12 }}>
                Omni requires a signed embed URL. Contact your Omni admin to enable embedding and generate a secret.
                Without a secret, the Dashboard tab will show a placeholder.
              </p>
            </details>

            {!omniCredsChanged && (
            <details className="config-section config-collapsible">
              <summary>
                <h3><Key size={18} /> User Attribute — airport_region</h3>
              </summary>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 1.6 }}>
                Logins route to an <code>airport_region</code> user attribute
                (<strong>all</strong>, <strong>east</strong>, <strong>west</strong>, <strong>other</strong>)
                which drives Omni's access filter on the flights topic.
                Omni doesn't allow creating user attributes via API — only listing.
              </p>
              <label className="config-toggle-row">
                <input
                  type="checkbox"
                  checked={editData.embedSendRegionAttribute !== false}
                  onChange={e => updateField('embedSendRegionAttribute', e.target.checked)}
                />
                <span className="config-toggle-text">
                  <strong>Send <code>airport_region</code> user attribute on embed SSO</strong>
                  <span className="config-toggle-hint">
                    Turn off if your Omni instance doesn't define an <code>airport_region</code> attribute.
                    Omni rejects unknown attribute names with <em>"do not match the names of
                    existing user attributes"</em>.
                  </span>
                </span>
              </label>
              <div className="config-input-row" style={{ marginTop: 12 }}>
                <button
                  className="btn btn-secondary"
                  onClick={checkAirportRegionAttr}
                  disabled={attrStatus === 'checking' || !editData.omniApiKey}
                >
                  {attrStatus === 'checking' ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                  Check status
                </button>
                <a
                  href={`https://${editData.embedVanityDomain || 'trial.omniapp.co'}/settings/attributes`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ whiteSpace: 'nowrap', textDecoration: 'none' }}
                >
                  <ExternalLink size={14} /> Open Attributes in Omni
                </a>
              </div>
              {attrStatus === 'exists' && (
                <p style={{ fontSize: 13, color: '#10b981', marginTop: 10, fontWeight: 600 }}>
                  <CheckCircle2 size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {attrMessage}
                </p>
              )}
              {attrStatus === 'missing' && (
                <p style={{ fontSize: 13, color: '#d97706', marginTop: 10, lineHeight: 1.5 }}>
                  {attrMessage}
                </p>
              )}
              {attrStatus === 'error' && (
                <p className="config-error" style={{ marginTop: 10 }}>{attrMessage}</p>
              )}
            </details>
            )}

            <div className="config-actions">
              <button className="btn btn-secondary" onClick={() => navigate('/')}>
                Cancel
              </button>
              <button className="btn btn-primary btn-lg" onClick={handleSave}>
                Save & Launch Dashboard
                <ExternalLink size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
