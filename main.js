const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let projectWindow = null;

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

function createProjectCreationModal() {
  // If already created, just show it
  if (projectWindow) {
    try { projectWindow.show(); } catch (e) { /* ignore */ }
    return projectWindow;
  }

  projectWindow = new BrowserWindow({
    parent: mainWindow,
    modal: true,
    show: false,
    width: 460,
    height: 320,
    resizable: false,
    maximizable: false,
    minimizable: false,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the modal HTML file using an absolute path
  projectWindow.loadFile(path.join(__dirname, 'public', 'modals', 'new-project-prompt.html'));

  // Use the real ready-to-show event
  projectWindow.once('ready-to-show', () => {
    projectWindow.show();
  });

  projectWindow.on('closed', () => {
    projectWindow = null;
  });

  return projectWindow;
}

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
  createProjectCreationModal();
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
  if (projectWindow) {
    try { projectWindow.close(); } catch (e) { /* ignore */ }
    projectWindow = null;
  }
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
    fs.mkdirSync(projectPath, { recursive: true });
    // Create a minimal README and package.json
    fs.writeFileSync(path.join(projectPath, 'README.md'), `# ${name}\nCreated by Bloxd Codium`);
    const pkg = { name: name.toLowerCase().replace(/[^a-z0-9-_]/g, '-'), version: '0.0.0' };
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify(pkg, null, 2));

    return { success: true, path: projectPath };
  } catch (err) {
    return { success: false, message: err.message };
  }
});