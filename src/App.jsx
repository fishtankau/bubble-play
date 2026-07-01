import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { BrandProvider } from './context/BrandContext'
import Output from './pages/Output'

export default function App() {
  return (
    <BrandProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Output />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </BrandProvider>
  )
}
