import { useBrand } from '../../context/BrandContext'
import { generatePalette, getContrastColor } from '../../utils/colors'
import {
  ExternalLink, ArrowRight, Sparkles, Star, Zap,
  Heart, Award, Globe, TrendingUp, MessageCircle, MonitorDot,
  FolderKanban, Wand2
} from 'lucide-react'

function FloatingSparkle({ style, size = 16, delay = 0, color }) {
  return (
    <div className="floating-sparkle" style={{ ...style, animationDelay: `${delay}s` }}>
      <Sparkles size={size} style={{ color }} />
    </div>
  )
}

export default function Overview({ onNavigate }) {
  const { brand } = useBrand()
  const palette = generatePalette(brand.primaryColor)
  const heroBtnText = getContrastColor(brand.primaryColor)

  const hasProducts = brand.products?.length > 0

  // Three primary portal CTAs that link to other tabs
  const portalCards = [
    {
      id: 'aichat',
      icon: MessageCircle,
      eyebrow: 'AI-powered',
      title: 'Ask in Plain English',
      desc: 'Get answers from your data by chatting with our AI agents — no SQL, no dashboards required.',
      cta: 'Open AI Chat',
    },
    {
      id: 'search',
      icon: MonitorDot,
      eyebrow: 'Always on',
      title: 'Live Dashboards',
      desc: 'Browse curated metrics across your business with real-time, always-fresh dashboards.',
      cta: 'View Dashboards',
    },
    {
      id: 'hub',
      icon: Wand2,
      eyebrow: 'Self-serve',
      title: 'Create Your Own',
      desc: 'Spin up your own explorations and save them to your team hub — share with your org in a click.',
      cta: 'Open Hub',
    },
  ]

  return (
    <div className="tab-homepage">
      {/* Hero Banner */}
      <div className="homepage-hero" style={{ background: `linear-gradient(135deg, ${brand.secondaryColor}, ${palette.primaryDark})` }}>
        <div className="sparkle-field">
          <FloatingSparkle style={{ top: '10%', left: '8%' }} size={14} delay={0} color={brand.primaryColor} />
          <FloatingSparkle style={{ top: '20%', right: '12%' }} size={20} delay={0.8} color={palette.primaryLight} />
          <FloatingSparkle style={{ bottom: '25%', left: '15%' }} size={12} delay={1.6} color={brand.primaryColor} />
          <FloatingSparkle style={{ top: '15%', left: '40%' }} size={16} delay={2.2} color={palette.primaryLight} />
          <FloatingSparkle style={{ bottom: '15%', right: '8%' }} size={18} delay={0.4} color={brand.primaryColor} />
          <FloatingSparkle style={{ top: '50%', left: '5%' }} size={10} delay={3.0} color={palette.primaryMuted} />
          <FloatingSparkle style={{ bottom: '35%', right: '25%' }} size={14} delay={1.2} color={palette.primaryLight} />
          <FloatingSparkle style={{ top: '35%', right: '5%' }} size={11} delay={2.6} color={brand.primaryColor} />
        </div>

        <div className="homepage-hero-content">
          <div className="hero-badge" style={{ background: `${brand.primaryColor}22`, color: brand.primaryColor }}>
            <Sparkles size={14} /> About {brand.name}
          </div>
          <h1 className="homepage-hero-title" style={{ color: '#fff' }}>
            {brand.keyMessages?.[0] || brand.name}
          </h1>
          <p className="homepage-hero-desc" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {brand.description || `Welcome to ${brand.name}`}
          </p>
          <div className="homepage-hero-actions">
            <a
              href="https://omni.co/"
              target="_blank"
              rel="noopener noreferrer"
              className="homepage-hero-btn"
              style={{ background: brand.primaryColor, color: heroBtnText }}
            >
              <Zap size={16} /> Visit Site <ExternalLink size={16} />
            </a>
          </div>
        </div>

        <div className="hero-orb hero-orb-1" style={{ background: brand.primaryColor }} />
        <div className="hero-orb hero-orb-2" style={{ background: palette.primaryLight }} />
        <div className="hero-orb hero-orb-3" style={{ background: brand.primaryColor }} />
      </div>

      {/* Welcome to the portal — main CTA section (replaces "Our Values") */}
      <div className="portal-welcome">
        <div className="portal-welcome-header">
          <div className="section-eyebrow center" style={{ color: brand.primaryColor }}>
            <Sparkles size={16} /> {brand.name}
          </div>
          <h3 className="homepage-section-title center">
            Welcome to your <span style={{ color: brand.primaryColor }}>AI Analytics</span> Portal
          </h3>
          <p className="portal-welcome-desc">
            Explore your data with our AI agents, live dashboards, or build your own —
            everything you need to turn questions into answers, all in one place.
          </p>
        </div>

        <div className="portal-cards-grid">
          {portalCards.map((card, i) => {
            const Icon = card.icon
            return (
              <button
                key={card.id}
                type="button"
                className="portal-card"
                onClick={() => onNavigate?.(card.id)}
                style={{
                  '--accent': brand.primaryColor,
                  '--accent-light': palette.primaryLight,
                  '--accent-dark': palette.primaryDark,
                }}
              >
                <div className="portal-card-icon-wrap">
                  <div
                    className="portal-card-icon"
                    style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${palette.primaryDark})` }}
                  >
                    <Icon size={28} strokeWidth={2} color="#fff" />
                  </div>
                  <div className="portal-card-icon-glow" style={{ background: brand.primaryColor }} />
                </div>
                <span className="portal-card-eyebrow" style={{ color: brand.primaryColor }}>
                  {card.eyebrow}
                </span>
                <h3 className="portal-card-title">{card.title}</h3>
                <p className="portal-card-desc">{card.desc}</p>
                <span className="portal-card-cta" style={{ color: brand.primaryColor }}>
                  {card.cta} <ArrowRight size={16} />
                </span>
                <div className="portal-card-corner" style={{ background: `${brand.primaryColor}10` }} />
                <span className="portal-card-step">0{i + 1}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Products & Services (styled like "Our Brands") */}
      {hasProducts && (
        <div className="homepage-products-section">
          <div className="section-eyebrow center" style={{ color: brand.primaryColor }}>
            <TrendingUp size={16} /> Our Brands
          </div>
          <h2 className="homepage-section-title center">Products & Services</h2>
          <div className="homepage-products-grid">
            {brand.products.map((p, i) => (
              <div key={i} className="homepage-product-card" style={{ '--card-accent': brand.primaryColor }}>
                {p.image && (
                  <div className="homepage-product-img">
                    <img
                      src={`/api/proxy-image?url=${encodeURIComponent(p.image)}`}
                      alt={p.name}
                      onError={e => { e.target.parentElement.style.display = 'none' }}
                    />
                  </div>
                )}
                <div className="homepage-product-info">
                  <h3>{p.name}</h3>
                  {p.description && <p>{p.description}</p>}
                  <span className="homepage-product-link" style={{ color: brand.primaryColor }}>
                    Learn more <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats / Highlights Bar */}
      <div className="homepage-stats" style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${palette.primaryDark})` }}>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-number" style={{ color: '#fff' }}>500+</span>
            <span className="stat-label">Team Members</span>
          </div>
          <div className="stat-item">
            <span className="stat-number" style={{ color: '#fff' }}>50M+</span>
            <span className="stat-label">Customers Served</span>
          </div>
          <div className="stat-item">
            <span className="stat-number" style={{ color: '#fff' }}>25+</span>
            <span className="stat-label">Countries</span>
          </div>
          <div className="stat-item">
            <span className="stat-number" style={{ color: '#fff' }}>99.9%</span>
            <span className="stat-label">Uptime</span>
          </div>
        </div>
      </div>

      {/* Life at Brand */}
      <div className="homepage-life">
        <div className="section-eyebrow center" style={{ color: brand.primaryColor }}>
          <Star size={16} /> Life at {brand.name}
        </div>
        <h2 className="homepage-section-title center">Join Our Team</h2>
        <div className="life-grid">
          <div className="life-card">
            <div className="life-card-icon" style={{ background: `${brand.primaryColor}15`, color: brand.primaryColor }}>
              <Heart size={24} />
            </div>
            <h3>Diversity & Inclusion</h3>
            <p>We celebrate differences and foster an inclusive environment where everyone can thrive.</p>
          </div>
          <div className="life-card">
            <div className="life-card-icon" style={{ background: `${brand.primaryColor}15`, color: brand.primaryColor }}>
              <Award size={24} />
            </div>
            <h3>Rewards & Benefits</h3>
            <p>Competitive compensation, flexible working, and comprehensive benefits for all team members.</p>
          </div>
          <div className="life-card">
            <div className="life-card-icon" style={{ background: `${brand.primaryColor}15`, color: brand.primaryColor }}>
              <Globe size={24} />
            </div>
            <h3>Community</h3>
            <p>Making a positive impact through community partnerships and sustainability initiatives.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="homepage-footer" style={{ background: brand.secondaryColor }}>
        <Sparkles size={14} style={{ color: brand.primaryColor, opacity: 0.7 }} />
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
          Powered by Fishtank Bubble
        </span>
        <Sparkles size={14} style={{ color: brand.primaryColor, opacity: 0.7 }} />
      </div>
    </div>
  )
}
