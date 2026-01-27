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
    // Close any open dropdowns
    function closeAllDropdowns() {
        document.querySelectorAll('.dropdown .dropdown-content').forEach(content => {
            content.style.display = 'none';
            const parent = content.closest('.dropdown');
            const btn = parent && parent.querySelector('.dropbtn');
            if (btn) btn.setAttribute('aria-expanded', 'false');
        });
    }

    document.querySelectorAll('.dropdown').forEach(dropdown => {
        const btn = dropdown.querySelector('.dropbtn');
        const content = dropdown.querySelector('.dropdown-content');
        if (!btn || !content) return;

        // Ensure ARIA state
        btn.setAttribute('aria-haspopup', 'true');
        btn.setAttribute('aria-expanded', 'false');

        // Toggle on click
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = content.style.display === 'block';
            // close others first
            closeAllDropdowns();
            if (!isVisible) {
                content.style.display = 'block';
                btn.setAttribute('aria-expanded', 'true');
            } else {
                content.style.display = 'none';
                btn.setAttribute('aria-expanded', 'false');
            }
        });

        content.addEventListener('click', (e) => {
            const actionable = e.target.closest && e.target.closest('a, button, .dropdown-item, [data-dropdown-item]');
            if (actionable) {
                setTimeout(() => closeAllDropdowns(), 0);
                return;
            }
            e.stopPropagation();
        });
    });

    // Click anywhere else closes open dropdowns
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown .dropdown-content').forEach(content => content.style.display = 'none');
    });

    // Press Escape to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Esc') {
            document.querySelectorAll('.dropdown .dropdown-content').forEach(content => content.style.display = 'none');
        }
    });
}

function setupSidebarButtons(monacoEditor) {
    try {
        const container = document.getElementById('btn-sidebar');
        if (!container) return;

        const buttons = Array.from(container.querySelectorAll('a'));
        const sbContent = document.querySelector('#sidebar .sb-content');
        const panes = sbContent ? Array.from(sbContent.children) : [];

        function hideAllPanes() {
            panes.forEach(p => { p.style.display = 'none'; });
        }

        function showPane(selectorOrId) {
            if (!selectorOrId) return false;
            let el = null;
            try { el = document.querySelector(selectorOrId); } catch (e) { el = null; }
            if (!el && selectorOrId && !selectorOrId.startsWith('#')) {
                try { el = document.getElementById(selectorOrId); } catch (e) { el = null; }
            }
            if (el) {
                el.style.display = '';
                return true;
            }
            return false;
        }

        buttons.forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                buttons.forEach(x => x.classList.remove('active'));
                a.classList.add('active');

                hideAllPanes();

                const target = a.getAttribute('data-target');
                if (target) {
                    // try selector first, then id fallback
                    if (!showPane(target)) {
                        showPane('#' + target.replace(/^#/, ''));
                    }
                } else {
                    // fallback: show first pane
                    if (panes[0]) panes[0].style.display = '';
                }

                const editorEl = document.getElementById('editor');
                if (editorEl) editorEl.style.display = '';
                if (monacoEditor && typeof monacoEditor.layout === 'function') {
                    setTimeout(() => monacoEditor.layout(), 50);
                }
            });
        });

        // Initialize: activate first active button or the first button
        const initial = buttons.find(b => b.classList.contains('active')) || buttons[0];
        if (initial) {
            // trigger click without causing double preventDefault issues
            setTimeout(() => initial.click(), 0);
        }
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
