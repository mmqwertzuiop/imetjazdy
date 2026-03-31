import { useState, useEffect } from 'react'
import { Settings, Save } from 'lucide-react'
import type { Settings as SettingsType } from '../types'

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

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="text-primary" size={24} />
        <h2 className="text-2xl font-bold text-gray-900">Nastavenia</h2>
      </div>

      <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6 max-w-lg">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Názov firmy</label>
          <input
            value={settings.companyName}
            onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Zadajte názov firmy"
          />
          <p className="text-xs text-gray-400 mt-1">Zobrazí sa v hlavičke tlačovej zostavy a PDF exportu.</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Posledné číslo dokladu</label>
          <p className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 font-mono">
            {settings.lastDocNumber}
          </p>
          <p className="text-xs text-gray-400 mt-1">Automaticky sa zvyšuje pri uložení nového záznamu.</p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Save size={16} />
          {saved ? 'Uložené!' : 'Uložiť'}
        </button>
      </div>
    </div>
  )
}
