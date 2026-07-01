import { useState, useEffect, useCallback, useRef } from 'react'
import { useBrand } from '../../context/BrandContext'
import { Plane, MapPin, Briefcase, AlertCircle, Loader2, ExternalLink, Search, X, Zap, RefreshCw, ChevronDown, ChevronUp, CalendarClock } from 'lucide-react'
import CarrierFeedbackModal from '../CarrierFeedbackModal'
import ScheduleDeliveryModal from '../ScheduleDeliveryModal'

const AIRPORT_FILTER_ID = 'lG4Gn7nz'
const CARRIER_FILTER_ID = 'v6fXfL0c'
const DASHBOARD_FILTER_ID = 'FFErjawy'
const DASHBOARD_PATH = '/dashboards/645cf6e2'
const DASHBOARD_ID = DASHBOARD_PATH.split('/').filter(Boolean).pop() // "645cf6e2"
const MODEL_ID = '5662aa63-3e2e-4ec5-b678-5cc274e45980'
const TOPIC = 'demo__airline_delay_cause'

// Omni embed events that should open the carrier-feedback modal. The user's
// dashboard markdown uses:
//   <omni-message event-name="carrier-feedback"
//                 event-data="{{demo__airline_delay_cause.carrier_name.raw}}">
// so clicking the carrier logo/name posts a message up to this parent window.
// The modal opens on that custom event AND on the built-in `dashboard:tile-drill`
// event (the latter restored so you can drill a Delay Minutes / Frequency cell
// to test the modal while the carrier-column click is wired up on Omni's side).
// The exact event.data shape Omni emits for custom <omni-message> events is not
// documented, so the matching below is intentionally shape-agnostic (we scan
// candidate name locations AND deep-scan the message for the event name).
const CARRIER_FEEDBACK_EVENTS = ['carrier-feedback', 'carrier:feedback']
// Strings that are never a carrier name (event names, the source tag, etc.) —
// excluded when we fall back to deep-scanning the payload for the carrier.
const CARRIER_NOISE = new Set([...CARRIER_FEEDBACK_EVENTS, 'omni', 'omni-message', 'undefined', 'null', ''])

// TEMP DIAGNOSTIC counter (module-level so it persists across re-renders, resets
// on a full page reload). Caps how many embed messages we dump to the console.
const MSG_DIAG = { n: 0 }

// Pull a printable string out of a cell value that might be a primitive or an
// Omni cell object like { value, raw, label }.
function cellToString(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (typeof v === 'object') return cellToString(v.value ?? v.raw ?? v.label)
  return ''
}

// Some browsers / embed builds deliver event.data as a JSON string rather than
// an object. Normalize so the rest of the code always sees an object.
function normalizeMessageData(raw) {
  if (typeof raw === 'string') {
    const s = raw.trim()
    if (s.startsWith('{') || s.startsWith('[')) {
      try { return JSON.parse(s) } catch { /* fall through */ }
    }
    return { name: raw }
  }
  return raw || {}
}

// Recursively collect every primitive string value in an object/array so we can
// match the configured event name (and find the carrier) regardless of where
// Omni nests them in the message.
function collectStrings(val, out = [], depth = 0) {
  if (val == null || depth > 6) return out
  if (typeof val === 'string') { out.push(val); return out }
  if (typeof val === 'number' || typeof val === 'boolean') return out
  if (Array.isArray(val)) { for (const v of val) collectStrings(v, out, depth + 1); return out }
  if (typeof val === 'object') { for (const v of Object.values(val)) collectStrings(v, out, depth + 1); return out }
  return out
}

// Does this message represent a carrier-feedback (omni-message) click? We check
// the usual name locations first, then deep-scan as a fallback.
function isCarrierFeedbackEvent(data) {
  const candidates = [
    data?.name, data?.event, data?.eventName, data?.type, data?.action,
    data?.payload?.name, data?.payload?.event, data?.payload?.eventName,
    data?.payload?.eventType, data?.payload?.type, data?.data?.name,
  ]
  if (candidates.some(c => CARRIER_FEEDBACK_EVENTS.includes(c))) return true
  return collectStrings(data).some(s => CARRIER_FEEDBACK_EVENTS.includes(s.trim()))
}

