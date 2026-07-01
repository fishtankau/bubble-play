import { useState, useEffect } from 'react'
import {
  CalendarClock, X, CheckCircle2, Send, Loader2, FileText, Layers,
} from 'lucide-react'

// Output formats offered to the end user. Values match the Omni schedules API.
const FORMATS = [
  { id: 'pdf', label: 'PDF' },
  { id: 'csv', label: 'CSV' },
  { id: 'xlsx', label: 'Excel' },
  { id: 'png', label: 'PNG' },
]

const FREQUENCIES = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
]

const WEEKDAYS = [
  { id: 'MON', label: 'Mon' }, { id: 'TUE', label: 'Tue' }, { id: 'WED', label: 'Wed' },
  { id: 'THU', label: 'Thu' }, { id: 'FRI', label: 'Fri' }, { id: 'SAT', label: 'Sat' },
  { id: 'SUN', label: 'Sun' },
]

// Build an AWS EventBridge cron expression (the format Omni expects) from the
// simple options exposed to the user. 6 fields: min hour day-of-month month day-of-week year
function buildCron({ frequency, time, weekday, monthday }) {
  const [hRaw, mRaw] = (time || '09:00').split(':')
  const h = Math.min(23, Math.max(0, parseInt(hRaw, 10) || 0))
  const m = Math.min(59, Math.max(0, parseInt(mRaw, 10) || 0))
  if (frequency === 'weekly') return `${m} ${h} ? * ${weekday} *`
  if (frequency === 'monthly') return `${m} ${h} ${monthday} * ? *`
  return `${m} ${h} * * ? *` // daily
}

// Pretty 12-hour label for the chosen time.
function prettyTime(time) {
  const [hRaw, mRaw] = (time || '09:00').split(':')
  let h = parseInt(hRaw, 10) || 0
  const m = (mRaw || '00').padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
}

export default function ScheduleDeliveryModal({
  brand = {},
  dashboardId,
  dashboardName = 'Dashboard',
  userEmail = '',
  onClose,
}) {
  const primary = brand.primaryColor || '#6366f1'
  const timezone = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } catch { return 'UTC' }
  })()

  const [email, setEmail] = useState(userEmail || '')
  const [frequency, setFrequency] = useState('weekly')
  const [weekday, setWeekday] = useState('MON')
  const [monthday, setMonthday] = useState(1)
  const [time, setTime] = useState('09:00')
  const [format, setFormat] = useState('pdf')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Auto-dismiss shortly after success.
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => onClose?.(), 2200)
    return () => clearTimeout(t)
  }, [done, onClose])

  const summary = (() => {
    const fmt = FORMATS.find(f => f.id === format)?.label || format.toUpperCase()
    let when = `every day at ${prettyTime(time)}`
    if (frequency === 'weekly') when = `every ${WEEKDAYS.find(d => d.id === weekday)?.label || 'Mon'} at ${prettyTime(time)}`
    if (frequency === 'monthly') when = `on day ${monthday} each month at ${prettyTime(time)}`
    return `${fmt} · ${when}`
  })()

  const emailValid = /\S+@\S+\.\S+/.test(email.trim())
  const canSubmit = emailValid && !submitting && !done

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    const schedule = buildCron({ frequency, time, weekday, monthday })
    try {
      const res = await fetch('/api/omni-create-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: brand.omniApiKey,
          vanityDomain: brand.embedVanityDomain || '',
          identifier: dashboardId,
          name: `${dashboardName} delivery`,
          schedule,
          timezone,
          format,
          destinationType: 'email',
          recipients: [email.trim()],
          subject: `${dashboardName} — scheduled delivery`,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Request failed (HTTP ${res.status})`)
      // eslint-disable-next-line no-console
      console.log('[ScheduleDelivery] created', { schedule, timezone, format, email: email.trim(), response: data })
      setDone(true)
    } catch (err) {
      setError(err.message || 'Could not create the schedule.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="cfm-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="cfm-card" role="dialog" aria-modal="true" aria-label="Schedule delivery">
        <button className="cfm-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {done ? (
          <div className="cfm-success">
            <div className="cfm-success-icon" style={{ background: `${primary}18`, color: primary }}>
              <CheckCircle2 size={40} />
            </div>
            <h3>Delivery scheduled</h3>
            <p>We&apos;ll email <strong>{email.trim()}</strong> {summary.split(' · ')[1]}.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="cfm-chip">
              <CalendarClock size={11} /> Omni Schedules API
            </div>

            <div className="cfm-header">
              <div className="cfm-avatar" style={{ background: primary }}>
                <CalendarClock size={20} />
              </div>
              <div className="cfm-header-text">
                <h3 className="cfm-title">Schedule delivery</h3>
                <span className="cfm-identity-sub"><Layers size={11} /> {dashboardName}</span>
              </div>
            </div>

            <div className="cfm-field">
              <label>Send to</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="cfm-section-label">Schedule</div>
            <div className="sdm-seg">
              {FREQUENCIES.map(f => (
                <button
                  type="button"
                  key={f.id}
                  className={`sdm-seg-btn ${frequency === f.id ? 'active' : ''}`}
                  style={frequency === f.id ? { borderColor: primary, background: `${primary}0d`, color: primary } : {}}
                  onClick={() => setFrequency(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="sdm-row">
              {frequency === 'weekly' && (
                <div className="cfm-field sdm-grow">
                  <label>Day of week</label>
                  <select value={weekday} onChange={e => setWeekday(e.target.value)}>
                    {WEEKDAYS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                </div>
              )}
              {frequency === 'monthly' && (
                <div className="cfm-field sdm-grow">
                  <label>Day of month</label>
                  <select value={monthday} onChange={e => setMonthday(Number(e.target.value))}>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
              <div className="cfm-field sdm-grow">
                <label>Time</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} />
              </div>
            </div>

            <div className="cfm-section-label">Format</div>
            <div className="sdm-seg">
              {FORMATS.map(f => (
                <button
                  type="button"
                  key={f.id}
                  className={`sdm-seg-btn ${format === f.id ? 'active' : ''}`}
                  style={format === f.id ? { borderColor: primary, background: `${primary}0d`, color: primary } : {}}
                  onClick={() => setFormat(f.id)}
                >
                  <FileText size={13} /> {f.label}
                </button>
              ))}
            </div>

            <div className="sdm-summary" style={{ background: `${primary}0d`, color: primary }}>
              <CalendarClock size={13} /> {summary}
            </div>
            <p className="sdm-note">Delivers the dashboard as shown — current filters are not applied. Times are in {timezone}.</p>

            {error && <div className="sdm-error">{error}</div>}

            <div className="cfm-footer">
              <button type="button" className="cfm-btn cfm-btn-ghost" onClick={onClose}>Cancel</button>
              <button
                type="submit"
                className="cfm-btn cfm-btn-primary"
                style={{ background: canSubmit ? primary : '#cbd5e1' }}
                disabled={!canSubmit}
              >
                {submitting ? <Loader2 size={14} className="sdm-spin" /> : <Send size={14} />}
                {submitting ? 'Scheduling…' : 'Schedule delivery'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
