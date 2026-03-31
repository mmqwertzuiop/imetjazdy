import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  vozidla: {
    getAll: () => ipcRenderer.invoke('vozidla:getAll'),
    save: (data: unknown) => ipcRenderer.invoke('vozidla:save', data),
  },
  paliva: {
    get: () => ipcRenderer.invoke('paliva:get'),
    save: (data: unknown) => ipcRenderer.invoke('paliva:save', data),
  },
  vyuctovanie: {
    getAll: () => ipcRenderer.invoke('vyuctovanie:getAll'),
    save: (data: unknown) => ipcRenderer.invoke('vyuctovanie:save', data),
  },
})
