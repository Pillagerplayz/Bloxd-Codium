(function() {
  let ipcRenderer = null;
  try {
    if (typeof window !== 'undefined' && window.require && typeof window.require === 'function') {
      ipcRenderer = window.require('electron')?.ipcRenderer || null;
    } else if (typeof require === 'function') {
      ipcRenderer = require('electron')?.ipcRenderer || null;
    }
  } catch (err) {
    console.error('ipcRenderer acquisition error:', err);
    ipcRenderer = null;
  }

  const closeBtn = document.getElementById('close-modal');
  const cancelBtn = document.getElementById('np-cancel');
  const browseBtn = document.getElementById('np-browse');
  const createBtn = document.getElementById('np-create');
  const nameInput = document.getElementById('np-name');
  const pathInput = document.getElementById('np-path');
  const statusEl = document.getElementById('np-status');

  function setStatus(msg, isError = true) {
    if (!statusEl) return;
    statusEl.style.color = isError ? '#f88' : '#7ef08a';
    statusEl.textContent = msg;
  }

  function closeWindow() {
    try {
      if (ipcRenderer && ipcRenderer.send) {
        ipcRenderer.send('close-project-modal');
      } else if (window.close) {
        window.close();
      }
    } catch (e) {
      console.error('Error closing window:', e);
      try { window.close(); } catch (ee) { /* ignore */ }
    }
  }

  closeBtn?.addEventListener('click', closeWindow);
  cancelBtn?.addEventListener('click', closeWindow);

  browseBtn?.addEventListener('click', async () => {
    try {
      if (ipcRenderer && ipcRenderer.invoke) {
        const result = await ipcRenderer.invoke('show-open-folder-dialog');
        if (result && !result.canceled && result.filePaths && result.filePaths[0]) {
          pathInput.value = result.filePaths[0];
          setStatus('');
        } else if (result && result.canceled) {
          setStatus('Folder selection canceled.', false);
        } else {
          setStatus('No folder selected.', true);
        }
      } else {
        setStatus('Browse not available: ipcRenderer not found.', true);
        console.warn('ipcRenderer not available for browse');
      }
    } catch (e) {
      console.error('Error during folder selection:', e);
      setStatus('Error during folder selection: ' + (e && e.message ? e.message : String(e)), true);
    }
  });

  createBtn?.addEventListener('click', async () => {
    const name = nameInput?.value?.trim();
    const folder = pathInput?.value?.trim();
    setStatus('');

    if (!name) {
      setStatus('Please enter a project name.', true);
      return;
    }

    if (!folder) {
      setStatus('Please choose a location.', true);
      return;
    }

    try {
      if (ipcRenderer && ipcRenderer.invoke) {
        const result = await ipcRenderer.invoke('create-project', { name, folder });
        if (result && result.success) {
          setStatus('Project created successfully.', false);
          setTimeout(closeWindow, 700);
        } else {
          console.error('Create project failed:', result);
          setStatus('Failed to create project: ' + (result?.message || 'unknown error'), true);
        }
      } else {
        setStatus('Create not available: ipcRenderer not found.', true);
        console.warn('ipcRenderer not available for create');
      }
    } catch (e) {
      console.error('Error creating project:', e);
      setStatus('Error during project creation: ' + (e && e.message ? e.message : String(e)), true);
    }
  });

})();
