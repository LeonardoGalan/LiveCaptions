const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getAudioSources: () => ipcRenderer.invoke("get-audio-sources"),
  updateSubtitle: (text) => ipcRenderer.send("update-subtitle", text),
  toggleOverlay: (show) => ipcRenderer.send("toggle-overlay", show),
  onNewSubtitle: (callback) =>
    ipcRenderer.on("new-subtitle", (event, text) => callback(text)),
  updateOverlayBounds: (bounds) =>
    ipcRenderer.send("update-overlay-bounds", bounds),
  updateSubtitleStyle: (style) =>
    ipcRenderer.send("update-subtitle-style", style),
  onStyleUpdate: (callback) =>
    ipcRenderer.on("style-update", (event, style) => callback(style)),
  onTranslationAdded: (callback) =>
    ipcRenderer.on("translation-added", (event, data) => callback(data)),
  showShortcutsHelp: () => ipcRenderer.send("show-shortcuts-help"),
  setIgnoreMouseEvents: (ignore, options) =>
    ipcRenderer.send("set-ignore-mouse-events", ignore, options),
  setWindowPosition: (x, y) => ipcRenderer.send("set-window-position", x, y),
  getWindowBounds: () => ipcRenderer.invoke("get-window-bounds"),
});
