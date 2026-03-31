import { ipcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'

const userDataPath = app.getPath('userData')
const dataDir = path.join(userDataPath, 'imetjazdy-data')

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

  // Settings
  ipcMain.handle('settings:get', () => {
    return readJsonFile('settings.json', {
      lastDocNumber: 0,
      companyName: '',
    })
  })

  ipcMain.handle('settings:save', (_event, data) => {
    writeJsonFile('settings.json', data)
    return true
  })
}
