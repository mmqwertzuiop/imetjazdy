import { useState, useEffect, useRef } from 'react'
import { Calculator, Save, Printer, FileDown } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useReactToPrint } from 'react-to-print'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Vozidlo, Paliva, VyuctovanieZaznam, Settings } from '../types'

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

interface Props {
  typ: 'firemne_doma' | 'firemne_zahranicie'
}

function generateDocNumber(lastDocNumber: number): string {
  const year = new Date().getFullYear()
  const next = lastDocNumber + 1
  return `${year}-${String(next).padStart(3, '0')}`
}

export default function VyuctovanieFiremne({ typ }: Props) {
  const [vozidla, setVozidla] = useState<Vozidlo[]>([])
  const [paliva, setPaliva] = useState<Paliva | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [docNumber, setDocNumber] = useState('')
  const [form, setForm] = useState({
    meno: '',
    mesiac: '',
    odchod_z: '',
    prichod_do: '',
    cez: '',
    km: 0,
    vozidlo_id: '',
    spotreba_pouzita: 0,
    cena_za_liter: 0,
  })
  const [result, setResult] = useState<{ spotreba_litrov: number; naklady_celkom: number } | null>(null)
  const [selectedVozidlo, setSelectedVozidlo] = useState<Vozidlo | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.electronAPI.vozidla.getAll().then(setVozidla)
    window.electronAPI.paliva.get().then(setPaliva)
    window.electronAPI.settings.get().then((s) => {
      setSettings(s)
      setDocNumber(generateDocNumber(s.lastDocNumber))
    })
  }, [])

  useEffect(() => {
    setForm({ meno: '', mesiac: '', odchod_z: '', prichod_do: '', cez: '', km: 0, vozidlo_id: '', spotreba_pouzita: 0, cena_za_liter: 0 })
    setResult(null)
    setSelectedVozidlo(null)
  }, [typ])

  const handleVozidloChange = (id: string) => {
    const v = vozidla.find((x) => x.id === id)
    if (v && paliva) {
      setSelectedVozidlo(v)
      setForm((f) => ({
        ...f,
        vozidlo_id: id,
        spotreba_pouzita: v.spotreba_tp,
        cena_za_liter: paliva[v.palivo as keyof Omit<Paliva, 'aktualizovane'>] as number,
      }))
    } else {
      setSelectedVozidlo(null)
      setForm((f) => ({ ...f, vozidlo_id: id }))
    }
  }

  const handleCalculate = () => {
    const spotreba_litrov = (form.km / 100) * form.spotreba_pouzita
    const naklady_celkom = spotreba_litrov * form.cena_za_liter
    setResult({ spotreba_litrov, naklady_celkom })
  }

  const handleSaveRecord = async () => {
    if (!result || !settings) return
    const newNumber = settings.lastDocNumber + 1
    const cislo = generateDocNumber(settings.lastDocNumber)
    const allRecords = await window.electronAPI.vyuctovanie.getAll()
    const record: VyuctovanieZaznam = {
      id: uuidv4(),
      cislo_dokladu: cislo,
      typ,
      meno: form.meno,
      mesiac: form.mesiac,
      odchod_z: form.odchod_z,
      prichod_do: form.prichod_do,
      cez: form.cez,
      km: form.km,
      vozidlo_id: form.vozidlo_id,
      spotreba_pouzita: form.spotreba_pouzita,
      palivo_typ: selectedVozidlo?.palivo || '',
      cena_za_liter: form.cena_za_liter,
      naklady_celkom: result.naklady_celkom,
      vytvorene: new Date().toISOString(),
    }
    await window.electronAPI.vyuctovanie.save([...allRecords, record])
    const updatedSettings = { ...settings, lastDocNumber: newNumber }
    await window.electronAPI.settings.save(updatedSettings)
    setSettings(updatedSettings)
    setDocNumber(generateDocNumber(newNumber))
    alert('Záznam uložený!')
  }

  const handlePrint = useReactToPrint({ contentRef: printRef })

  const handlePDF = () => {
    if (!result || !selectedVozidlo) return
    const doc = new jsPDF()
    let yPos = 15
    if (settings?.companyName) {
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(settings.companyName, 105, yPos, { align: 'center' })
      yPos += 10
    }
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('VYÚČTOVANIE CESTOVNÝCH NÁHRAD', 105, yPos, { align: 'center' })
    yPos += 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Doklad č.: ${docNumber}`, 105, yPos, { align: 'center' })
    yPos += 5
    doc.text(`${typLabels[typ]} · ${form.mesiac}`, 105, yPos, { align: 'center' })
    yPos += 10

    autoTable(doc, {
      startY: yPos,
      head: [['Meno', 'Trasa', 'KM', 'Vozidlo', 'ŠPZ', 'PHM', 'Spotreba (l)', 'Cena/L (€)', 'Náklady (€)']],
      body: [[
        form.meno,
        `${form.odchod_z}${form.cez ? ' → ' + form.cez : ''} → ${form.prichod_do}`,
        String(form.km),
        selectedVozidlo ? `${selectedVozidlo.znacka} ${selectedVozidlo.variant}` : '',
        selectedVozidlo?.spz || '',
        palivoLabels[selectedVozidlo?.palivo || ''] || '',
        result.spotreba_litrov.toFixed(2),
        form.cena_za_liter.toFixed(3),
        result.naklady_celkom.toFixed(2),
      ]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [40, 52, 224] },
    })

    const finalY = ((doc as unknown as Record<string, unknown>).lastAutoTable as Record<string, number>)?.finalY || 80
    doc.setFontSize(9)
    doc.text(`Dátum vytvorenia: ${new Date().toLocaleDateString('sk-SK')}`, 14, finalY + 20)
    doc.text('Podpis: ___________________________', 14, finalY + 30)

    doc.save(`vyuctovanie_${docNumber}_${typ}.pdf`)
  }

  const trasa = `${form.odchod_z}${form.cez ? ' → ' + form.cez : ''} → ${form.prichod_do}`

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{typLabels[typ]}</h2>

      <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Číslo dokladu</label>
            <input
              value={docNumber}
              readOnly
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-mono cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meno</label>
            <input
              value={form.meno}
              onChange={(e) => setForm({ ...form, meno: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mesiac</label>
            <input
              type="month"
              value={form.mesiac}
              onChange={(e) => setForm({ ...form, mesiac: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Odchod Z</label>
            <input
              value={form.odchod_z}
              onChange={(e) => setForm({ ...form, odchod_z: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Príchod DO</label>
            <input
              value={form.prichod_do}
              onChange={(e) => setForm({ ...form, prichod_do: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cez (nepovinné)</label>
            <input
              value={form.cez}
              onChange={(e) => setForm({ ...form, cez: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">KM</label>
            <input
              type="number"
              value={form.km || ''}
              onChange={(e) => setForm({ ...form, km: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vozidlo</label>
            <select
              value={form.vozidlo_id}
              onChange={(e) => handleVozidloChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Vyberte vozidlo</option>
              {vozidla.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.znacka} {v.variant} ({v.spz})
                </option>
              ))}
            </select>
          </div>

          {selectedVozidlo && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Spotreba TP (l/100km)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.spotreba_pouzita || ''}
                  onChange={(e) => setForm({ ...form, spotreba_pouzita: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ŠPZ / PHM typ</label>
                <p className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700">
                  {selectedVozidlo.spz} · {palivoLabels[selectedVozidlo.palivo]}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cena za 1L (€)</label>
                <input
                  type="number"
                  step="0.001"
                  value={form.cena_za_liter || ''}
                  onChange={(e) => setForm({ ...form, cena_za_liter: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 mb-6 no-print">
        <button
          onClick={handleCalculate}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Calculator size={16} />
          Vypočítať
        </button>
        {result && (
          <>
            <button
              onClick={handleSaveRecord}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Save size={16} />
              Uložiť záznam
            </button>
            <button
              onClick={() => handlePrint()}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Printer size={16} />
              Tlačiť
            </button>
            <button
              onClick={handlePDF}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <FileDown size={16} />
              Uložiť PDF
            </button>
          </>
        )}
      </div>

      {/* Result */}
      {result && (
        <div ref={printRef}>
          <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
            {settings?.companyName && (
              <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">{settings.companyName}</h2>
            )}
            <h3 className="text-lg font-bold text-gray-900 mb-1 text-center">VYÚČTOVANIE CESTOVNÝCH NÁHRAD</h3>
            <p className="text-sm text-gray-500 text-center">
              Doklad č.: {docNumber}
            </p>
            <p className="text-sm text-gray-500 text-center mb-4">
              {typLabels[typ]} · {form.mesiac}
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
                  <td className="px-3 py-2">{form.meno}</td>
                  <td className="px-3 py-2">{trasa}</td>
                  <td className="px-3 py-2 text-right">{form.km}</td>
                  <td className="px-3 py-2">{selectedVozidlo ? `${selectedVozidlo.znacka} ${selectedVozidlo.variant}` : ''}</td>
                  <td className="px-3 py-2">{selectedVozidlo?.spz}</td>
                  <td className="px-3 py-2">{palivoLabels[selectedVozidlo?.palivo || '']}</td>
                  <td className="px-3 py-2 text-right font-semibold">{result.spotreba_litrov.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{form.cena_za_liter.toFixed(3)}</td>
                  <td className="px-3 py-2 text-right font-bold text-primary">{result.naklady_celkom.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-between items-end mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
              <p>Dátum vytvorenia: {new Date().toLocaleDateString('sk-SK')}</p>
              <p>Podpis: ___________________________</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
