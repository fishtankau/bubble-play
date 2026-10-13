import { useEffect, useState } from 'react'
import { useBrand } from '../context/BrandContext'
import { AlertCircle, ExternalLink, Loader2, MonitorDot } from 'lucide-react'

export default function OmniEmbed({ contentPath, vanityDomain, secretProfile, themeId, title }) {
  const { brand, currentUser } = useBrand()
  const [embedUrl, setEmbedUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!contentPath || !secretProfile) {
      setEmbedUrl(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    const customTheme = {
      'dashboard-background': '#f8f9fa',
      'dashboard-key-color': brand.primaryColor,
      'dashboard-tile-border-color': `${brand.primaryColor}22`,
      'dashboard-control-outline-color': brand.primaryColor,
      'dashboard-tile-title-text-color': brand.secondaryColor,
    }

    fetch('/api/omni-embed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: 'env',
        secretProfile,
        contentPath,
        vanityDomain,
        customThemeId: themeId || undefined,
        customTheme: themeId ? undefined : customTheme,
        linkAccess: '__omni_link_access_open',
        externalId: currentUser?.externalId,
        name: currentUser?.name,
        email: currentUser?.email,
        userAttributes: brand.embedSendRegionAttribute === false ? undefined : currentUser?.userAttributes,
      }),
    })
      .then(async response => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok || data.error) throw new Error(data.error || 'Could not generate the Omni embed URL.')
        return data
      })
      .then(data => { if (!cancelled) setEmbedUrl(data.url) })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [brand.embedSendRegionAttribute, brand.primaryColor, brand.secondaryColor, contentPath, currentUser?.email, currentUser?.externalId, currentUser?.name, secretProfile, themeId, vanityDomain])

  if (loading) {
    return <div className="embed-placeholder"><Loader2 size={32} className="spin" style={{ color: brand.primaryColor }} /><p>Generating signed Omni URL...</p></div>
  }

  if (!contentPath || !secretProfile) {
    return <div className="embed-placeholder"><MonitorDot size={48} style={{ color: brand.primaryColor }} /><h3>{title}</h3><p>This Omni embed is not configured.</p></div>
  }

  if (error) {
    return <div className="embed-placeholder"><AlertCircle size={48} style={{ color: '#dc2626' }} /><h3>Embed Error</h3><p style={{ color: '#dc2626' }}>{error}</p><a href={`https://${vanityDomain}/${contentPath.replace(/^\//, '')}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Open in Omni</a></div>
  }

  return (
    <div className="tab-embed">
      <iframe
        src={embedUrl || undefined}
        title={title}
        className="omni-embed-iframe"
        frameBorder="0"
        allow="clipboard-write"
        allowFullScreen
      />
    </div>
  )
}
