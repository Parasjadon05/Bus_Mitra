import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import BusDiscovery from './pages/BusDiscovery'
import BusDetails from './pages/BusDetails'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/discover" element={<BusDiscovery />} />
      <Route path="/bus/:busId" element={<BusDetails />} />
    </Routes>
  )
}

export default App
