import { NavLink, useLocation } from 'react-router-dom'
import { Car, Fuel, FileText, FolderOpen, ChevronDown, ChevronRight, Settings, Scale } from 'lucide-react'
import { useState } from 'react'
import imetLogo from '../../assets/imet-logo.png'

const vyuctovanieItems = [
  { path: '/vyuctovanie/firemne-doma', label: 'Firemné auto: Doma' },
  { path: '/vyuctovanie/firemne-zahranicie', label: 'Firemné auto: Zahraničie' },
  { path: '/vyuctovanie/sukromne-doma', label: 'Súkromné auto: Doma' },
  { path: '/vyuctovanie/sukromne-zahranicie', label: 'Súkromné auto: Zahraničie' },
]

export default function Sidebar() {
  const location = useLocation()
  const [vyuctovanieOpen, setVyuctovanieOpen] = useState(
    location.pathname.startsWith('/vyuctovanie')
  )

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary text-white'
        : 'text-gray-300 hover:text-white hover:bg-white/10'
    }`

  return (
    <aside className="w-60 bg-sidebar-bg min-h-screen flex flex-col shrink-0">
      <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
        <img src={imetLogo} alt="IMET" className="h-10 w-10 rounded" />
        <div>
          <h1 className="text-white text-lg font-bold tracking-tight">IMET Jazdy</h1>
          <p className="text-gray-500 text-xs">Cestovné náhrady</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <NavLink to="/vozidla" className={({ isActive }) => linkClass(isActive)}>
          <Car size={18} />
          Vozidlá
        </NavLink>

        <NavLink to="/paliva" className={({ isActive }) => linkClass(isActive)}>
          <Fuel size={18} />
          Ceny palív
        </NavLink>

        <NavLink to="/sadzby" className={({ isActive }) => linkClass(isActive)}>
          <Scale size={18} />
          Sadzby náhrad
        </NavLink>

        <div>
          <button
            onClick={() => setVyuctovanieOpen(!vyuctovanieOpen)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors w-full ${
              location.pathname.startsWith('/vyuctovanie')
                ? 'text-white'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileText size={18} />
            Vyúčtovanie
            <span className="ml-auto">
              {vyuctovanieOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </button>

          {vyuctovanieOpen && (
            <div className="ml-4 mt-1 space-y-0.5">
              {vyuctovanieItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `block px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <NavLink to="/historia" className={({ isActive }) => linkClass(isActive)}>
          <FolderOpen size={18} />
          História
        </NavLink>
      </nav>

      <div className="px-3 pb-4 border-t border-white/10 pt-3">
        <NavLink to="/nastavenia" className={({ isActive }) => linkClass(isActive)}>
          <Settings size={18} />
          Nastavenia
        </NavLink>
      </div>
    </aside>
  )
}
