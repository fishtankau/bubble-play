import { useState } from 'react'
import { useBrand } from '../context/BrandContext'
import { resolveLogin } from '../utils/loginConfig'

const NEUTRAL_PRIMARY = '#6366f1'
const NEUTRAL_SECONDARY = '#1e1b4b'

export default function Login({ onLogin }) {
  const { updateBrand, setCurrentUser } = useBrand()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const res = resolveLogin(username, password)
    if (!res.ok) {
      setError(res.error || 'Invalid login.')
      return
    }
    // Switch to the brand for this login, set the Omni user, then enter.
    updateBrand(res.brand)
    setCurrentUser(res.user)
    onLogin(res.user)
  }

  return (
    <div className="login-page" style={{ '--brand-primary': NEUTRAL_PRIMARY, '--brand-secondary': NEUTRAL_SECONDARY }}>
      {/* Background Pattern */}
      <svg className="login-bg-pattern" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="arcs" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
            <path d="M0 200 Q100 100 200 200" fill="none" stroke={NEUTRAL_SECONDARY} strokeWidth="1" opacity="0.08" />
            <path d="M-100 200 Q0 100 100 200" fill="none" stroke={NEUTRAL_SECONDARY} strokeWidth="1" opacity="0.08" />
            <path d="M100 200 Q200 100 300 200" fill="none" stroke={NEUTRAL_SECONDARY} strokeWidth="1" opacity="0.08" />
            <path d="M0 0 Q100 100 200 0" fill="none" stroke={NEUTRAL_SECONDARY} strokeWidth="1" opacity="0.05" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#arcs)" />
      </svg>

      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <div className="login-brand-text">
            <span className="login-brand-name">Login</span>
          </div>
        </div>

        <div className="login-field">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => { setUsername(e.target.value); setError('') }}
            autoComplete="off"
            autoFocus
          />
        </div>
        <div className="login-field">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
          />
        </div>

        {error && <div className="login-error">{error}</div>}

        <button
          type="submit"
          className="login-btn"
          style={{ background: NEUTRAL_PRIMARY, color: '#fff' }}
        >
          Login
        </button>
      </form>
    </div>
  )
}
