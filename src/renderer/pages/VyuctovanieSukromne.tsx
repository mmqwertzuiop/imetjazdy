import { useState, useEffect, useRef } from 'react'
import { Calculator, Save, Printer, FileDown } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useReactToPrint } from 'react-to-print'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Vozidlo, VyuctovanieZaznam, Settings } from '../types'

const typLabels: Record<string, string> = {
  sukromne_doma: 'Súkromné auto: Doma',
  sukromne_zahranicie: 'Súkromné auto: Zahraničie',
}

interface Props {
  typ: 'sukromne_doma' | 'sukromne_zahranicie'
}

function generateDocNumber(lastDocNumber: number): string {
  const year = new Date().getFullYear()
  const next = lastDocNumber + 1
  return `${year}-${String(next).padStart(3, '0')}`
}

function calcDurationMinutes(casOdchodu: string, casPrichodu: string): number {
  if (!casOdchodu || !casPrichodu) return 0
  const [oh, om] = casOdchodu.split(':').map(Number)
  const [ph, pm] = casPrichodu.split(':').map(Number)
  let diff = (ph * 60 + pm) - (oh * 60 + om)
  if (diff < 0) diff += 24 * 60
  return diff
}

function calcStravneDoma(minutes: number, settings: Settings): number {
  const hours = minutes / 60
  if (hours >= 18) return settings.stravneDoma.nad18h
  if (hours > 12) return settings.stravneDoma.od12do18h
  if (hours >= 5) return settings.stravneDoma.od5do12h
  return settings.stravneDoma.do5h
}

function calcStravneZahranicie(minutes: number, settings: Settings): number {
  const hours = minutes / 60
  if (hours > 12) return settings.stravneZahranicie.nad12h
  if (hours >= 6) return settings.stravneZahranicie.od6do12h
  return settings.stravneZahranicie.do6h
}

interface Result {
  naklady_km: number
  stravne: number
  vreckove: number
  naklady_celkom: number
  trvanie_minut: number
}

