import { useState, useEffect } from 'react'
import { useBrand } from '../../context/BrandContext'
import { FolderKanban, AlertCircle, Loader2, ExternalLink } from 'lucide-react'

// Omni APPLICATION-mode Hub embed. Lands users on the org-wide Hub
// (`contentPath=/root`) so they see the org's shared content (Templates,
// etc.) alongside *their* entity folder. `entity` is sent so Omni
// auto-provisions a folder named after the current brand. The folder is
// scoped to a per-brand group (`<entity>` — derived from embedEntityKey
// or embedHubGroups override) instead of "All Embed Users", so other
// brands' entity folders don't pollute this user's Hub view.
export default function Hub() {
  const { brand, currentUser } = useBrand()
  const [embedUrl, setEmbedUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!brand.embedSecret) {
      setEmbedUrl(null)
      return
    }

    setLoading(true)
    setError('')

    // Build connectionRoles — same strategy as the other tabs
    let connectionRoles = undefined
    const role = brand.aiConnectionRole || 'RESTRICTED_QUERIER'
    if (brand.aiConnectionId) {
      connectionRoles = JSON.stringify({ [brand.aiConnectionId]: role })
    } else if (brand.allConnections?.length > 0) {
      const allRoles = {}
      brand.allConnections.forEach(c => { allRoles[c.id] = role })
      connectionRoles = JSON.stringify(allRoles)
    }

    // Always put the user in "All Embed Users" (so they see org-shared
    // content like the Templates folder) PLUS a per-brand group named
    // after the entity key (so their auto-provisioned entity folder is
    // scoped — keeps other brands' entity folders out of this user's
    // Hub view). embedHubGroups can override the per-brand portion.
    const baseGroup = 'All Embed Users'
    const brandGroup = (brand.embedHubGroups && brand.embedHubGroups !== 'All Embed Users')
      ? brand.embedHubGroups
      : brand.embedEntityKey
    const groupValue = [baseGroup, brandGroup].filter(Boolean).join(',')
    // Use a per-brand externalId so users from one industry don't carry
    // stale group memberships into another. Combines login id + entity.
    const scopedExternalId = brand.embedEntityKey
      ? `${currentUser?.externalId || 'guest'}-${brand.embedEntityKey}`
      : currentUser?.externalId

    fetch('/api/omni-embed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: brand.embedSecret,
        contentPath: '/root',
        vanityDomain: brand.embedVanityDomain || '',
        connectionRoles,
        linkAccess: '__omni_link_access_open',
        mode: 'APPLICATION',
        entity: brand.embedEntityKey,
        entityFolderContentRole: ['MANAGER', 'EDITOR', 'VIEWER', 'NO_ACCESS'].includes(brand.embedEntityFolderRole)
          ? brand.embedEntityFolderRole
          : 'MANAGER',
        groups: groupValue,
        theme: 'blank',
        prefersDark: false,
        externalId: scopedExternalId,
        name: currentUser?.name,
        email: currentUser?.email,
        userAttributes: brand.embedSendRegionAttribute === false ? undefined : currentUser?.userAttributes,
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
        setEmbedUrl(data.url)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [
    brand.embedSecret,
    brand.embedVanityDomain,
    brand.embedEntityKey,
    brand.embedEntityFolderRole,
    brand.embedHubGroups,
    brand.embedSendRegionAttribute,
    currentUser?.externalId,
  ])

  if (!brand.embedSecret) {
    return (
      <div className="embed-placeholder">
        <div className="embed-placeholder-icon" style={{ background: `${brand.primaryColor}15`, color: brand.primaryColor }}>
          <FolderKanban size={48} />
        </div>
        <h3>{brand.name} Hub</h3>
        <p>To embed the Hub, add your <strong>Embed Secret</strong> in the Configuration page.</p>
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

  if (loading) {
    return (
      <div className="embed-placeholder">
        <Loader2 size={32} className="spin" style={{ color: brand.primaryColor }} />
        <p>Loading {brand.name} Hub...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="embed-placeholder">
        <AlertCircle size={48} style={{ color: '#dc2626' }} />
        <h3>Embed Error</h3>
        <p style={{ color: '#dc2626' }}>{error}</p>
      </div>
    )
  }

  return (
    <div className="tab-embed">
      {embedUrl && (
        <iframe
          src={embedUrl}
          title={`${brand.name} Hub`}
          className="omni-embed-iframe"
          frameBorder="0"
          allow="clipboard-write"
          allowFullScreen
        />
      )}
    </div>
  )
}
