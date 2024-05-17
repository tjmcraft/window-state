const { app, BrowserWindow } = require('electron');

function createWindow() {
	// Initialize window state
	let windowState = require('../src')({
		width: 1280,
		height: 720
	});
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    x: windowState.x,
		y: windowState.y,
		width: windowState.width,
		height: windowState.height,
    webPreferences: {
      nodeIntegration: true
    }
	});
	// Hook window to manage
	windowState.manage(mainWindow);
  // Load the index.html file.
  mainWindow.loadFile('index.html');
}

// This method will be called when Electron has finished initialization.
app.once('ready', createWindow);

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});