const { ipcRenderer } = require('electron');

function setupWindowControls() {
    const buttons = {
        'min-btn': () => ipcRenderer.send('window-minimize'),
        'max-btn': () => ipcRenderer.send('window-maximize'),
        'close-btn': () => ipcRenderer.send('window-close')
    };

    Object.entries(buttons).forEach(([id, handler]) => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            e.preventDefault();
            handler();
        });
    });

    ipcRenderer.on('window-maximized', () => updateMaximizeIcon(true));
    ipcRenderer.on('window-unmaximized', () => updateMaximizeIcon(false));

    function updateMaximizeIcon(isMaximized) {
        const maxBtn = document.getElementById("max-btn");
        const icon = maxBtn?.querySelector('i');
        if (icon) {
            icon.className = isMaximized ? 'fas fa-window-restore' : 'fas fa-window-maximize';
            maxBtn.title = isMaximized ? 'Restore' : 'Maximize';
        }
    }
}

function setupDropdowns() {
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        const btn = dropdown.querySelector('.dropbtn');
        const content = dropdown.querySelector('.dropdown-content');
        if (!btn || !content) return;
        let hideTimeout;
        const show = () => {
            clearTimeout(hideTimeout);
            content.style.display = 'block';
        };
        const hide = () => {
            hideTimeout = setTimeout(() => content.style.display = 'none', 100);
        };
        btn.addEventListener('click', show);
        btn.addEventListener('mouseenter', show);
        btn.addEventListener('mouseleave', hide);
        content.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
        content.addEventListener('mouseleave', hide);
    });
}

function setupSidebarButtons(monacoEditor) {
    try {
        const container = document.getElementById('btn-sidebar');
        if (!container) return;
        const buttons = Array.from(container.querySelectorAll('a'));
        buttons.forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                buttons.forEach(x => x.classList.remove('active'));
                a.classList.add('active');
                const editorEl = document.getElementById('editor');
                if (editorEl) editorEl.style.display = '';
                if (monacoEditor && typeof monacoEditor.layout === 'function') {
                    setTimeout(() => monacoEditor.layout(), 50);
                }
            });
        });
    } catch (err) {
        // ignore
    }
}

function setupSplitter(monacoEditor) {
    try {
        const splitter = document.getElementById('splitter');
        const sidebar = document.getElementById('sidebar');
        const editorEl = document.getElementById('editor');
        if (!splitter || !sidebar || !editorEl) return;

        try {
            const w = localStorage.getItem('sidebarWidth');
            if (w) sidebar.style.width = w;
        } catch (e) {}

        let isDragging = false;
        let startX = 0;
        let startWidth = 0;

        splitter.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startWidth = sidebar.getBoundingClientRect().width;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        function onMouseMove(e) {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const containerRect = document.querySelector('.container').getBoundingClientRect();
            const editorMin = 200;
            const maxAllowed = Math.min(800, containerRect.width - editorMin - 1);
            const minAllowed = 120;
            let desired = startWidth + dx;
            if (desired < minAllowed) desired = minAllowed;
            if (desired > maxAllowed) desired = maxAllowed;
            sidebar.style.width = desired + 'px';
            if (monacoEditor && typeof monacoEditor.layout === 'function') {
                monacoEditor.layout();
            }
        }

        function onMouseUp() {
            if (!isDragging) return;
            isDragging = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            try { localStorage.setItem('sidebarWidth', sidebar.style.width); } catch (e) {}
        }
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    } catch (e) {
        // ignore
    }
}

function setupResizeHandler(monacoEditor) {
    window.addEventListener('resize', () => {
        if (monacoEditor) {
            setTimeout(() => monacoEditor.layout(), 50);
        }
    });
}

function ensureEditorToggleButton(monacoEditor) {
    let btn = document.getElementById('toggle-editor-btn');
    if (!btn) {
        const header = document.querySelector('.header') || document.body;
        btn = document.createElement('button');
        btn.id = 'toggle-editor-btn';
        btn.textContent = 'Hide Editor';
        btn.style.marginLeft = '8px';
        btn.style.padding = '6px 10px';
        btn.style.borderRadius = '6px';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', () => {
            const event = new Event('toggle-editor');
            document.dispatchEvent(event);
            btn.textContent = btn.textContent === 'Hide Editor' ? 'Show Editor' : 'Hide Editor';
            setTimeout(() => { if (monacoEditor) try { monacoEditor.layout(); } catch (e) {} }, 120);
        });
        header.appendChild(btn);
    }
}

module.exports = { setupWindowControls, setupDropdowns, setupSidebarButtons, setupSplitter, setupResizeHandler, ensureEditorToggleButton };
