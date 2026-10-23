import { useBrand } from '../../context/BrandContext'
import { generatePalette, getContrastColor } from '../../utils/colors'
import {
  ArrowRight, ArrowUpRight, Gauge, ShieldCheck, GraduationCap, MessageCircle,
  FolderKanban, Leaf, Car, Wrench, LineChart, Wallet, CheckCircle2,
} from 'lucide-react'

// Icons for the Products & Services grid, in the same order as brand.products.
const PRODUCT_ICONS = [Wrench, ShieldCheck, Leaf, Car, Wallet, LineChart]

// Visual panel that stands in for photography — a soft, brand-tinted scene
// with a floating metric card, so each feature section reads as a picture.
function FeatureVisual({ palette, primary, metric, caption, Icon, flip }) {
  return (
    <div className={`ovf-visual ${flip ? 'ovf-visual-flip' : ''}`}>
      <div
        className="ovf-visual-scene"
        style={{ background: `linear-gradient(145deg, ${primary}14, ${palette.primaryDark}26)` }}
      >
        <div className="ovf-visual-blob" style={{ background: `${primary}1f` }} />
        <div className="ovf-visual-blob ovf-visual-blob-2" style={{ background: `${palette.primaryDark}1a` }} />
        <div className="ovf-visual-glyph" style={{ color: primary }}>
          <Icon size={64} strokeWidth={1.25} />
        </div>
        <div className="ovf-metric-card">
          <span className="ovf-metric-value" style={{ color: primary }}>{metric}</span>
          <span className="ovf-metric-caption">{caption}</span>
        </div>
      </div>
    </div>
  )
}

