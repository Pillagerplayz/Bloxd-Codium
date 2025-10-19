const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const modalManager = require('./src/modalManager');

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icons/icons/win/icon.ico'), // App icon
    show: false, // Don't show until ready
    frame: false, // Remove default title bar since we have custom controls
    titleBarStyle: 'hidden'
  });

  // Load the app
  mainWindow.loadFile('public/index.html');

  // Listen for window state changes
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-unmaximized');
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Send initial state
    if (mainWindow.isMaximized()) {
      mainWindow.webContents.send('window-maximized');
    } else {
      mainWindow.webContents.send('window-unmaximized');
    }
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// IPC handler to show/create the project creation modal
ipcMain.on('show-project-creation', () => {
  // Ensure main window exists before creating a modal
  if (!mainWindow) return;
  modalManager.createProjectCreationModal(mainWindow);
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (navigationEvent, navigationURL) => {
    event.preventDefault();
  });
});

// IPC handlers for window controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.on('close-project-modal', () => {
  modalManager.closeProjectModal();
});

ipcMain.handle('show-open-folder-dialog', async () => {
  try {
    if (!mainWindow) return { canceled: true };
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    return result;
  } catch (err) {
    return { canceled: true, error: err.message };
  }
});

ipcMain.handle('create-project', async (event, { name, folder }) => {
  try {
    if (!name || !folder) return { success: false, message: 'Invalid name or folder' };
    const projectPath = path.join(folder, name);
    if (fs.existsSync(projectPath)) {
      return { success: false, message: 'Project folder already exists' };
    }
    fs.mkdirSync(projectPath);
    return { success: true, path: projectPath };
  } catch (err) {
    return { success: false, message: err.message };
  }
});