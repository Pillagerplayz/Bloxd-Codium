const { BrowserWindow } = require('electron');
const path = require('path');

let projectWindow = null;

function createProjectCreationModal(parentWindow) {
    if (projectWindow) {
        try { projectWindow.show(); } catch (e) { /* ignore */ }
        return projectWindow;
    }

    projectWindow = new BrowserWindow({
        parent: parentWindow,
        modal: true,
        show: false,
        width: 390,
        height: 285,
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

    // Load modal HTML (path relative to project root)
    projectWindow.loadFile(path.join(__dirname, '..', 'public', 'modals', 'new-project-prompt.html'));

    projectWindow.once('ready-to-show', () => {
        try { projectWindow.show(); } catch (e) { /* ignore */ }
    });

    projectWindow.on('closed', () => {
        projectWindow = null;
    });

    return projectWindow;
}

function closeProjectModal() {
    if (projectWindow) {
        try { projectWindow.close(); } catch (e) { /* ignore */ }
        projectWindow = null;
    }
}

module.exports = {
    createProjectCreationModal,
    closeProjectModal
};
