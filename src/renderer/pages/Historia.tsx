import { useState, useEffect, useRef } from 'react'
import { Trash2, Eye, Printer, X } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import type { Vozidlo, VyuctovanieZaznam, Settings } from '../types'

const typLabels: Record<string, string> = {
  firemne_doma: 'Firemné auto: Doma',
  firemne_zahranicie: 'Firemné auto: Zahraničie',
  sukromne_doma: 'Súkromné auto: Doma',
  sukromne_zahranicie: 'Súkromné auto: Zahraničie',
}

const palivoLabels: Record<string, string> = {
  diesel: 'Diesel',
  premium_diesel: 'Prémiový Diesel',
  benzin: 'Benzín',
  lpg: 'LPG',
  elektro: 'Elektro',
}

export default function Historia() {
  const [zaznamy, setZaznamy] = useState<VyuctovanieZaznam[]>([])
  const [vozidla, setVozidla] = useState<Vozidlo[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [filterTyp, setFilterTyp] = useState('')
  const [filterMesiac, setFilterMesiac] = useState('')
  const [detail, setDetail] = useState<VyuctovanieZaznam | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.electronAPI.vyuctovanie.getAll().then(setZaznamy)
    window.electronAPI.vozidla.getAll().then(setVozidla)
    window.electronAPI.settings.get().then(setSettings)
  }, [])

  const handleDelete = async (id: string) => {
    const updated = zaznamy.filter((z) => z.id !== id)
    await window.electronAPI.vyuctovanie.save(updated)
    setZaznamy(updated)
  }

  const handlePrint = useReactToPrint({ contentRef: printRef })

  const getVozidlo = (id: string) => vozidla.find((v) => v.id === id)

  const filtered = zaznamy.filter((z) => {
    if (filterTyp && z.typ !== filterTyp) return false
    if (filterMesiac && z.mesiac !== filterMesiac) return false
    return true
  })

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">História záznamov</h2>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={filterTyp}
          onChange={(e) => setFilterTyp(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="">Všetky typy</option>
          {Object.entries(typLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          type="month"
          value={filterMesiac}
          onChange={(e) => setFilterMesiac(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        {(filterTyp || filterMesiac) && (
          <button
            onClick={() => { setFilterTyp(''); setFilterMesiac('') }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Zrušiť filter
          </button>
        )}
      </div>

      <div className="bg-white rounded-card shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full table-striped">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Č. dokladu</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Typ</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Meno</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mesiac</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trasa</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">KM</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Náklady (€)</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vytvorené</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Akcie</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-400">
                  Žiadne záznamy.
                </td>
              </tr>
            )}
            {filtered.map((z) => (
              <tr key={z.id} className="border-b border-gray-100">
                <td className="px-4 py-3 text-sm font-mono text-gray-700">{z.cislo_dokladu || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{typLabels[z.typ]}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{z.meno}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{z.mesiac}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {z.odchod_z}{z.cez ? ` → ${z.cez}` : ''} → {z.prichod_do}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">{z.km}</td>
                <td className="px-4 py-3 text-sm font-semibold text-primary text-right">{z.naklady_celkom.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(z.vytvorene)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setDetail(z)} className="text-gray-400 hover:text-primary p-1 transition-colors">
                    <Eye size={16} />
                  </button>
                  <button onClick={() => { setDetail(z); setTimeout(() => handlePrint(), 100) }} className="text-gray-400 hover:text-primary p-1 ml-1 transition-colors">
                    <Printer size={16} />
                  </button>
                  <button onClick={() => handleDelete(z.id)} className="text-gray-400 hover:text-red-500 p-1 ml-1 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-card shadow-xl w-full max-w-3xl mx-4 p-6 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4 no-print">
              <h3 className="text-lg font-bold text-gray-900">Detail záznamu</h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div ref={printRef}>
              <div className="p-4">
                {settings?.companyName && (
                  <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">{settings.companyName}</h2>
                )}
                <h3 className="text-lg font-bold text-gray-900 mb-1 text-center">VYÚČTOVANIE CESTOVNÝCH NÁHRAD</h3>
                <p className="text-sm text-gray-500 text-center">
                  Doklad č.: {detail.cislo_dokladu || '-'}
                </p>
                <p className="text-sm text-gray-500 text-center mb-4">
                  {typLabels[detail.typ]} · {detail.mesiac}
                </p>

                <table className="w-full text-sm border-collapse mb-4">
                  <thead>
                    <tr className="bg-primary text-white">
                      <th className="px-3 py-2 text-left">Meno</th>
                      <th className="px-3 py-2 text-left">Trasa</th>
                      <th className="px-3 py-2 text-right">KM</th>
                      <th className="px-3 py-2 text-left">Vozidlo</th>
                      <th className="px-3 py-2 text-left">ŠPZ</th>
                      <th className="px-3 py-2 text-left">PHM</th>
                      <th className="px-3 py-2 text-right">Spotreba (l)</th>
                      <th className="px-3 py-2 text-right">Cena/L (€)</th>
                      <th className="px-3 py-2 text-right">Náklady (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="px-3 py-2">{detail.meno}</td>
                      <td className="px-3 py-2">
                        {detail.odchod_z}{detail.cez ? ` → ${detail.cez}` : ''} → {detail.prichod_do}
                      </td>
                      <td className="px-3 py-2 text-right">{detail.km}</td>
                      <td className="px-3 py-2">
                        {(() => {
                          const v = getVozidlo(detail.vozidlo_id)
                          return v ? `${v.znacka} ${v.variant}` : '-'
                        })()}
                      </td>
                      <td className="px-3 py-2">
                        {getVozidlo(detail.vozidlo_id)?.spz || '-'}
                      </td>
                      <td className="px-3 py-2">{palivoLabels[detail.palivo_typ] || detail.palivo_typ}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {((detail.km / 100) * detail.spotreba_pouzita).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right">{detail.cena_za_liter.toFixed(3)}</td>
                      <td className="px-3 py-2 text-right font-bold text-primary">{detail.naklady_celkom.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="flex justify-between items-end mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
                  <p>Dátum vytvorenia: {formatDate(detail.vytvorene)}</p>
                  <p>Podpis: ___________________________</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4 no-print">
              <button
                onClick={() => handlePrint()}
                className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Printer size={16} />
                Tlačiť
              </button>
              <button
                onClick={() => setDetail(null)}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Zavrieť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