export default function OverviewFleet({ onNavigate }) {
  const { brand } = useBrand()
  const palette = generatePalette(brand.primaryColor)
  const primary = brand.primaryColor
  const onPrimary = getContrastColor(primary)
  const apps = Array.isArray(brand.appTabs) ? brand.appTabs : []
  const stats = brand.stats || []
  const products = brand.products || []

  const tagline = brand.keyMessages?.[0] || brand.name
  // keyMessages[0] is the hero line; the rest are the value props.
  const valueProps = (brand.keyMessages || []).slice(1)

  // One feature section per Omni app.
  const featureCopy = [
    {
      Icon: Gauge,
      eyebrow: 'Cost & utilisation',
      title: 'See exactly what the fleet costs',
      body: 'Total cost of ownership, leases ending, under-used vehicles, idle fuel and after-hours driving — every depot in one view, refreshed daily.',
      points: ['Cost vs budget by department', 'Leases ending in the next 6 months', 'Under-used vehicles worth right-sizing'],
      metric: '$6.1M',
      caption: 'Total fleet cost · last 12 months',
    },
    {
      Icon: ShieldCheck,
      eyebrow: 'Safety & compliance',
      title: 'Spot risk before it becomes a claim',
      body: 'Driver behaviour, harsh events and compliance gaps surfaced early, so you can act on the vehicles and depots that need attention first.',
      points: ['Driver risk scoring by depot', 'Harsh braking and speeding trends', 'Compliance gaps flagged automatically'],
      metric: '17%',
      caption: 'Share of km outside 7am–6pm',
    },
    {
      Icon: GraduationCap,
      eyebrow: 'Action & coaching',
      title: 'Turn insight into a next step',
      body: 'Assign coaching, book servicing or flag a vehicle as idle straight from the data — the action goes to the right person without leaving the portal.',
      points: ['Assign coaching in one click', 'Book servicing from the vehicle record', 'Track what has actually been actioned'],
      metric: '270',
      caption: 'Vehicles under management',
    },
  ]

  const features = apps.map((app, i) => ({ ...featureCopy[i % featureCopy.length], app }))

  return (
    <div className="ovf">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="ovf-hero" style={{ background: `linear-gradient(135deg, ${brand.secondaryColor} 0%, ${palette.primaryDark} 55%, ${primary} 140%)` }}>
        <div className="ovf-hero-inner">
          <div className="ovf-hero-copy">
            <span className="ovf-eyebrow" style={{ background: 'rgba(255,255,255,0.14)', color: '#fff' }}>
              {brand.name} · Fleet Console
            </span>
            <h1 className="ovf-hero-title">{tagline}</h1>
            <p className="ovf-hero-sub">{brand.description}</p>
            <div className="ovf-hero-actions">
              {apps[0] && (
                <button
                  type="button"
                  className="ovf-btn ovf-btn-solid"
                  style={{ background: '#fff', color: brand.secondaryColor }}
                  onClick={() => onNavigate?.(`app:${apps[0].id}`)}
                >
                  View Dashboards <ArrowRight size={16} />
                </button>
              )}
              <button
                type="button"
                className="ovf-btn ovf-btn-ghost"
                onClick={() => onNavigate?.('aichat')}
              >
                <MessageCircle size={16} /> Ask about the fleet
              </button>
            </div>
          </div>

          <div className="ovf-hero-art">
            {apps.map((app, i) => {
              const Icon = [Gauge, ShieldCheck, GraduationCap][i % 3]
              return (
                <button
                  key={app.id}
                  type="button"
                  className="ovf-hero-chip"
                  onClick={() => onNavigate?.(`app:${app.id}`)}
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <span className="ovf-hero-chip-icon" style={{ background: `${primary}22`, color: '#fff' }}>
                    <Icon size={18} />
                  </span>
                  <span className="ovf-hero-chip-label">{app.label}</span>
                  <ArrowUpRight size={15} className="ovf-hero-chip-arrow" />
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────────────── */}
      {stats.length > 0 && (
        <section className="ovf-trust">
          {stats.map((s, i) => (
            <div className="ovf-trust-item" key={i}>
              <span className="ovf-trust-value" style={{ color: primary }}>{s.value}</span>
              <span className="ovf-trust-label">{s.label}</span>
            </div>
          ))}
        </section>
      )}

      {/* ── Value props ──────────────────────────────────────────────── */}
      {valueProps.length > 0 && (
        <section className="ovf-values">
          {valueProps.map((msg, i) => {
            const [head, ...rest] = msg.split('. ')
            return (
              <div className="ovf-value" key={i}>
                <span className="ovf-value-rule" style={{ background: primary }} />
                <h4 className="ovf-value-title">{head.replace(/\.$/, '')}</h4>
                {rest.length > 0 && <p className="ovf-value-body">{rest.join('. ')}</p>}
              </div>
            )
          })}
        </section>
      )}

      {/* ── Alternating feature sections ─────────────────────────────── */}
      {features.map((f, i) => (
        <section className={`ovf-feature ${i % 2 === 1 ? 'ovf-feature-alt' : ''}`} key={f.app.id}>
          <div className="ovf-feature-copy">
            <span className="ovf-eyebrow" style={{ background: `${primary}14`, color: primary }}>{f.eyebrow}</span>
            <h2 className="ovf-feature-title">{f.title}</h2>
            <p className="ovf-feature-body">{f.body}</p>
            <ul className="ovf-points">
              {f.points.map(pt => (
                <li key={pt}>
                  <CheckCircle2 size={17} style={{ color: primary }} /> {pt}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="ovf-link"
              style={{ color: primary }}
              onClick={() => onNavigate?.(`app:${f.app.id}`)}
            >
              Open {f.app.label} <ArrowRight size={15} />
            </button>
          </div>
          <FeatureVisual
            palette={palette}
            primary={primary}
            metric={f.metric}
            caption={f.caption}
            Icon={f.Icon}
            flip={i % 2 === 1}
          />
        </section>
      ))}

      {/* ── Products & Services (always a multiple of three) ─────────── */}
      {products.length > 0 && (
        <section className="ovf-services">
          <div className="ovf-section-head">
            <span className="ovf-eyebrow" style={{ background: `${primary}14`, color: primary }}>What we do</span>
            <h2 className="ovf-section-title">Products &amp; Services</h2>
            <p className="ovf-section-sub">
              Fleet expertise across the whole lifecycle — from funding and maintenance to safety and electrification.
            </p>
          </div>
          <div className="ovf-service-grid">
            {products.slice(0, Math.max(3, Math.floor(products.length / 3) * 3)).map((p, i) => {
              const Icon = PRODUCT_ICONS[i % PRODUCT_ICONS.length]
              return (
                <article className="ovf-service" key={p.name}>
                  <span className="ovf-service-icon" style={{ background: `${primary}14`, color: primary }}>
                    <Icon size={20} />
                  </span>
                  <h3 className="ovf-service-title">{p.name}</h3>
                  <p className="ovf-service-body">{p.description}</p>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Closing CTA ──────────────────────────────────────────────── */}
      <section className="ovf-cta" style={{ background: `linear-gradient(135deg, ${primary}, ${palette.primaryDark})` }}>
        <h2 className="ovf-cta-title">Ready to look at your fleet?</h2>
        <p className="ovf-cta-sub">Jump straight into the numbers, or ask a question in plain English.</p>
        <div className="ovf-hero-actions ovf-cta-actions">
          {apps[0] && (
            <button
              type="button"
              className="ovf-btn ovf-btn-solid"
              style={{ background: '#fff', color: brand.secondaryColor }}
              onClick={() => onNavigate?.(`app:${apps[0].id}`)}
            >
              View Dashboards <ArrowRight size={16} />
            </button>
          )}
          <button type="button" className="ovf-btn ovf-btn-ghost" onClick={() => onNavigate?.('hub')}>
            <FolderKanban size={16} /> Open the Hub
          </button>
        </div>
      </section>
    </div>
  )
}
