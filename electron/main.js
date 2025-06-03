const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  session,
} = require("electron");
const path = require("path");

let mainWindow;
let overlayWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadURL("http://localhost:3000");

  // Don't open DevTools automatically to avoid those errors
  // mainWindow.webContents.openDevTools();
}
function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: 800,
    height: 120,
    x: 100,
    y: 50,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  overlayWindow.loadURL("http://localhost:3000#overlay");

  // DO NOT set ignore mouse events - let the window be interactive
  // overlayWindow.setIgnoreMouseEvents(true); // <-- REMOVE THIS
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      if (permission === "media") {
        callback(true);
      } else {
        callback(false);
      }
    }
  );

  createMainWindow();
  createOverlayWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle("get-audio-sources", async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["window", "screen"],
      fetchWindowIcons: true,
    });

    // Log sources for debugging
    console.log(
      "Available sources:",
      sources.map((s) => ({ id: s.id, name: s.name }))
    );

    return sources;
  } catch (error) {
    console.error("Error getting sources:", error);
    return [];
  }
});

ipcMain.on("update-subtitle", (event, text) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send("new-subtitle", text);
  }
});

ipcMain.on("toggle-overlay", (event, show) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    if (show) {
      overlayWindow.show();
    } else {
      overlayWindow.hide();
    }
  }
});

ipcMain.on("update-overlay-bounds", (event, bounds) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setBounds(bounds);
  }
});

ipcMain.on("update-subtitle-style", (event, style) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send("style-update", style);
  }
});

ipcMain.on("show-shortcuts-help", () => {
  const { dialog } = require("electron");
  dialog.showMessageBox(mainWindow, {
    type: "info",
    title: "Keyboard Shortcuts",
    message: "Keyboard Shortcuts",
    detail: `
Ctrl+Shift+T - Toggle Translation
Ctrl+Shift+O - Toggle Overlay
Ctrl+Shift+E - Export History
Ctrl+Shift+H - Show this help
    `,
    buttons: ["OK"],
  });
});

ipcMain.on("set-ignore-mouse-events", (event, ignore, options) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setIgnoreMouseEvents(ignore, options);
  }
});

ipcMain.on("set-window-position", (event, x, y) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setPosition(Math.round(x), Math.round(y));
  }
});

ipcMain.handle("get-window-bounds", () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    return overlayWindow.getBounds();
  }
  return { x: 0, y: 0, width: 800, height: 120 };
});
