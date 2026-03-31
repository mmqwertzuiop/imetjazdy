import { ipcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'

const userDataPath = app.getPath('userData')
const dataDir = path.join(userDataPath, 'imetjazdy-data')

const defaultSettings = {
  lastDocNumber: 0,
  companyName: '',
  sadzbaSukromneAuto: 0.25,
  stravneDoma: { do5h: 0, od5do12h: 4.00, od12do18h: 6.00, nad18h: 9.30 },
  stravneZahranicie: { do6h: 0, od6do12h: 9.00, nad12h: 18.00 },
  vreckovePercento: 10,
}

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

function readJsonFile<T>(filename: string, defaultValue: T): T {
  ensureDataDir()
  const filePath = path.join(dataDir, filename)
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8')
    return defaultValue
  }
  const data = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(data) as T
}

function writeJsonFile<T>(filename: string, data: T): void {
  ensureDataDir()
  const filePath = path.join(dataDir, filename)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target }
  for (const key of Object.keys(target)) {
    if (key in source) {
      if (
        typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key]) &&
        typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])
      ) {
        result[key] = deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>)
      } else {
        result[key] = source[key]
      }
    }
  }
  // Also copy keys from source that don't exist in target
  for (const key of Object.keys(source)) {
    if (!(key in target)) {
      result[key] = source[key]
    }
  }
  return result
}

export function registerIpcHandlers() {
  // Vozidla
  ipcMain.handle('vozidla:getAll', () => {
    return readJsonFile('vozidla.json', [])
  })

  ipcMain.handle('vozidla:save', (_event, data) => {
    writeJsonFile('vozidla.json', data)
    return true
  })

  // Paliva
  ipcMain.handle('paliva:get', () => {
    return readJsonFile('paliva.json', {
      diesel: 0,
      premium_diesel: 0,
      benzin: 0,
      lpg: 0,
      elektro: 0,
      aktualizovane: null,
    })
  })

  ipcMain.handle('paliva:save', (_event, data) => {
    writeJsonFile('paliva.json', data)
    return true
  })

  // Vyuctovanie
  ipcMain.handle('vyuctovanie:getAll', () => {
    return readJsonFile('vyuctovanie.json', [])
  })

  ipcMain.handle('vyuctovanie:save', (_event, data) => {
    writeJsonFile('vyuctovanie.json', data)
    return true
  })

  // Settings - merge with defaults to handle new fields
  ipcMain.handle('settings:get', () => {
    const stored = readJsonFile('settings.json', defaultSettings)
    const merged = deepMerge(
      defaultSettings as unknown as Record<string, unknown>,
      stored as unknown as Record<string, unknown>,
    )
    return merged
  })

  ipcMain.handle('settings:save', (_event, data) => {
    writeJsonFile('settings.json', data)
    return true
  })
}
