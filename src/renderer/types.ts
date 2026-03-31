export interface Vozidlo {
  id: string
  znacka: string
  variant: string
  spz: string
  druh: 'osobne' | 'nakladne'
  palivo: 'diesel' | 'premium_diesel' | 'benzin' | 'lpg' | 'elektro'
  spotreba_tp: number
  objem_motora: number
  aktivne: boolean
}

export interface Paliva {
  diesel: number
  premium_diesel: number
  benzin: number
  lpg: number
  elektro: number
  aktualizovane: string | null
}

export interface VyuctovanieZaznam {
  id: string
  cislo_dokladu: string
  typ: 'firemne_doma' | 'firemne_zahranicie' | 'sukromne_doma' | 'sukromne_zahranicie'
  meno: string
  mesiac: string
  odchod_z: string
  prichod_do: string
  cez: string
  km: number
  vozidlo_id: string
  spotreba_pouzita: number
  palivo_typ: string
  cena_za_liter: number
  sadzba_za_km: number
  cas_odchodu: string
  cas_prichodu: string
  stravne: number
  vreckove: number
  naklady_phm: number
  naklady_celkom: number
  vytvorene: string
}

export interface StravneDoma {
  do5h: number
  od5do12h: number
  od12do18h: number
  nad18h: number
}

export interface StravneZahranicie {
  do6h: number
  od6do12h: number
  nad12h: number
}

export interface Settings {
  lastDocNumber: number
  companyName: string
  sadzbaSukromneAuto: number
  stravneDoma: StravneDoma
  stravneZahranicie: StravneZahranicie
  vreckovePercento: number
}

export interface ElectronAPI {
  vozidla: {
    getAll: () => Promise<Vozidlo[]>
    save: (data: Vozidlo[]) => Promise<boolean>
  }
  paliva: {
    get: () => Promise<Paliva>
    save: (data: Paliva) => Promise<boolean>
  }
  vyuctovanie: {
    getAll: () => Promise<VyuctovanieZaznam[]>
    save: (data: VyuctovanieZaznam[]) => Promise<boolean>
  }
  settings: {
    get: () => Promise<Settings>
    save: (data: Settings) => Promise<boolean>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
