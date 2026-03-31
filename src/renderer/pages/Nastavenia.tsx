import { useState, useEffect } from 'react'
import { Settings, Save } from 'lucide-react'
import type { Settings as SettingsType } from '../types'

const inputClass = "w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-right"

export default function Nastavenia() {
  const [settings, setSettings] = useState<SettingsType | null>(null)
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
      <div className="flex items-center gap-3 mb-6">
        <Settings className="text-primary" size={24} />
        <h2 className="text-2xl font-bold text-gray-900">Nastavenia</h2>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Firma */}
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Firma</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Názov firmy</label>
            <input
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Zadajte názov firmy"
            />
            <p className="text-xs text-gray-400 mt-1">Zobrazí sa v hlavičke tlačovej zostavy a PDF exportu.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Posledné číslo dokladu</label>
            <p className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 font-mono inline-block">{settings.lastDocNumber}</p>
          </div>
        </div>

        {/* Sadzby */}
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Sadzby náhrad</h3>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Náhrada za 1km - súkromné auto</label>
            <div className="flex items-center gap-2">
              <input
                type="number" step="0.001"
                value={settings.sadzbaSukromneAuto}
                onChange={(e) => setSettings({ ...settings, sadzbaSukromneAuto: parseFloat(e.target.value) || 0 })}
                className={inputClass}
              />
              <span className="text-sm text-gray-500">€ / km</span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Stravné - doma</label>
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

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Stravné - zahraničie</label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vreckové - zahraničie</label>
            <div className="flex items-center gap-2">
              <input
                type="number" step="1"
                value={settings.vreckovePercento}
                onChange={(e) => setSettings({ ...settings, vreckovePercento: parseFloat(e.target.value) || 0 })}
                className={inputClass}
              />
              <span className="text-sm text-gray-500">% zo stravného</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Save size={16} />
          {saved ? 'Uložené!' : 'Uložiť nastavenia'}
        </button>
      </div>
    </div>
  )
}