export default function VyuctovanieSukromne({ typ }: Props) {
  const isZahranicie = typ === 'sukromne_zahranicie'
  const [vozidla, setVozidla] = useState<Vozidlo[]>([])
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
    sadzba_za_km: 0.25,
    cas_odchodu: '',
    cas_prichodu: '',
  })
  const [result, setResult] = useState<Result | null>(null)
  const [selectedVozidlo, setSelectedVozidlo] = useState<Vozidlo | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.electronAPI.vozidla.getAll().then(setVozidla)
    window.electronAPI.settings.get().then((s) => {
      setSettings(s)
      setDocNumber(generateDocNumber(s.lastDocNumber))
      setForm((f) => ({ ...f, sadzba_za_km: s.sadzbaSukromneAuto }))
    })
  }, [])

  useEffect(() => {
    setForm((f) => ({ meno: '', mesiac: '', odchod_z: '', prichod_do: '', cez: '', km: 0, vozidlo_id: '', sadzba_za_km: settings?.sadzbaSukromneAuto || 0.25, cas_odchodu: '', cas_prichodu: '' }))
    setResult(null)
    setSelectedVozidlo(null)
  }, [typ])

  const handleVozidloChange = (id: string) => {
    const v = vozidla.find((x) => x.id === id)
    setSelectedVozidlo(v || null)
    setForm((f) => ({ ...f, vozidlo_id: id }))
  }

  const handleCalculate = () => {
    if (!settings) return
    const naklady_km = form.km * form.sadzba_za_km
    const trvanie_minut = calcDurationMinutes(form.cas_odchodu, form.cas_prichodu)
    const stravne = isZahranicie
      ? calcStravneZahranicie(trvanie_minut, settings)
      : calcStravneDoma(trvanie_minut, settings)
    const vreckove = isZahranicie ? stravne * (settings.vreckovePercento / 100) : 0
    const naklady_celkom = naklady_km + stravne + vreckove
    setResult({ naklady_km, stravne, vreckove, naklady_celkom, trvanie_minut })
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
      spotreba_pouzita: 0,
      palivo_typ: '',
      cena_za_liter: 0,
      sadzba_za_km: form.sadzba_za_km,
      cas_odchodu: form.cas_odchodu,
      cas_prichodu: form.cas_prichodu,
      stravne: result.stravne,
      vreckove: result.vreckove,
      naklady_phm: result.naklady_km,
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
    if (!result) return
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
      head: [['Meno', 'Trasa', 'KM', 'Vozidlo', 'ŠPZ', 'Sadzba/km (€)', 'Náhrada za km (€)']],
      body: [[
        form.meno,
        `${form.odchod_z}${form.cez ? ' → ' + form.cez : ''} → ${form.prichod_do}`,
        String(form.km),
        selectedVozidlo ? `${selectedVozidlo.znacka} ${selectedVozidlo.variant}` : '-',
        selectedVozidlo?.spz || '-',
        form.sadzba_za_km.toFixed(3),
        result.naklady_km.toFixed(2),
      ]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [40, 52, 224] },
    })

    let fY = ((doc as unknown as Record<string, unknown>).lastAutoTable as Record<string, number>)?.finalY || 80
    fY += 8
    doc.setFontSize(10)
    doc.text(`Náhrada za km: ${result.naklady_km.toFixed(2)} €`, 14, fY); fY += 6
    doc.text(`Stravné: ${result.stravne.toFixed(2)} €`, 14, fY); fY += 6
    if (isZahranicie) { doc.text(`Vreckové (${settings?.vreckovePercento}%): ${result.vreckove.toFixed(2)} €`, 14, fY); fY += 6 }
    doc.setFont('helvetica', 'bold')
    doc.text(`CELKOM: ${result.naklady_celkom.toFixed(2)} €`, 14, fY); fY += 12
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Dátum vytvorenia: ${new Date().toLocaleDateString('sk-SK')}`, 14, fY)
    doc.text('Podpis: ___________________________', 14, fY + 10)

    doc.save(`vyuctovanie_${docNumber}_${typ}.pdf`)
  }

  const trasa = `${form.odchod_z}${form.cez ? ' → ' + form.cez : ''} → ${form.prichod_do}`
  const trvanieH = result ? Math.floor(result.trvanie_minut / 60) : 0
  const trvanieM = result ? result.trvanie_minut % 60 : 0

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{typLabels[typ]}</h2>

      <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Číslo dokladu</label>
            <input value={docNumber} readOnly className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-mono cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meno</label>
            <input value={form.meno} onChange={(e) => setForm({ ...form, meno: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mesiac</label>
            <input type="month" value={form.mesiac} onChange={(e) => setForm({ ...form, mesiac: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Odchod Z</label>
            <input value={form.odchod_z} onChange={(e) => setForm({ ...form, odchod_z: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Príchod DO</label>
            <input value={form.prichod_do} onChange={(e) => setForm({ ...form, prichod_do: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cez (nepovinné)</label>
            <input value={form.cez} onChange={(e) => setForm({ ...form, cez: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">KM</label>
            <input type="number" value={form.km || ''} onChange={(e) => setForm({ ...form, km: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Čas odchodu</label>
            <input type="time" value={form.cas_odchodu} onChange={(e) => setForm({ ...form, cas_odchodu: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Čas príchodu</label>
            <input type="time" value={form.cas_prichodu} onChange={(e) => setForm({ ...form, cas_prichodu: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vozidlo</label>
            <select value={form.vozidlo_id} onChange={(e) => handleVozidloChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
              <option value="">Vyberte vozidlo</option>
              {vozidla.map((v) => (
                <option key={v.id} value={v.id}>{v.znacka} {v.variant} ({v.spz})</option>
              ))}
            </select>
          </div>
          {selectedVozidlo && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ŠPZ</label>
              <p className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700">{selectedVozidlo.spz}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sadzba za 1km (€)</label>
            <input type="number" step="0.001" value={form.sadzba_za_km || ''} onChange={(e) => setForm({ ...form, sadzba_za_km: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
        </div>
      </div>

      <div className="flex gap-3 mb-6 no-print">
        <button onClick={handleCalculate} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Calculator size={16} /> Vypočítať
        </button>
        {result && (
          <>
            <button onClick={handleSaveRecord} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
              <Save size={16} /> Uložiť záznam
            </button>
            <button onClick={() => handlePrint()} className="flex items-center gap-2 border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              <Printer size={16} /> Tlačiť
            </button>
            <button onClick={handlePDF} className="flex items-center gap-2 border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              <FileDown size={16} /> Uložiť PDF
            </button>
          </>
        )}
      </div>

      {result && (
        <div ref={printRef}>
          <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
            {settings?.companyName && <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">{settings.companyName}</h2>}
            <h3 className="text-lg font-bold text-gray-900 mb-1 text-center">VYÚČTOVANIE CESTOVNÝCH NÁHRAD</h3>
            <p className="text-sm text-gray-500 text-center">Doklad č.: {docNumber}</p>
            <p className="text-sm text-gray-500 text-center mb-4">{typLabels[typ]} · {form.mesiac}</p>

            <table className="w-full text-sm border-collapse mb-4">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="px-3 py-2 text-left">Meno</th>
                  <th className="px-3 py-2 text-left">Trasa</th>
                  <th className="px-3 py-2 text-right">KM</th>
                  <th className="px-3 py-2 text-left">Vozidlo</th>
                  <th className="px-3 py-2 text-left">ŠPZ</th>
                  <th className="px-3 py-2 text-right">Sadzba/km (€)</th>
                  <th className="px-3 py-2 text-right">Náhrada za km (€)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2">{form.meno}</td>
                  <td className="px-3 py-2">{trasa}</td>
                  <td className="px-3 py-2 text-right">{form.km}</td>
                  <td className="px-3 py-2">{selectedVozidlo ? `${selectedVozidlo.znacka} ${selectedVozidlo.variant}` : '-'}</td>
                  <td className="px-3 py-2">{selectedVozidlo?.spz || '-'}</td>
                  <td className="px-3 py-2 text-right">{form.sadzba_za_km.toFixed(3)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{result.naklady_km.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {result.trvanie_minut > 0 && (
              <p className="text-sm text-gray-500 mb-2">Trvanie cesty: {trvanieH} hodín {trvanieM} minút</p>
            )}

            <div className="bg-gray-50 rounded-lg p-4 mt-4 space-y-1 text-sm">
              <div className="flex justify-between"><span>Náhrada za km:</span><span>{result.naklady_km.toFixed(2)} €</span></div>
              <div className="flex justify-between"><span>Stravné:</span><span>{result.stravne.toFixed(2)} €</span></div>
              {isZahranicie && <div className="flex justify-between"><span>Vreckové ({settings?.vreckovePercento}%):</span><span>{result.vreckove.toFixed(2)} €</span></div>}
              <div className="border-t border-gray-300 my-2" />
              <div className="flex justify-between font-bold text-primary text-base"><span>CELKOM:</span><span>{result.naklady_celkom.toFixed(2)} €</span></div>
            </div>

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
