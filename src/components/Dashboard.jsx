import { useState, useEffect, useCallback } from 'react'
import { useBrand } from '../context/BrandContext'
import Overview from './tabs/Overview'
import AIChat from './tabs/AIChat'
import SearchTab from './tabs/Search'
import Flights from './tabs/Flights'
import Hub from './tabs/Hub'
import { LogOut, LayoutDashboard, MessageCircle, MonitorDot, Plane, Sparkles, FolderKanban, Bell, PanelsTopLeft, Gauge, ShieldCheck, GraduationCap } from 'lucide-react'
import { getContrastColor } from '../utils/colors'
import { initializeOneSignal, isOneSignalConfigured } from '../utils/oneSignal'
import AppTab from './tabs/App'
import OmniEmbed from './OmniEmbed'

const APP_TAB_ICONS = [Gauge, ShieldCheck, GraduationCap]

const BASE_TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'aichat', label: 'AI Chat', icon: MessageCircle },
  { id: 'search', label: 'Dashboard', icon: MonitorDot },
  { id: 'flights', label: 'Flights', icon: Plane },
  { id: 'apps', label: 'App', icon: PanelsTopLeft },
  { id: 'hub', label: 'Hub', icon: FolderKanban },
]

const tabComponents = {
  overview: Overview,
  aichat: AIChat,
  search: SearchTab,
  apps: AppTab,
  flights: Flights,
  hub: Hub,
}