// Given an Omni postMessage, work out which carrier (if any) was clicked via
// the custom "carrier-feedback" omni-message event. `knownCarriers` helps
// disambiguate when the payload bundles several columns together.
function extractCarrier(data, knownCarriers = []) {
  // Built-in tile-drill trigger (RESTORED for testing). Drilling a "Average
  // Delay Minutes" / "Delayed Frequency" cell makes Omni post a
  // `dashboard:tile-drill` message whose payload includes the drilled row.
  // We read the carrier from that row so the modal opens on drill — a reliable
  // way to test the modal while the carrier-column omni-message click is being
  // wired up on the Omni side. (Real carrier clicks still use the path below.)
  if (data?.name === 'dashboard:tile-drill') {
    const payload = data?.payload
    const row = payload?.drill?.rowToDrill || payload?.rowToDrill
    if (row && typeof row === 'object') {
      // A drilled row often carries BOTH the full name (carrier_name) and the
      // short IATA code (carrier, e.g. "MQ"). Collect every carrier-ish value
      // and prefer the full name so the modal never shows just "MQ".
      const carrierVals = Object.keys(row)
        .filter(k => /carrier/i.test(k))
        .map(k => cellToString(row[k]).trim())
        .filter(s => s && !CARRIER_NOISE.has(s))
      const known = carrierVals.find(v => knownCarriers.includes(v))
      if (known) return known
      if (carrierVals.length) return carrierVals.sort((a, b) => b.length - a.length)[0]
    }
    return null
  }

  if (isCarrierFeedbackEvent(data)) {
    const payload = data?.payload ?? data?.data ?? data

    // 1) Plain string payload (event-data delivered directly).
    if (typeof payload === 'string') {
      const s = payload.split(',')[0].trim()
      if (s && !CARRIER_NOISE.has(s)) return s
    }

    // 2) Common key locations for the event-data value.
    if (payload && typeof payload === 'object') {
      for (const k of ['carrier', 'carrier_name', 'carrierName', 'eventData', 'event_data', 'data', 'value', 'label', 'name']) {
        const s = cellToString(payload[k]).trim()
        if (s && !CARRIER_NOISE.has(s)) return s
      }
    }

    // 3) Deep-scan: prefer a string that matches a known carrier, else the
    //    first non-noise string anywhere in the message.
    const strings = collectStrings(data).map(s => s.trim()).filter(s => !CARRIER_NOISE.has(s))
    const known = strings.find(s => knownCarriers.includes(s))
    if (known) return known
    return strings[0] || null
  }
  return null
}

// Build the f--<id>=<json> string used by both filterSearchParam (initial URL)
// and dashboard:filter-change-by-url-parameter (postMessage runtime updates).
function buildFilterParts(airportList, carrierList, { clearDashboardFilter = false } = {}) {
  const parts = []
  const airportObj = airportList.length > 0
    ? { is_inclusive: false, is_negative: false, kind: 'EQUALS', type: 'string', values: airportList, appliedLabels: {} }
    : { values: [] }
  parts.push(`f--${AIRPORT_FILTER_ID}=${encodeURIComponent(JSON.stringify(airportObj))}`)

  const carrierObj = carrierList.length > 0
    ? { is_inclusive: false, is_negative: false, kind: 'EQUALS', type: 'string', values: carrierList, appliedLabels: {} }
    : { values: [] }
  parts.push(`f--${CARRIER_FILTER_ID}=${encodeURIComponent(JSON.stringify(carrierObj))}`)

  if (clearDashboardFilter) {
    parts.push(`f--${DASHBOARD_FILTER_ID}=${encodeURIComponent(JSON.stringify({ values: [] }))}`)
  }
  return parts.join('&')
}

