import { useState, useEffect } from 'react'
import {
  Zap, X, Clock, MessageSquare, Briefcase, Ticket,
  Star, Send, CheckCircle2, Plane,
} from 'lucide-react'

// Feedback categories — mirror the "choose an action" radio cards from the
// reference design, but framed as feedback topics for an airline carrier.
const TOPICS = [
  { id: 'delays', label: 'Flight Delays', icon: Clock, desc: 'Report recurring or severe on-time performance issues.' },
  { id: 'service', label: 'Customer Service', icon: MessageSquare, desc: 'Praise or concerns about staff, crew, and support.' },
  { id: 'baggage', label: 'Baggage Handling', icon: Briefcase, desc: 'Lost, damaged, mishandled, or delayed baggage.' },
  { id: 'booking', label: 'Booking & Fares', icon: Ticket, desc: 'Pricing, changes, refunds, and reservations.' },
]

// Build up-to-two-letter initials for the carrier avatar.
function carrierInitials(name = '') {
  const words = name.replace(/[^A-Za-z0-9 ]/g, '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '✈'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export default function CarrierFeedbackModal({
  carrier,
  brand = {},
  userEmail = '',
  triggerLabel = 'Via iframe click event',
  onClose,
  onSubmit,
}) {
  const primary = brand.primaryColor || '#6366f1'
  const [topic, setTopic] = useState('delays')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState(userEmail || '')
  const [submitted, setSubmitted] = useState(false)

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Auto-dismiss shortly after a successful submit.
  useEffect(() => {
    if (!submitted) return
    const t = setTimeout(() => onClose?.(), 1900)
    return () => clearTimeout(t)
  }, [submitted, onClose])

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = { carrier, topic, rating, message: message.trim(), email: email.trim() }
    onSubmit?.(data)
    // eslint-disable-next-line no-console
    console.log('[CarrierFeedback] submitted', data)
    setSubmitted(true)
  }

  const canSubmit = message.trim().length > 0 && !submitted

  return (
    <div className="cfm-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="cfm-card" role="dialog" aria-modal="true" aria-label={`Feedback for ${carrier}`}>
        <button className="cfm-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {submitted ? (
          <div className="cfm-success">
            <div className="cfm-success-icon" style={{ background: `${primary}18`, color: primary }}>
              <CheckCircle2 size={40} />
            </div>
            <h3>Feedback sent</h3>
            <p>Thanks — your feedback for <strong>{carrier}</strong> has been recorded.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="cfm-chip">
              <Zap size={11} /> {triggerLabel}
            </div>

            <div className="cfm-header">
              <div className="cfm-avatar" style={{ background: primary }}>
                {carrierInitials(carrier)}
              </div>
              <div className="cfm-header-text">
                <h3 className="cfm-title">Feedback for {carrier}</h3>
                <span className="cfm-identity-sub"><Plane size={11} /> Air Carrier</span>
              </div>
            </div>

            <div className="cfm-section-label">What&apos;s this about?</div>
            <div className="cfm-topics">
              {TOPICS.map(t => {
                const Icon = t.icon
                const active = topic === t.id
                return (
                  <button
                    type="button"
                    key={t.id}
                    className={`cfm-topic ${active ? 'active' : ''}`}
                    style={active ? { borderColor: primary, background: `${primary}0d` } : {}}
                    onClick={() => setTopic(t.id)}
                    title={t.desc}
                  >
                    <span className="cfm-topic-icon" style={{ background: active ? primary : '#eef2ff', color: active ? '#fff' : primary }}>
                      <Icon size={15} />
                    </span>
                    <span className="cfm-topic-label">{t.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="cfm-rate-row">
              <span className="cfm-section-label cfm-inline-label">Overall rating</span>
              <div className="cfm-stars">
                {[1, 2, 3, 4, 5].map(n => {
                  const filled = (hoverRating || rating) >= n
                  return (
                    <button
                      type="button"
                      key={n}
                      className="cfm-star"
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(n)}
                      aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    >
                      <Star size={22} fill={filled ? '#f59e0b' : 'none'} color={filled ? '#f59e0b' : '#cbd5e1'} />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="cfm-field">
              <label>Your feedback</label>
              <textarea
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={`What should ${carrier} know?`}
              />
            </div>

            <div className="cfm-field">
              <label>Email <span className="cfm-optional">(optional)</span></label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="cfm-footer">
              <button type="button" className="cfm-btn cfm-btn-ghost" onClick={onClose}>Cancel</button>
              <button
                type="submit"
                className="cfm-btn cfm-btn-primary"
                style={{ background: canSubmit ? primary : '#cbd5e1' }}
                disabled={!canSubmit}
              >
                <Send size={14} /> Send Feedback
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
