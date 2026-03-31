import { useState, useEffect } from 'react'
import { Fuel } from 'lucide-react'
import type { Paliva as PalivaType } from '../types'

const palivoConfig = [
  { key: 'diesel' as const, label: 'Diesel', icon: '🟡' },
  { key: 'premium_diesel' as const, label: 'Prémiový Diesel', icon: '🟠' },
  { key: 'benzin' as const, label: 'Benzín', icon: '🟢' },
  { key: 'lpg' as const, label: 'LPG', icon: '🔵' },
  { key: 'elektro' as const, label: 'Elektro', icon: '⚡' },
]

export default function Paliva() {
  const [paliva, setPaliva] = useState<PalivaType | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    window.electronAPI.paliva.get().then(setPaliva)
  }, [])

  const handleSave = async (key: keyof PalivaType) => {
    if (!paliva) return
    const val = parseFloat(editValue) || 0
    const updated = {
      ...paliva,
      [key]: val,
      aktualizovane: new Date().toISOString(),
    }
    await window.electronAPI.paliva.save(updated)
    setPaliva(updated)
    setEditing(null)
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Nikdy'
    const d = new Date(iso)
    return d.toLocaleDateString('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!paliva) return null

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Fuel className="text-primary" size={24} />
        <h2 className="text-2xl font-bold text-gray-900">Ceny palív</h2>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Naposledy aktualizované: {formatDate(paliva.aktualizovane)}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {palivoConfig.map(({ key, label, icon }) => (
          <div
            key={key}
            className="bg-white rounded-card shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{icon}</span>
              <h3 className="font-semibold text-gray-900">{label}</h3>
            </div>

            {editing === key ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="number"
                  step="0.001"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave(key)
                    if (e.key === 'Escape') setEditing(null)
                  }}
                  className="w-28 px-3 py-2 border border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="text-sm text-gray-500">€/l</span>
                <button
                  onClick={() => handleSave(key)}
                  className="px-3 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark transition-colors"
                >
                  Uložiť
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditing(key)
                  setEditValue(String(paliva[key]))
                }}
                className="text-3xl font-bold text-gray-900 hover:text-primary transition-colors cursor-pointer"
              >
                {(paliva[key] as number).toFixed(3)} €
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
