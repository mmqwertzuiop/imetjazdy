import { useState, useEffect, useRef } from 'react'
import { Calculator, Save, Printer, FileDown } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useReactToPrint } from 'react-to-print'
import jsPDF from 'jspdf'
import type { Vozidlo, Paliva, VyuctovanieZaznam, Settings } from '../types'

const typLabels: Record<string, string> = {
  sukromne_doma: 'Súkromné auto: Doma',
  sukromne_zahranicie: 'Súkromné auto: Zahraničie',
}

const printTitles: Record<string, string> = {
  sukromne_doma: 'NÁHRADY ZA POUŽITIE SÚKROMNÉHO VOZIDLA: DOMÁCA PRACOVNÁ CESTA',
  sukromne_zahranicie: 'NÁHRADY ZA POUŽITIE SÚKROMNÉHO VOZIDLA: ZAHRANIČNÁ PRACOVNÁ CESTA',
}

const palivoLabels: Record<string, string> = {
  diesel: 'Diesel',
  premium_diesel: 'Prémiový Diesel',
  benzin_e10: 'Benzín E10 (95)',
  benzin_e5: 'Benzín E5 (100)',
  lpg: 'LPG',
  elektro: 'Elektro',
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
    sadzba_za_km: 0.25,
    cas_odchodu: '',
    cas_prichodu: '',
  })
  const [result, setResult] = useState<Result | null>(null)
  const [selectedVozidlo, setSelectedVozidlo] = useState<Vozidlo | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.electronAPI.vozidla.getAll().then(setVozidla)
    window.electronAPI.paliva.get().then(setPaliva)
    window.electronAPI.settings.get().then((s) => {
      setSettings(s)
      setDocNumber(generateDocNumber(s.lastDocNumber))
      setForm((f) => ({ ...f, sadzba_za_km: s.sadzbaSukromneAuto }))
    })
  }, [])

  useEffect(() => {
    setForm(() => ({ meno: '', mesiac: '', odchod_z: '', prichod_do: '', cez: '', km: 0, vozidlo_id: '', sadzba_za_km: settings?.sadzbaSukromneAuto || 0.25, cas_odchodu: '', cas_prichodu: '' }))
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
      spotreba_pouzita: selectedVozidlo?.spotreba_tp || 0,
      palivo_typ: selectedVozidlo?.palivo || '',
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

  const getCenaZaLiter = () => {
    if (!selectedVozidlo || !paliva) return 0
    return (paliva[selectedVozidlo.palivo as keyof Omit<Paliva, 'aktualizovane'>] as number) || 0
  }

  const handlePDF = () => {
    if (!result) return
    const doc = new jsPDF()
    let y = 15
    if (settings?.companyName) {
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(settings.companyName, 105, y, { align: 'center' })
      y += 10
    }
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(printTitles[typ], 105, y, { align: 'center' })
    y += 7
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Doklad č.: ${docNumber}  ·  ${form.mesiac}`, 105, y, { align: 'center' })
    y += 10

    const lx = 14
    doc.setFontSize(9)
    doc.text(`Meno:`, lx, y); doc.text(form.meno, lx + 40, y); y += 5
    doc.text(`Odchod z:`, lx, y); doc.text(form.odchod_z, lx + 40, y); y += 5
    doc.text(`Príchod do:`, lx, y); doc.text(form.prichod_do, lx + 40, y); y += 5
    doc.text(`Cez:`, lx, y); doc.text(form.cez || '-', lx + 40, y); y += 5
    doc.text(`Vzdialenosť:`, lx, y); doc.text(`${form.km} km`, lx + 40, y); y += 8

    if (selectedVozidlo) {
      doc.text(`Vozidlo:`, lx, y); doc.text(`${selectedVozidlo.znacka} ${selectedVozidlo.variant}`, lx + 40, y); y += 5
      doc.text(`ŠPZ:`, lx, y); doc.text(selectedVozidlo.spz, lx + 40, y); y += 5
      doc.text(`Spotreba TP:`, lx, y); doc.text(`${selectedVozidlo.spotreba_tp} l/100km`, lx + 40, y); y += 5
      doc.text(`PHM:`, lx, y); doc.text(palivoLabels[selectedVozidlo.palivo] || '', lx + 40, y); y += 5
      doc.text(`Cena/L:`, lx, y); doc.text(`${getCenaZaLiter().toFixed(3)} EUR`, lx + 40, y); y += 5
    }
    doc.text(`Sadzba za 1km:`, lx, y); doc.text(`${form.sadzba_za_km.toFixed(3)} EUR`, lx + 40, y); y += 10

    doc.setFont('helvetica', 'bold')
    doc.text(`Náhrada za km:`, lx, y); doc.text(`${result.naklady_km.toFixed(2)} EUR`, lx + 80, y); y += 5
    if (result.stravne > 0) { doc.setFont('helvetica', 'normal'); doc.text(`Stravné:`, lx, y); doc.text(`${result.stravne.toFixed(2)} EUR`, lx + 80, y); y += 5 }
    if (isZahranicie && result.vreckove > 0) { doc.text(`Vreckové (${settings?.vreckovePercento}%):`, lx, y); doc.text(`${result.vreckove.toFixed(2)} EUR`, lx + 80, y); y += 5 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(`CELKOM:`, lx, y); doc.text(`${result.naklady_celkom.toFixed(2)} EUR`, lx + 80, y); y += 15

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Dátum vytvorenia: ${new Date().toLocaleDateString('sk-SK')}`, 14, y)
    doc.text('Podpis: ___________________________', 120, y)

    doc.save(`vyuctovanie_${docNumber}_${typ}.pdf`)
  }

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
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ŠPZ / PHM typ</label>
                <p className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700">{selectedVozidlo.spz} · {palivoLabels[selectedVozidlo.palivo]}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Spotreba TP / Cena/L</label>
                <p className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700">{selectedVozidlo.spotreba_tp} l/100km · {getCenaZaLiter().toFixed(3)} €/L</p>
              </div>
            </>
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
            <h3 className="text-base font-bold text-gray-900 mb-1 text-center">{printTitles[typ]}</h3>
            <p className="text-sm text-gray-500 text-center mb-6">Doklad č.: {docNumber} · {form.mesiac}</p>

            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-6">
              <div className="flex"><span className="text-gray-500 w-36">Meno:</span><span className="font-medium">{form.meno}</span></div>
              <div></div>
              <div className="flex"><span className="text-gray-500 w-36">Odchod z:</span><span>{form.odchod_z}</span></div>
              {selectedVozidlo && <div className="flex"><span className="text-gray-500 w-36">PHM:</span><span>{palivoLabels[selectedVozidlo.palivo]}</span></div>}
              <div className="flex"><span className="text-gray-500 w-36">Príchod do:</span><span>{form.prichod_do}</span></div>
              {selectedVozidlo && <div className="flex"><span className="text-gray-500 w-36">Cena/L:</span><span>{getCenaZaLiter().toFixed(3)} EUR</span></div>}
              <div className="flex"><span className="text-gray-500 w-36">Cez:</span><span>{form.cez || '-'}</span></div>
              {selectedVozidlo && <div className="flex"><span className="text-gray-500 w-36">Spotreba TP:</span><span>{selectedVozidlo.spotreba_tp} l/100km</span></div>}
              <div className="flex"><span className="text-gray-500 w-36">Vzdialenosť:</span><span className="font-semibold">{form.km} km</span></div>
              <div></div>
              {selectedVozidlo && (
                <>
                  <div className="flex mt-2"><span className="text-gray-500 w-36">Vozidlo:</span><span>{selectedVozidlo.znacka} {selectedVozidlo.variant}</span></div>
                  <div></div>
                  <div className="flex"><span className="text-gray-500 w-36">ŠPZ:</span><span className="font-mono">{selectedVozidlo.spz}</span></div>
                  <div></div>
                </>
              )}
              <div className="flex"><span className="text-gray-500 w-36">Sadzba za 1km:</span><span>{form.sadzba_za_km.toFixed(3)} EUR</span></div>
              <div></div>
            </div>

            {result.trvanie_minut > 0 && (
              <p className="text-sm text-gray-500 mb-2">Trvanie cesty: {trvanieH} hodín {trvanieM} minút</p>
            )}

            <div className="bg-gray-50 rounded-lg p-4 mt-2 space-y-1.5 text-sm max-w-md">
              <div className="flex justify-between"><span>Náhrada za km:</span><span>{result.naklady_km.toFixed(2)} EUR</span></div>
              {result.stravne > 0 && <div className="flex justify-between"><span>Stravné:</span><span>{result.stravne.toFixed(2)} EUR</span></div>}
              {isZahranicie && result.vreckove > 0 && <div className="flex justify-between"><span>Vreckové ({settings?.vreckovePercento}%):</span><span>{result.vreckove.toFixed(2)} EUR</span></div>}
              <div className="border-t border-gray-300 my-2" />
              <div className="flex justify-between font-bold text-primary text-base"><span>CELKOM:</span><span>{result.naklady_celkom.toFixed(2)} EUR</span></div>
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
