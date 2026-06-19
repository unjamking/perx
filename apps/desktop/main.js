const { app, BrowserWindow } = require("electron");
const path = require("path");

const DEV_URL = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: "#C1D9DE",
    titleBarStyle: "hiddenInset", // native traffic lights, frameless feel
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  if (isDev) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, "dist", "index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
