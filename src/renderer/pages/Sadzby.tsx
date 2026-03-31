import { useState, useEffect } from 'react'
import { Scale, Save } from 'lucide-react'
import type { Settings } from '../types'

const inputClass = "w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-right"

export default function Sadzby() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.electronAPI.settings.get().then(setSettings)
  }, [])

  const handleSave = async () => {
    if (!settings) return
    await window.electronAPI.settings.save(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!settings) return null

  const sd = settings.stravneDoma
  const sz = settings.stravneZahranicie

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <Scale className="text-primary" size={24} />
        <h2 className="text-2xl font-bold text-gray-900">Sadzby náhrad</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">Zákonné sadzby podľa Zákonníka práce SR</p>

      <div className="space-y-6 max-w-2xl">
        {/* Náhrada za 1km */}
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Náhrada za 1km</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-40">Súkromné auto:</span>
            <input
              type="number" step="0.001"
              value={settings.sadzbaSukromneAuto}
              onChange={(e) => setSettings({ ...settings, sadzbaSukromneAuto: parseFloat(e.target.value) || 0 })}
              className={inputClass}
            />
            <span className="text-sm text-gray-500">€ / km</span>
          </div>
        </div>

        {/* Stravné doma */}
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Stravné - doma</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-40">Menej ako 5h:</span>
              <input type="number" step="0.01" value={sd.do5h} onChange={(e) => setSettings({ ...settings, stravneDoma: { ...sd, do5h: parseFloat(e.target.value) || 0 } })} className={inputClass} />
              <span className="text-sm text-gray-500">€</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-40">5 - 12h:</span>
              <input type="number" step="0.01" value={sd.od5do12h} onChange={(e) => setSettings({ ...settings, stravneDoma: { ...sd, od5do12h: parseFloat(e.target.value) || 0 } })} className={inputClass} />
              <span className="text-sm text-gray-500">€</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-40">12 - 18h:</span>
              <input type="number" step="0.01" value={sd.od12do18h} onChange={(e) => setSettings({ ...settings, stravneDoma: { ...sd, od12do18h: parseFloat(e.target.value) || 0 } })} className={inputClass} />
              <span className="text-sm text-gray-500">€</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-40">Nad 18h:</span>
              <input type="number" step="0.01" value={sd.nad18h} onChange={(e) => setSettings({ ...settings, stravneDoma: { ...sd, nad18h: parseFloat(e.target.value) || 0 } })} className={inputClass} />
              <span className="text-sm text-gray-500">€</span>
            </div>
          </div>
        </div>

        {/* Stravné zahraničie */}
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Stravné - zahraničie</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-40">Menej ako 6h:</span>
              <input type="number" step="0.01" value={sz.do6h} onChange={(e) => setSettings({ ...settings, stravneZahranicie: { ...sz, do6h: parseFloat(e.target.value) || 0 } })} className={inputClass} />
              <span className="text-sm text-gray-500">€</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-40">6 - 12h:</span>
              <input type="number" step="0.01" value={sz.od6do12h} onChange={(e) => setSettings({ ...settings, stravneZahranicie: { ...sz, od6do12h: parseFloat(e.target.value) || 0 } })} className={inputClass} />
              <span className="text-sm text-gray-500">€</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-40">Nad 12h:</span>
              <input type="number" step="0.01" value={sz.nad12h} onChange={(e) => setSettings({ ...settings, stravneZahranicie: { ...sz, nad12h: parseFloat(e.target.value) || 0 } })} className={inputClass} />
              <span className="text-sm text-gray-500">€</span>
            </div>
          </div>
        </div>

        {/* Vreckové */}
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Vreckové - zahraničie</h3>
          <div className="flex items-center gap-3">
            <input
              type="number" step="1"
              value={settings.vreckovePercento}
              onChange={(e) => setSettings({ ...settings, vreckovePercento: parseFloat(e.target.value) || 0 })}
              className={inputClass}
            />
            <span className="text-sm text-gray-500">% zo stravného</span>
          </div>
        </div>

        {/* DPH sadzby */}
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">DPH sadzby</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-40">DPH - pohonné hmoty:</span>
              <input type="number" step="1" value={settings.dphPHM} onChange={(e) => setSettings({ ...settings, dphPHM: parseFloat(e.target.value) || 0 })} className={inputClass} />
              <span className="text-sm text-gray-500">%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-40">DPH - ubytovanie:</span>
              <input type="number" step="1" value={settings.dphUbytovanie} onChange={(e) => setSettings({ ...settings, dphUbytovanie: parseFloat(e.target.value) || 0 })} className={inputClass} />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Save size={16} />
          {saved ? 'Uložené!' : 'Uložiť sadzby'}
        </button>
      </div>
    </div>
  )
}
