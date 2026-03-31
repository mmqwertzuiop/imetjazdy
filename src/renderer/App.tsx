import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Vozidla from './pages/Vozidla'
import Paliva from './pages/Paliva'
import VyuctovanieFiremne from './pages/VyuctovanieFiremne'
import VyuctovanieSukromne from './pages/VyuctovanieSukromne'
import Historia from './pages/Historia'
import Nastavenia from './pages/Nastavenia'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/vozidla" replace />} />
        <Route path="/vozidla" element={<Vozidla />} />
        <Route path="/paliva" element={<Paliva />} />
        <Route path="/vyuctovanie/firemne-doma" element={<VyuctovanieFiremne typ="firemne_doma" />} />
        <Route path="/vyuctovanie/firemne-zahranicie" element={<VyuctovanieFiremne typ="firemne_zahranicie" />} />
        <Route path="/vyuctovanie/sukromne-doma" element={<VyuctovanieSukromne typ="sukromne_doma" />} />
        <Route path="/vyuctovanie/sukromne-zahranicie" element={<VyuctovanieSukromne typ="sukromne_zahranicie" />} />
        <Route path="/historia" element={<Historia />} />
        <Route path="/nastavenia" element={<Nastavenia />} />
      </Route>
    </Routes>
  )
}
