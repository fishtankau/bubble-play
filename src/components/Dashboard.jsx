import { useState, useEffect } from 'react'
import { useBrand } from '../context/BrandContext'
import Overview from './tabs/Overview'
import AIChat from './tabs/AIChat'
import SearchTab from './tabs/Search'
import Flights from './tabs/Flights'
import Hub from './tabs/Hub'
import { Sun, Moon, LogOut, LayoutDashboard, MessageCircle, MonitorDot, Plane, Sparkles, FolderKanban, Bell } from 'lucide-react'
import { getContrastColor } from '../utils/colors'
import { initializeOneSignal, isOneSignalConfigured } from '../utils/oneSignal'

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'aichat', label: 'AI Chat', icon: MessageCircle },
  { id: 'search', label: 'Dashboard', icon: MonitorDot },
  { id: 'flights', label: 'Flights', icon: Plane },
  { id: 'hub', label: 'Hub', icon: FolderKanban },
]

const tabComponents = {
  overview: Overview,
  aichat: AIChat,
  search: SearchTab,
  flights: Flights,
  hub: Hub,
}

export default function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [darkMode, setDarkMode] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushSupported, setPushSupported] = useState(true)
  const [pushReady, setPushReady] = useState(false)
  const [pushMessage, setPushMessage] = useState('')
  const { brand, currentUser } = useBrand()

  // Flights tab is hard-wired to the Port-of-Seattle demo (region-based access
  // filter on the flights topic). Hide it entirely when the `region` user
  // attribute is turned off — without it, the access filter and filter panel
  // queries fail.
  const flightsHidden = brand.embedSendRegionAttribute === false
  const visibleTabs = flightsHidden ? tabs.filter(t => t.id !== 'flights') : tabs

  // If user is currently on Flights but it just got hidden, bounce back to Overview.
  useEffect(() => {
    if (activeTab === 'flights' && flightsHidden) setActiveTab('overview')
  }, [activeTab, flightsHidden])

  const ActiveComponent = tabComponents[activeTab]
  const activeBtnText = getContrastColor(brand.primaryColor)

  useEffect(() => {
    if (!isOneSignalConfigured()) return
    let mounted = true
    let oneSignalInstance
    const onSubscriptionChange = event => {
      const optedIn = Boolean(event.current.optedIn)
      setPushEnabled(optedIn)
      if (optedIn) setPushMessage('This browser is subscribed to OneSignal web push.')
    }

    initializeOneSignal()
      .then(OneSignal => {
        if (!mounted || !OneSignal) return
        oneSignalInstance = OneSignal
        setPushSupported(OneSignal.Notifications.isPushSupported())
        OneSignal.User.PushSubscription.addEventListener('change', onSubscriptionChange)
        const optedIn = Boolean(OneSignal.User.PushSubscription.optedIn)
        setPushEnabled(optedIn)
        if (optedIn) setPushMessage('This browser is subscribed to OneSignal web push.')
        setPushReady(true)
      })
      .catch(error => console.error('OneSignal initialization failed:', error))
    return () => {
      mounted = false
      oneSignalInstance?.User.PushSubscription.removeEventListener('change', onSubscriptionChange)
    }
  }, [])

  const handlePushClick = async () => {
    try {
      const OneSignal = await initializeOneSignal()
      if (!OneSignal) return
      if (!OneSignal.Notifications.isPushSupported()) {
        setPushSupported(false)
        setPushMessage('This browser does not support web push notifications.')
        return
      }
      setPushMessage('Choose Allow in the browser prompt to subscribe.')
      await OneSignal.User.PushSubscription.optIn()
      const optedIn = Boolean(OneSignal.User.PushSubscription.optedIn)
      setPushEnabled(optedIn)
      if (optedIn) {
        setPushMessage('This browser is subscribed to OneSignal web push. Send a test message from OneSignal to verify delivery.')
      } else if (window.Notification?.permission === 'denied') {
        setPushMessage('Notifications are blocked for this site. Allow them in your browser site settings, then try again.')
      } else if (window.Notification?.permission === 'granted') {
        setPushMessage('Browser permission is allowed, but OneSignal has not confirmed a subscription yet. Check the OneSignal Web Push site configuration.')
      } else {
        setPushMessage('No permission was granted. Click the bell and allow notifications to subscribe.')
      }
    } catch (error) {
      console.error('Could not enable push notifications:', error)
      setPushMessage('OneSignal could not enable web push. Check the browser console and OneSignal site configuration.')
    }
  }

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
            {visibleTabs.map(tab => {
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
              onClick={handlePushClick}
              title={!pushSupported ? 'Push notifications are not supported in this browser' : pushEnabled ? 'Notifications enabled' : 'Enable notifications'}
              aria-label={!pushSupported ? 'Push notifications are not supported' : pushEnabled ? 'Notifications enabled' : 'Enable notifications'}
              disabled={!pushReady || !pushSupported || pushEnabled}
            >
              <Bell size={20} />
            </button>
          )}
          <button
            className="btn-icon"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="btn-icon" onClick={onLogout} title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {pushMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{ position: 'fixed', top: 72, right: 16, zIndex: 1000, maxWidth: 360, padding: '10px 14px', borderRadius: 8, background: '#fff', color: '#312e81', boxShadow: '0 4px 18px rgba(15, 23, 42, 0.18)', fontSize: 13 }}
        >
          {pushMessage}
        </div>
      )}

      <main className="dashboard-main">
        <div className="dashboard-content">
          <ActiveComponent onNavigate={setActiveTab} darkMode={darkMode} />
        </div>
      </main>
    </div>
  )
}
