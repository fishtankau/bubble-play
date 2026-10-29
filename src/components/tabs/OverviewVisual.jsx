import { useBrand } from '../../context/BrandContext'
import { generatePalette } from '../../utils/colors'
import {
  ArrowRight, ArrowUpRight, Gauge, ShieldCheck, GraduationCap, MessageCircle,
  FolderKanban, Leaf, Car, Wrench, LineChart, Wallet, CheckCircle2,
  Activity, Stethoscope, HeartPulse, ClipboardCheck, FileBarChart, Microscope,
  BrainCircuit, Eye, Compass, Search, Building2, Users,
} from 'lucide-react'

// Brand configs name icons by key so they can stay plain data.
const ICONS = {
  gauge: Gauge, shield: ShieldCheck, coach: GraduationCap, leaf: Leaf, car: Car,
  wrench: Wrench, chart: LineChart, wallet: Wallet, activity: Activity,
  stethoscope: Stethoscope, heart: HeartPulse, clipboard: ClipboardCheck,
  report: FileBarChart, microscope: Microscope, brain: BrainCircuit, eye: Eye,
  compass: Compass, search: Search, building: Building2, users: Users,
  chat: MessageCircle, folder: FolderKanban,
}
const icon = (key, fallback = Gauge) => ICONS[key] || fallback

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
        {metric && (
          <div className="ovf-metric-card">
            <span className="ovf-metric-value" style={{ color: primary }}>{metric}</span>
            <span className="ovf-metric-caption">{caption}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Visual landing page used by brands that set `brand.overview` (Custom Fleet,
// Beamtree). Every word and destination comes from the brand config, so a new
// brand gets this design by supplying data rather than editing this file.
export default function OverviewVisual({ onNavigate }) {
  const { brand } = useBrand()
  const cfg = brand.overview || {}
  const palette = generatePalette(brand.primaryColor)
  const primary = brand.primaryColor
  const apps = Array.isArray(brand.appTabs) ? brand.appTabs : []
  const stats = brand.stats || []
  const products = brand.products || []

  // Where "View Dashboards" and feature links go: the first app tab if the
  // brand has any, otherwise the generic Dashboard tab.
  const primaryTarget = apps[0] ? `app:${apps[0].id}` : 'search'
  const appTarget = i => (apps[i] ? `app:${apps[i].id}` : primaryTarget)

  const tagline = brand.keyMessages?.[0] || brand.name
  // keyMessages[0] is the hero line; the rest are the value props.
  const valueProps = (brand.keyMessages || []).slice(1)

  // Hero shortcuts default to the brand's app tabs.
  const heroLinks = cfg.heroLinks || apps.map((app, i) => ({
    label: app.label,
    icon: (cfg.features?.[i] || {}).icon,
    target: `app:${app.id}`,
  }))

  const features = (cfg.features || []).map((f, i) => ({
    ...f,
    target: f.target || appTarget(i),
    linkLabel: f.linkLabel || `Open ${apps[i]?.label || 'dashboard'}`,
  }))

  const productIcons = cfg.productIcons || []
  const go = target => onNavigate?.(target)

  return (
    <div className="ovf">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section
        className="ovf-hero"
        style={{ background: `linear-gradient(135deg, ${brand.secondaryColor} 0%, ${palette.primaryDark} 55%, ${primary} 140%)` }}
      >
        {brand.heroImage && (
          <>
            <div className="ovf-hero-photo" style={{ backgroundImage: `url(${brand.heroImage})` }} />
            {/* Brand-tinted scrim keeps the copy legible and keeps the
                per-tenant theming over the photograph. */}
            <div
              className="ovf-hero-scrim"
              style={{ background: `linear-gradient(100deg, ${brand.secondaryColor}f5 0%, ${brand.secondaryColor}e0 34%, ${palette.primaryDark}99 64%, ${primary}40 100%)` }}
            />
          </>
        )}
        <div className="ovf-hero-inner">
          <div className="ovf-hero-copy">
            {cfg.eyebrow && (
              <span className="ovf-eyebrow" style={{ background: 'rgba(255,255,255,0.14)', color: '#fff' }}>
                {cfg.eyebrow}
              </span>
            )}
            <h1 className="ovf-hero-title">{tagline}</h1>
            <p className="ovf-hero-sub">{brand.description}</p>
            <div className="ovf-hero-actions">
              <button
                type="button"
                className="ovf-btn ovf-btn-solid"
                style={{ background: '#fff', color: brand.secondaryColor }}
                onClick={() => go(primaryTarget)}
              >
                {cfg.primaryCta || 'View Dashboards'} <ArrowRight size={16} />
              </button>
              <button type="button" className="ovf-btn ovf-btn-ghost" onClick={() => go('aichat')}>
                <MessageCircle size={16} /> {cfg.chatCta || 'Ask a question'}
              </button>
            </div>
          </div>

          {heroLinks.length > 0 && (
            <div className="ovf-hero-art">
              {heroLinks.map((link, i) => {
                const Icon = icon(link.icon)
                const content = (
                  <>
                    <span className="ovf-hero-chip-icon" style={{ background: `${primary}22`, color: '#fff' }}>
                      <Icon size={18} />
                    </span>
                    <span className="ovf-hero-chip-label">{link.label}</span>
                    {!cfg.heroLinksStatic && <ArrowUpRight size={15} className="ovf-hero-chip-arrow" />}
                  </>
                )
                // Static chips are display-only (no navigation, no hover affordance).
                return cfg.heroLinksStatic ? (
                  <div key={`${link.label}-${i}`} className="ovf-hero-chip is-static" style={{ animationDelay: `${i * 0.08}s` }}>
                    {content}
                  </div>
                ) : (
                  <button
                    key={`${link.label}-${i}`}
                    type="button"
                    className="ovf-hero-chip"
                    onClick={() => go(link.target || primaryTarget)}
                    style={{ animationDelay: `${i * 0.08}s` }}
                  >
                    {content}
                  </button>
                )
              })}
            </div>
          )}
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
        <section className={`ovf-feature ${i % 2 === 1 ? 'ovf-feature-alt' : ''}`} key={`${f.title}-${i}`}>
          <div className="ovf-feature-copy">
            <span className="ovf-eyebrow" style={{ background: `${primary}14`, color: primary }}>{f.eyebrow}</span>
            <h2 className="ovf-feature-title">{f.title}</h2>
            <p className="ovf-feature-body">{f.body}</p>
            {f.points?.length > 0 && (
              <ul className="ovf-points">
                {f.points.map(pt => (
                  <li key={pt}>
                    <CheckCircle2 size={17} style={{ color: primary }} /> {pt}
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="ovf-link" style={{ color: primary }} onClick={() => go(f.target)}>
              {f.linkLabel} <ArrowRight size={15} />
            </button>
          </div>
          <FeatureVisual
            palette={palette}
            primary={primary}
            metric={f.metric}
            caption={f.caption}
            Icon={icon(f.icon)}
            flip={i % 2 === 1}
          />
        </section>
      ))}

      {/* ── Products & Services (always a multiple of three) ─────────── */}
      {products.length > 0 && (
        <section className="ovf-services">
          <div className="ovf-section-head">
            <span className="ovf-eyebrow" style={{ background: `${primary}14`, color: primary }}>
              {cfg.servicesEyebrow || 'What we do'}
            </span>
            <h2 className="ovf-section-title">Products &amp; Services</h2>
            {cfg.servicesSub && <p className="ovf-section-sub">{cfg.servicesSub}</p>}
          </div>
          <div className="ovf-service-grid">
            {products.slice(0, Math.max(3, Math.floor(products.length / 3) * 3)).map((p, i) => {
              const Icon = icon(productIcons[i], ShieldCheck)
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
        <h2 className="ovf-cta-title">{cfg.ctaTitle || 'Ready to dive in?'}</h2>
        {cfg.ctaSub && <p className="ovf-cta-sub">{cfg.ctaSub}</p>}
        <div className="ovf-hero-actions ovf-cta-actions">
          <button
            type="button"
            className="ovf-btn ovf-btn-solid"
            style={{ background: '#fff', color: brand.secondaryColor }}
            onClick={() => go(primaryTarget)}
          >
            {cfg.primaryCta || 'View Dashboards'} <ArrowRight size={16} />
          </button>
          <button type="button" className="ovf-btn ovf-btn-ghost" onClick={() => go('hub')}>
            <FolderKanban size={16} /> Open the Hub
          </button>
        </div>
      </section>
    </div>
  )
}
