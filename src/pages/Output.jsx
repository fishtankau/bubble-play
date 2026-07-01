import { useState } from 'react'
import Login from '../components/Login'
import Dashboard from '../components/Dashboard'

export default function Output() {
  const [loggedIn, setLoggedIn] = useState(false)

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />
  }

  return <Dashboard onLogout={() => setLoggedIn(false)} />
}