export default function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('overview')
  // Dark mode toggle removed from the header; embeds still receive the flag.
  const [darkMode] = useState(false)
  const [pushSending, setPushSending] = useState(false)
  const [pushFeedback, setPushFeedback] = useState('')
  const { brand, currentUser } = useBrand()

  // Flights tab is hard-wired to the Port-of-Seattle demo (region-based access
  // filter on the flights topic). Hide it entirely when the `region` user
  // attribute is turned off — without it, the access filter and filter panel
  // queries fail.
  const flightsHidden = brand.embedSendRegionAttribute === false

  // Brand-supplied Omni app tabs (e.g. Custom Fleet's three) sit between
  // AI Chat and Hub. Each renders a signed embed of its own contentPath.
  const brandAppTabs = Array.isArray(brand.appTabs) ? brand.appTabs : []
  const extraTabs = brandAppTabs.map((t, i) => ({
    id: `app:${t.id}`,
    label: t.label,
    icon: APP_TAB_ICONS[i % APP_TAB_ICONS.length],
    appTab: t,
  }))
  const withExtras = BASE_TABS.flatMap(t => (t.id === 'aichat' ? [t, ...extraTabs] : [t]))

  const configuredTabs = withExtras.filter(t => {
    if (t.id === 'flights' && flightsHidden) return false
    if (t.id === 'apps' && !brand.embedAppPath) return false
    // A brand with its own app tabs replaces the generic Dashboard tab.
    if (t.id === 'search' && brand.showDashboardTab === false) return false
    return true
  })

  // If user is currently on Flights but it just got hidden, bounce back to Overview.
  const availableIds = configuredTabs.map(t => t.id).join(',')
  useEffect(() => {
    if (!availableIds.split(',').includes(activeTab)) setActiveTab('overview')
  }, [availableIds, activeTab])

  const activeAppTab = configuredTabs.find(t => t.id === activeTab)?.appTab
  const ActiveComponent = tabComponents[activeTab]
  const activeBtnText = getContrastColor(brand.primaryColor)

  useEffect(() => {
    if (!isOneSignalConfigured()) return
    initializeOneSignal().catch(error => console.error('OneSignal initialization failed:', error))
  }, [])


  // ── Push bridge ────────────────────────────────────────────────────────
  // Embedded Omni apps can't call OneSignal themselves, so they postMessage to
  // the parent portal and we send the push. Messages arrive from the Omni embed
  // origin and are DATA, not instructions: we only read a few strings from them
  // and use them as notification text.
  useEffect(() => {
    const EMBED_HOST_SUFFIXES = ['.embed-omniapp.co', '.omniapp.co', '.exploreomni.dev']
    const PUSH_TYPES = new Set(['bubble-play:send-push', 'fishtank:onesignal-send'])
    const str = (v, max = 120) => (typeof v === 'string' ? v.slice(0, max) : '')

    // Omni runs an app's custom HTML inside a sandboxed frame, which gets an
    // opaque origin reported as the string "null". We still accept those, but
    // only when this page is the top-level window (so nobody has framed the
    // portal) and the message came from a frame below us — an attacker can't
    // inject a frame into our own document.
    const isTrustedEmbedOrigin = (origin, source) => {
      if (origin === 'null' || origin === '') {
        return window.top === window.self && source !== window.self && source !== window.parent
      }
      try {
        const host = new URL(origin).hostname.toLowerCase()
        return EMBED_HOST_SUFFIXES.some(sfx => host.endsWith(sfx))
      } catch { return false }
    }

    const onMessage = async event => {
      const data = event.data
      if (!data || typeof data !== 'object' || !PUSH_TYPES.has(data.type)) return
      if (!isTrustedEmbedOrigin(event.origin, event.source)) {
        console.warn('[push] rejected: untrusted origin', event.origin)
        setPushFeedback(`Push blocked: untrusted origin ${event.origin}`)
        setTimeout(() => setPushFeedback(''), 4000)
        return
      }
      console.info('[push] request accepted from', event.origin, '→', data.type)

      const action = str(data.action) || 'Fleet action'
      // An explicit message wins; otherwise build one from whichever app's
      // fields are present (Custom Fleet: rego/driver/depot; Beamtree:
      // flag title, hospital, indicator, episode, description).
      const detail = str(data.message, 200) || [
        str(data.rego, 32), str(data.driver, 48), str(data.depot, 48),
        str(data.title, 80), str(data.hospitalName, 48), str(data.indicator, 60),
        str(data.episodeKey, 32) && `Episode ${str(data.episodeKey, 32)}`,
        str(data.description, 120),
      ].filter(Boolean).join(' · ').slice(0, 200)

      let ok = false
      let why = ''
      try {
        const res = await fetch('/api/onesignal-send-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sendToAll: true, action, message: detail }),
        })
        ok = res.ok
        if (!ok) {
          why = await res.text()
          console.error('[push] send failed:', res.status, why)
        } else {
          console.info('[push] sent:', action)
        }
      } catch (err) {
        why = String(err)
        console.error('[push] send failed:', err)
      }
      setPushFeedback(ok ? `Push sent · ${action}` : `Push failed · ${why.slice(0, 90)}`)
      setTimeout(() => setPushFeedback(''), 4000)

      // Reply so the app can confirm the hand-off actually landed.
      try {
        event.source?.postMessage(
          { type: `${data.type}:result`, ok, action, appId: str(data.appId, 64) },
          event.origin,
        )
      } catch { /* the frame may already be gone */ }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const handlePushClick = useCallback(async ({ quiet = false } = {}) => {
    if (pushSending) return
    setPushFeedback('')
    setPushSending(true)
    try {
      const response = await fetch('/api/onesignal-send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendToAll: true }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not send the push message.')
    } catch (error) {
      console.error('Could not send the OneSignal broadcast:', error)
      if (!quiet) setPushFeedback(error.message || 'Could not send the push message.')
    } finally {
      setPushSending(false)
    }
  }, [pushSending])

  // The embedded Omni HTML app can post this event to the top-level Bubble Play
  // window. Its sandbox blocks fetch(), so this parent makes the same-site API
  // request after validating the source origin and the expected app identifier.
  useEffect(() => {
    const onEmbeddedPushRequest = event => {
      // Omni renders custom app HTML in a sandboxed srcdoc, whose browser
      // origin is "null". Accept that opaque origin only for this app's
      // explicit bridge event; direct same-origin requests still use the API.
      if (event.origin !== 'null' && event.origin !== 'https://omni.demo.exploreomni.dev') return
      if (event.data?.type !== 'bubble-play:send-push' || event.data?.appId !== 'a810a3e6') return
      // Send to every eligible subscriber in this OneSignal app.
      void handlePushClick({ quiet: true })
    }
    window.addEventListener('message', onEmbeddedPushRequest)
    return () => window.removeEventListener('message', onEmbeddedPushRequest)
  }, [handlePushClick])

  const rawLogo = brand.logoUrl || brand.logo
  const logoSrc = rawLogo
    ? (rawLogo.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(rawLogo)}` : rawLogo)
    : null

  return (
    <div className={`dashboard ${darkMode ? 'dark' : ''}`}>
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <div className="dashboard-brand">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={brand.name}
                className="dashboard-brand-logo"
                onError={e => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
            ) : null}
            <div className="dashboard-brand-text" style={logoSrc ? { display: 'none' } : {}}>
              <Sparkles size={16} style={{ color: brand.primaryColor }} />
              <span>{brand.name}</span>
            </div>
          </div>
        </div>
        <nav className="dashboard-tabs">
            {configuredTabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  className={`dashboard-tab ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  style={isActive ? {
                    background: brand.primaryColor,
                    color: activeBtnText,
                  } : {}}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        <div className="dashboard-header-actions">
          {isOneSignalConfigured() && (
            <button
              className="btn-icon"
              onClick={() => handlePushClick()}
              title="Send a push message to all subscribers"
              aria-label="Send a push message to all subscribers"
              disabled={pushSending}
            >
              <Bell size={20} />
            </button>
          )}
          <button className="btn-icon" onClick={onLogout} title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {pushFeedback && (
        <div role="status" aria-live="polite" style={{ position: 'fixed', top: 72, right: 16, zIndex: 1000, padding: '10px 14px', borderRadius: 8, background: '#fff', color: '#312e81', boxShadow: '0 4px 18px rgba(15, 23, 42, 0.18)', fontSize: 13 }}>
          {pushFeedback}
        </div>
      )}

      <main className="dashboard-main">
        <div className="dashboard-content">
          {activeAppTab ? (
            <OmniEmbed
              contentPath={activeAppTab.path}
              vanityDomain={activeAppTab.vanityDomain || brand.embedVanityDomain}
              secretProfile={activeAppTab.secretProfile || brand.embedSecretProfile}
              themeId={activeAppTab.themeId ?? brand.embedThemeId}
              title={`${brand.name} — ${activeAppTab.label}`}
            />
          ) : (
            ActiveComponent && <ActiveComponent onNavigate={setActiveTab} darkMode={darkMode} />
          )}
        </div>
      </main>
    </div>
  )
}