export default function Flights({ darkMode = false }) {
  const { brand, currentUser } = useBrand()
  // postMessage iframe — loaded once, filters applied at runtime via postMessage
  const [embedUrl, setEmbedUrl] = useState(null)
  // URL-method iframe — re-signed and reloaded on every filter change with filterSearchParam
  const [embedUrlFilter, setEmbedUrlFilter] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedAirports, setSelectedAirports] = useState([]) // array for multi-select
  const [selectedCarriers, setSelectedCarriers] = useState([])
  const [airports, setAirports] = useState([])
  const [carriers, setCarriers] = useState([])
  const [airportSearch, setAirportSearch] = useState('')
  const [carrierSearch, setCarrierSearch] = useState('')
  const [iframeReady, setIframeReady] = useState(false)
  const [dashboardFilterActive, setDashboardFilterActive] = useState(false)
  // Side-by-side comparison timings (ms) for the last filter change
  const [postMsgTiming, setPostMsgTiming] = useState(null)
  const [urlTiming, setUrlTiming] = useState(null)
  const [postMsgPending, setPostMsgPending] = useState(false)
  const [urlPending, setUrlPending] = useState(false)
  // Compare pane (URL filterSearchParam) is collapsed by default so the
  // primary postMessage iframe gets full height. Expanding it lazy-loads
  // the second iframe.
  const [comparePaneOpen, setComparePaneOpen] = useState(false)
  // Carrier whose feedback modal is open (null = closed). Opened when Omni
  // emits a carrier-click embed event from inside the dashboard iframe.
  const [feedbackCarrier, setFeedbackCarrier] = useState(null)
  // Schedule-delivery modal (calls the Omni create-schedule API).
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const iframeRef = useRef(null)         // postMessage iframe
  const iframeUrlRef = useRef(null)      // URL-method iframe
  const embedOriginRef = useRef(null)
  const postMsgStartRef = useRef(null)
  const urlStartRef = useRef(null)
  const carriersRef = useRef([])         // latest carriers for the message handler

  // Keep a ref of the carrier list so the (once-registered) message handler
  // can disambiguate click payloads without re-subscribing on every fetch.
  useEffect(() => { carriersRef.current = carriers }, [carriers])

  // Fetch distinct airports and carriers from Omni, scoped to the
  // logged-in user's region so the filter panel only shows relevant values.
  useEffect(() => {
    if (!brand.omniApiKey) return

    // Build a region filter matching the access filter on the topic.
    // `all` users (admin) see every value; everyone else is scoped.
    // The query/run API wants the full filter object (not the {is: ...}
    // shorthand which only works in some contexts).
    const region = currentUser?.region
    const regionFilter = (region && region !== 'all')
      ? {
          [`${TOPIC}.airport_region`]: {
            kind: 'EQUALS',
            values: [region],
            is_negative: false,
            is_inclusive: false,
            type: 'string',
          }
        }
      : undefined

    const fetchValues = async (field, setter) => {
      try {
        const res = await fetch('/api/omni-query-distinct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: brand.omniApiKey,
            vanityDomain: brand.embedVanityDomain || 'trial.omniapp.co',
            modelId: MODEL_ID,
            table: TOPIC,
            field,
            limit: 500,
            filters: regionFilter,
          })
        })
        const data = await res.json()
        if (data.error) {
          console.error('[Flights] distinct query error:', field, data.error)
          setter([])
          return
        }
        if (data.values) setter(data.values)
      } catch (err) {
        console.error('[Flights] fetch values failed:', field, err)
        setter([])
      }
    }

    fetchValues(`${TOPIC}.airport`, setAirports)
    fetchValues(`${TOPIC}.carrier_name`, setCarriers)
  }, [brand.omniApiKey, brand.embedVanityDomain, currentUser?.region])

  // Parse origin from embed URL for postMessage
  useEffect(() => {
    if (embedUrl) {
      try {
        embedOriginRef.current = new URL(embedUrl).origin
      } catch {
        embedOriginRef.current = null
      }
    }
  }, [embedUrl])

  // Listen to messages from the iframe
  useEffect(() => {
    const handler = (event) => {
      const data = normalizeMessageData(event.data)

      // TEMP DIAGNOSTIC — surface EVERY non-routine message from the embed so we
      // can confirm whether clicking the carrier column emits anything, and see
      // its exact shape. Click a carrier, then read the [Flights msg] lines in
      // the browser console. Capped so routine traffic can't flood the log.
      if (MSG_DIAG.n < 100) {
        const nm = data?.name
        const routine = nm === 'status' || nm === 'dashboard:filter-changed' || nm === 'dashboard:filters-changed'
        if (!routine) {
          MSG_DIAG.n += 1
          // eslint-disable-next-line no-console
          console.log(
            `[Flights msg #${MSG_DIAG.n}] origin=${event.origin} name=${nm ?? '(none)'} type=${typeof event.data} keys=${Object.keys(data || {}).join(',') || '(none)'}`,
            data,
          )
        }
      }

      // Carrier-feedback trigger — checked before the `source` guard because
      // custom <omni-message> events may not carry source: 'omni', and the
      // event name can land in a number of places depending on Omni build.
      // The modal opens on EITHER the explicit carrier-feedback omni-message
      // event OR a built-in `dashboard:tile-drill` (RESTORED) — the latter lets
      // you drill a Delay Minutes / Frequency cell to test the modal while the
      // carrier-column click is being wired up on the Omni side.
      if (isCarrierFeedbackEvent(data) || data?.name === 'dashboard:tile-drill') {
        if (isCarrierFeedbackEvent(data)) {
          // eslint-disable-next-line no-console
          console.log('[Flights] carrier-feedback message received:', JSON.parse(JSON.stringify(data)))
        }
        const carrier = extractCarrier(data, carriersRef.current)
        if (carrier) {
          setFeedbackCarrier(carrier)
          return
        }
      } else if (data && typeof data === 'object' && data.name !== 'status' && data.name !== 'dashboard:filter-changed') {
        // Diagnostic fallback: if Omni emits the omni-message click without the
        // event-name anywhere we recognize, this surfaces the raw shape so we
        // can finish wiring it up. Skips the two high-frequency routine events.
        try {
          const blob = JSON.stringify(data)
          if (/carrier/i.test(blob)) {
            // eslint-disable-next-line no-console
            console.log('[Flights] unmatched message mentioning "carrier":', JSON.parse(blob))
          }
        } catch { /* ignore non-serializable messages */ }
      }
      if (data?.source !== 'omni') return
      const name = data?.name
      const payload = data?.payload
      // Identify which iframe this message came from to attribute timing
      const fromPostMsg = iframeRef.current && event.source === iframeRef.current.contentWindow
      const fromUrl = iframeUrlRef.current && event.source === iframeUrlRef.current.contentWindow
      if (name === 'status' && payload?.status === 'done') {
        if (fromPostMsg) {
          setIframeReady(true)
          if (postMsgStartRef.current != null) {
            setPostMsgTiming(Math.round(performance.now() - postMsgStartRef.current))
            postMsgStartRef.current = null
            setPostMsgPending(false)
          }
        }
        if (fromUrl) {
          if (urlStartRef.current != null) {
            setUrlTiming(Math.round(performance.now() - urlStartRef.current))
            urlStartRef.current = null
            setUrlPending(false)
          }
        }
      }
      if (name === 'dashboard:filter-changed') {
        // Detect changes to the in-dashboard filter control (FFErjawy).
        // The payload shape: { prev, next, action, urlId }. The filter id
        // lives as a key inside prev.filter / next.filter, OR as urlId.
        const urlId = payload?.urlId
        const nextFilter = payload?.next?.filter
        const action = payload?.action
        const filterKey = urlId || (nextFilter ? Object.keys(nextFilter)[0] : null)
        if (filterKey === DASHBOARD_FILTER_ID) {
          // Treat as active if action added/updated AND next has any values
          const values = nextFilter
            ? (nextFilter[DASHBOARD_FILTER_ID]?.values ?? Object.values(nextFilter)[0]?.values)
            : null
          const hasValues = Array.isArray(values) ? values.length > 0 : !!values
          if (action === 'removed' || !hasValues) {
            setDashboardFilterActive(false)
          } else {
            setDashboardFilterActive(true)
          }
        }
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // Build a signed Omni embed URL. `filterSearchParam` is optional — when
  // provided it's baked into the URL so the iframe loads with filters
  // pre-applied (URL-method). When omitted, filters are sent later via
  // postMessage at runtime (postMessage-method).
  const buildEmbedUrl = useCallback(async (filterSearchParam) => {
    if (!brand.embedSecret) return null
    let connectionRoles
    const role = brand.aiConnectionRole || 'RESTRICTED_QUERIER'
    if (brand.aiConnectionId) {
      connectionRoles = JSON.stringify({ [brand.aiConnectionId]: role })
    } else if (brand.allConnections?.length > 0) {
      const allRoles = {}
      brand.allConnections.forEach(c => { allRoles[c.id] = role })
      connectionRoles = JSON.stringify(allRoles)
    }

    const res = await fetch('/api/omni-embed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: brand.embedSecret,
        contentPath: DASHBOARD_PATH,
        vanityDomain: brand.embedVanityDomain || '',
        connectionRoles,
        linkAccess: '__omni_link_access_open',
        externalId: currentUser?.externalId,
        name: currentUser?.name,
        email: currentUser?.email,
        userAttributes: brand.embedSendRegionAttribute === false ? undefined : currentUser?.userAttributes,
        prefersDark: darkMode,
        filterSearchParam,
      })
    })
    const data = await res.json()
    if (data.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
    return data.url
  }, [brand, currentUser, darkMode])

  // Initial load: fetch both URLs in parallel. The postMessage iframe gets
  // a filter-less URL (filters applied later via postMessage); the URL
  // iframe starts with whatever filterSearchParam reflects current state.
  useEffect(() => {
    if (!brand.embedSecret) {
      setEmbedUrl(null)
      setEmbedUrlFilter(null)
      return
    }
    setLoading(true)
    setError('')
    setIframeReady(false)
    setDashboardFilterActive(false)
    postMsgStartRef.current = performance.now()
    setPostMsgPending(true)
    // Only fetch the postMessage iframe URL on initial mount — the URL-method
    // iframe is lazy-loaded when the user expands the compare pane.
    buildEmbedUrl(undefined)
      .then(url => setEmbedUrl(url))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
    // Intentionally exclude selectedAirports/Carriers — initial only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand.embedSecret, brand.embedVanityDomain, currentUser?.externalId, darkMode])

  // Send filter update to BOTH iframes:
  //   - postMessage iframe: dashboard:filter-change-by-url-parameter (live)
  //   - URL iframe: re-sign embed URL with new filterSearchParam, swap src
  // Each starts its own timer so we can compare load/apply latency.
  const sendFilterUpdate = useCallback((airportList, carrierList, { clearDashboardFilter = false } = {}) => {
    const filterUrlParameter = buildFilterParts(airportList, carrierList, { clearDashboardFilter })
    console.log('[Flights → Omni]', decodeURIComponent(filterUrlParameter))

    // --- Method 1: postMessage (live, no reload) ---
    const iframe = iframeRef.current
    const origin = embedOriginRef.current
    if (iframe?.contentWindow && origin) {
      postMsgStartRef.current = performance.now()
      setPostMsgPending(true)
      setPostMsgTiming(null)
      iframe.contentWindow.postMessage(
        { name: 'dashboard:filter-change-by-url-parameter', payload: { filterUrlParameter } },
        origin
      )
    }

    // --- Method 2: URL filterSearchParam (full re-sign + iframe reload) ---
    // Only fire if the compare pane is open — saves an SSO call per click
    // when the user isn't comparing.
    if (comparePaneOpen) {
      urlStartRef.current = performance.now()
      setUrlPending(true)
      setUrlTiming(null)
      buildEmbedUrl(filterUrlParameter)
        .then(url => { if (url) setEmbedUrlFilter(url) })
        .catch(err => console.error('[URL-method] sign failed', err))
    }
  }, [buildEmbedUrl, comparePaneOpen])

  // When the user expands the compare pane, lazy-load the URL iframe with
  // the filters currently selected so it lands in the same state.
  const toggleComparePane = useCallback(() => {
    setComparePaneOpen(prev => {
      const next = !prev
      if (next && !embedUrlFilter) {
        urlStartRef.current = performance.now()
        setUrlPending(true)
        setUrlTiming(null)
        const filterUrlParameter = buildFilterParts(selectedAirports, selectedCarriers)
        buildEmbedUrl(filterUrlParameter)
          .then(url => { if (url) setEmbedUrlFilter(url) })
          .catch(err => console.error('[URL-method] initial sign failed', err))
      }
      return next
    })
  }, [buildEmbedUrl, embedUrlFilter, selectedAirports, selectedCarriers])

  const toggleAirport = (code) => {
    const next = selectedAirports.includes(code)
      ? selectedAirports.filter(a => a !== code)
      : [...selectedAirports, code]
    setSelectedAirports(next)
    sendFilterUpdate(next, selectedCarriers)
  }

  const toggleCarrier = (name) => {
    const next = selectedCarriers.includes(name)
      ? selectedCarriers.filter(c => c !== name)
      : [...selectedCarriers, name]
    setSelectedCarriers(next)
    sendFilterUpdate(selectedAirports, next)
  }

  const clearAirports = () => {
    setSelectedAirports([])
    sendFilterUpdate([], selectedCarriers)
  }

  const clearCarriers = () => {
    setSelectedCarriers([])
    sendFilterUpdate(selectedAirports, [])
  }

  const handleClearAll = () => {
    setSelectedAirports([])
    setSelectedCarriers([])
    setDashboardFilterActive(false)
    sendFilterUpdate([], [], { clearDashboardFilter: true })
  }

  // Filter lists based on search input
  const filteredAirports = airportSearch
    ? airports.filter(a => a.toLowerCase().includes(airportSearch.toLowerCase()))
    : airports
  const filteredCarriers = carrierSearch
    ? carriers.filter(c => c.toLowerCase().includes(carrierSearch.toLowerCase()))
    : carriers

  if (!brand.embedSecret) {
    return (
      <div className="embed-placeholder">
        <div className="embed-placeholder-icon" style={{ background: `${brand.primaryColor}15`, color: brand.primaryColor }}>
          <Plane size={48} />
        </div>
        <h3>Flight Delay Dashboard</h3>
        <p>To embed this dashboard, add your <strong>Embed Secret</strong> in the Configuration page.</p>
        <a
          href="https://docs.omni.co/embed/setup/standard-sso"
          target="_blank"
          rel="noopener noreferrer"
          className="embed-docs-link"
          style={{ color: brand.primaryColor }}
        >
          <ExternalLink size={14} /> Read Omni Embed Documentation
        </a>
      </div>
    )
  }

  if (error && !embedUrl) {
    return (
      <div className="embed-placeholder">
        <AlertCircle size={48} style={{ color: '#dc2626' }} />
        <h3>Embed Error</h3>
        <p style={{ color: '#dc2626' }}>{error}</p>
      </div>
    )
  }

  return (
    <div className="flights-tab">
      <div className="flights-filter-panel">
        <button
          type="button"
          className="flights-schedule-btn"
          style={{ background: brand.primaryColor }}
          onClick={() => setScheduleOpen(true)}
          title="Schedule a recurring email delivery of this dashboard"
        >
          <CalendarClock size={15} /> Schedule delivery
        </button>

        <div className="flights-filter-section">
          <div className="flights-filter-header">
            <span className="flights-filter-label">
              <MapPin size={14} /> Airport {selectedAirports.length > 0 && <span className="flights-count-badge">{selectedAirports.length}</span>}
            </span>
            {selectedAirports.length > 0 && (
              <button className="flights-mini-clear" onClick={clearAirports} title="Clear airports">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flights-search-wrap">
            <Search size={12} className="flights-search-icon" />
            <input
              type="text"
              className="flights-search-input"
              placeholder={`Search ${airports.length} airports...`}
              value={airportSearch}
              onChange={e => setAirportSearch(e.target.value)}
            />
          </div>
          <div className="flights-chip-list">
            {filteredAirports.slice(0, 300).map(code => {
              const active = selectedAirports.includes(code)
              return (
                <button
                  key={code}
                  className={`flights-chip ${active ? 'active' : ''}`}
                  style={active ? { background: brand.primaryColor, color: '#fff', borderColor: brand.primaryColor } : {}}
                  onClick={() => toggleAirport(code)}
                  disabled={!iframeReady}
                >
                  {code}
                </button>
              )
            })}
            {airports.length === 0 && <span className="flights-loading-text">Loading airports…</span>}
          </div>
        </div>

        <div className="flights-filter-section">
          <div className="flights-filter-header">
            <span className="flights-filter-label">
              <Briefcase size={14} /> Carrier {selectedCarriers.length > 0 && <span className="flights-count-badge">{selectedCarriers.length}</span>}
            </span>
            {selectedCarriers.length > 0 && (
              <button className="flights-mini-clear" onClick={clearCarriers} title="Clear carriers">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flights-search-wrap">
            <Search size={12} className="flights-search-icon" />
            <input
              type="text"
              className="flights-search-input"
              placeholder={`Search ${carriers.length} carriers...`}
              value={carrierSearch}
              onChange={e => setCarrierSearch(e.target.value)}
            />
          </div>
          <div className="flights-chip-list">
            {filteredCarriers.map(name => {
              const active = selectedCarriers.includes(name)
              return (
                <button
                  key={name}
                  className={`flights-chip flights-chip-wide ${active ? 'active' : ''}`}
                  style={active ? { background: brand.primaryColor, color: '#fff', borderColor: brand.primaryColor } : {}}
                  onClick={() => toggleCarrier(name)}
                  disabled={!iframeReady}
                >
                  {name}
                </button>
              )
            })}
            {carriers.length === 0 && <span className="flights-loading-text">Loading carriers…</span>}
          </div>
        </div>

        {(selectedAirports.length > 0 || selectedCarriers.length > 0 || dashboardFilterActive) && (
          <button className="flights-clear-all-btn" onClick={handleClearAll}>
            <X size={12} /> Clear All Filters
          </button>
        )}
      </div>
      <div className={`flights-embed-area flights-compare ${comparePaneOpen ? 'open' : 'collapsed'}`}>
        <div className="flights-compare-pane">
          <div className="flights-compare-header">
            <span className="flights-compare-label">
              <Zap size={13} /> postMessage
            </span>
            <span className={`flights-compare-timing ${postMsgPending ? 'pending' : ''}`}>
              {postMsgPending
                ? <><Loader2 size={11} className="spin" /> measuring…</>
                : (postMsgTiming != null ? `${postMsgTiming} ms` : '—')}
            </span>
          </div>
          <div className="flights-compare-frame">
            {embedUrl ? (
              <iframe
                ref={iframeRef}
                src={embedUrl}
                title={`${brand.name} Flights — postMessage`}
                className="omni-embed-iframe"
                frameBorder="0"
                allow="clipboard-write"
                allowFullScreen
              />
            ) : (
              <div className="embed-placeholder">
                <Loader2 size={32} className="spin" style={{ color: brand.primaryColor }} />
                <p>Loading Flights Dashboard...</p>
              </div>
            )}
          </div>
        </div>

        <div className={`flights-compare-pane flights-compare-pane-collapsible ${comparePaneOpen ? 'open' : ''}`}>
          <button type="button" className="flights-compare-header flights-compare-toggle" onClick={toggleComparePane} aria-expanded={comparePaneOpen}>
            <span className="flights-compare-label">
              <RefreshCw size={13} /> filterSearchParam
            </span>
            <span className="flights-compare-toggle-actions">
              <span className={`flights-compare-timing ${urlPending ? 'pending' : ''}`}>
                {urlPending
                  ? <><Loader2 size={11} className="spin" /> measuring…</>
                  : (urlTiming != null ? `${urlTiming} ms` : '—')}
              </span>
              {comparePaneOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </span>
          </button>
          {comparePaneOpen && (
            <div className="flights-compare-frame">
              {embedUrlFilter ? (
                <iframe
                  ref={iframeUrlRef}
                  src={embedUrlFilter}
                  title={`${brand.name} Flights — filterSearchParam`}
                  className="omni-embed-iframe"
                  frameBorder="0"
                  allow="clipboard-write"
                  allowFullScreen
                />
              ) : (
                <div className="embed-placeholder">
                  <Loader2 size={32} className="spin" style={{ color: brand.primaryColor }} />
                  <p>Loading Flights Dashboard...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {feedbackCarrier && (
        <CarrierFeedbackModal
          carrier={feedbackCarrier}
          brand={brand}
          userEmail={currentUser?.email}
          onClose={() => setFeedbackCarrier(null)}
        />
      )}

      {scheduleOpen && (
        <ScheduleDeliveryModal
          brand={brand}
          dashboardId={DASHBOARD_ID}
          dashboardName={`${brand.name ? brand.name + ' ' : ''}Flight Delay Dashboard`}
          userEmail={currentUser?.email}
          onClose={() => setScheduleOpen(false)}
        />
      )}
    </div>
  )
}
