import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import type { Vozidlo } from '../types'

const emptyVozidlo: Omit<Vozidlo, 'id'> = {
  znacka: '',
  variant: '',
  spz: '',
  druh: 'osobne',
  palivo: 'diesel',
  spotreba_tp: 0,
  objem_motora: 0,
  aktivne: true,
}

const palivoLabels: Record<string, string> = {
  diesel: 'Diesel',
  premium_diesel: 'Prémiový Diesel',
  benzin: 'Benzín',
  lpg: 'LPG',
  elektro: 'Elektro',
}

const druhLabels: Record<string, string> = {
  osobne: 'Osobné',
  nakladne: 'Nákladné',
}

export default function Vozidla() {
  const [vozidla, setVozidla] = useState<Vozidlo[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyVozidlo)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    window.electronAPI.vozidla.getAll().then(setVozidla)
  }, [])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.znacka.trim()) e.znacka = 'Povinné pole'
    if (!form.spz.trim()) e.spz = 'Povinné pole'
    if (form.spotreba_tp <= 0) e.spotreba_tp = 'Musí byť > 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return

    let updated: Vozidlo[]
    if (editId) {
      updated = vozidla.map((v) =>
        v.id === editId ? { ...form, id: editId } : v
      )
    } else {
      updated = [...vozidla, { ...form, id: uuidv4() }]
    }

    await window.electronAPI.vozidla.save(updated)
    setVozidla(updated)
    closeModal()
  }

  const handleDelete = async (id: string) => {
    const updated = vozidla.filter((v) => v.id !== id)
    await window.electronAPI.vozidla.save(updated)
    setVozidla(updated)
  }

  const openEdit = (v: Vozidlo) => {
    setEditId(v.id)
    setForm({ znacka: v.znacka, variant: v.variant, spz: v.spz, druh: v.druh, palivo: v.palivo, spotreba_tp: v.spotreba_tp, objem_motora: v.objem_motora, aktivne: v.aktivne })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditId(null)
    setForm(emptyVozidlo)
    setErrors({})
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Vozidlá</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Pridať vozidlo
        </button>
      </div>

      <div className="bg-white rounded-card shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full table-striped">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Značka</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Variant</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ŠPZ</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Druh</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Palivo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Spotreba</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Objem motora</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Akcie</th>
            </tr>
          </thead>
          <tbody>
            {vozidla.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400">
                  Žiadne vozidlá. Pridajte prvé vozidlo.
                </td>
              </tr>
            )}
            {vozidla.map((v) => (
              <tr key={v.id} className="border-b border-gray-100">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{v.znacka}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{v.variant}</td>
                <td className="px-4 py-3 text-sm font-mono text-gray-900">{v.spz}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{druhLabels[v.druh]}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{palivoLabels[v.palivo]}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{v.spotreba_tp} l/100km</td>
                <td className="px-4 py-3 text-sm text-gray-600">{v.objem_motora} cm³</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(v)} className="text-gray-400 hover:text-primary p-1 transition-colors">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(v.id)} className="text-gray-400 hover:text-red-500 p-1 ml-1 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-card shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">
                {editId ? 'Upraviť vozidlo' : 'Pridať vozidlo'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Značka *</label>
                  <input
                    value={form.znacka}
                    onChange={(e) => setForm({ ...form, znacka: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.znacka ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="Škoda"
                  />
                  {errors.znacka && <p className="text-red-500 text-xs mt-1">{errors.znacka}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Variant</label>
                  <input
                    value={form.variant}
                    onChange={(e) => setForm({ ...form, variant: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Octavia Combi"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ŠPZ *</label>
                  <input
                    value={form.spz}
                    onChange={(e) => setForm({ ...form, spz: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.spz ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="BA 123 AB"
                  />
                  {errors.spz && <p className="text-red-500 text-xs mt-1">{errors.spz}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Druh</label>
                  <select
                    value={form.druh}
                    onChange={(e) => setForm({ ...form, druh: e.target.value as Vozidlo['druh'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="osobne">Osobné</option>
                    <option value="nakladne">Nákladné</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Palivo</label>
                  <select
                    value={form.palivo}
                    onChange={(e) => setForm({ ...form, palivo: e.target.value as Vozidlo['palivo'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="diesel">Diesel</option>
                    <option value="premium_diesel">Prémiový Diesel</option>
                    <option value="benzin">Benzín</option>
                    <option value="lpg">LPG</option>
                    <option value="elektro">Elektro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Spotreba TP (l/100km) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.spotreba_tp || ''}
                    onChange={(e) => setForm({ ...form, spotreba_tp: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.spotreba_tp ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="6.5"
                  />
                  {errors.spotreba_tp && <p className="text-red-500 text-xs mt-1">{errors.spotreba_tp}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objem motora (cm³)</label>
                <input
                  type="number"
                  value={form.objem_motora || ''}
                  onChange={(e) => setForm({ ...form, objem_motora: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="1968"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Zrušiť
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors"
              >
                {editId ? 'Uložiť zmeny' : 'Pridať'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
