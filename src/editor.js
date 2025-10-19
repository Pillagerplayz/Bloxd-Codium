const { start } = require('repl');

(function() {
    const { ipcRenderer } = require('electron');
    const path = require('path');
    const fs = require('fs');

    const linter = {
        lint(text) {
            if (!text) return [];
            const lines = String(text).split('\n');
            const results = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const ln = i + 1;

                const varMatch = line.match(/\bvar\s+\w+/);
                if (varMatch) {
                    const idx = line.indexOf(varMatch[0]);
                    results.push({ line: ln, column: idx + 1, startLine: ln, startColumn: idx + 1, endLine: ln, endColumn: idx + varMatch[0].length + 1, message: 'Avoid var; use let/const', severity: 'warning', source: 'bloxd-linter' });
                }

                const commentMatch = line.match(/\/\//);
                if (commentMatch) {
                    const idx = line.indexOf(commentMatch[0]);
                    results.push({ line: ln, column: idx+1, startLine: ln, startColumn: idx + 1, endLine: ln, endColumn: idx + commentMatch[0].length + 1, message: 'Line comments (//) are not allowed in Bloxd scripting. Use block comments (/* */) instead.', severity: 'err', source: 'bloxd-linter' });
                }

                const asyncAwaitMatch = line.match(/\b(async|await)\b/);
                if (asyncAwaitMatch) {
                    const idx = line.indexOf(asyncAwaitMatch[0]);
                    results.push({ line: ln, column: idx + 1, startLine: ln, startColumn: idx + 1, endLine: ln, endColumn: idx + asyncAwaitMatch[0].length + 1, message: 'Async/await is not allowed in Bloxd scripting.', severity: 'err', source: 'bloxd-linter' });
                }
            }

            return results;
        }
    };

    let monacoEditor = null;
    let currentFile = null;
    let isModified = false;

    // Load multiple Bloxd API definitions
    function loadBloxdApiDefinitions() {
        const libraries = [];
        
        try {
            // Define all possible library files
            const libraryFiles = [
                { name: 'bloxd-api', path: path.join(__dirname, 'libs', 'bloxd-api.d.ts') },
                { name: 'bloxd-types', path: path.join(__dirname, 'libs', 'bloxd-types.d.ts') }
            ];

            // Try alternative paths if primary doesn't exist
            const altBasePaths = [
                path.join(__dirname, '../libs'),
                path.join(__dirname, '../../libs'),
                path.join(process.cwd(), 'src/libs')
            ];

            for (const lib of libraryFiles) {
                // Try primary path first
                if (fs.existsSync(lib.path)) {
                    const content = fs.readFileSync(lib.path, 'utf8');
                    libraries.push({
                        name: lib.name,
                        content: content,
                        uri: `ts:filename/${lib.name}.d.ts`
                    });
                } else {
                    // Try alternative paths
                    for (const altPath of altBasePaths) {
                        const altLibPath = path.join(altPath, `${lib.name}.d.ts`);
                        if (fs.existsSync(altLibPath)) {
                            const content = fs.readFileSync(altLibPath, 'utf8');
                            libraries.push({
                                name: lib.name,
                                content: content,
                                uri: `ts:filename/${lib.name}.d.ts`
                            });
                            break; // Found it, stop looking
                        }
                    }
                }
            }

            return libraries;
        } catch (error) {
            return [];
        }
    }

    // Add multiple libraries to Monaco
    function addBloxdLibrariesToMonaco(libraries) {
        try {
            if (!monaco || !monaco.languages || !monaco.languages.typescript) {
                return false;
            }

            let addedCount = 0;

            // Add each library
            for (const lib of libraries) {
                try {
                    // Add to JavaScript defaults
                    monaco.languages.typescript.javascriptDefaults.addExtraLib(
                        lib.content, 
                        lib.uri
                    );

                    // Add to TypeScript defaults
                    monaco.languages.typescript.typescriptDefaults.addExtraLib(
                        lib.content, 
                        lib.uri
                    );

                    addedCount++;
                } catch (libError) {
                    // Continue with other libraries if one fails
                    continue;
                }
            }

            // Configure compiler options for better IntelliSense
            const compilerOptions = {
                target: monaco.languages.typescript.ScriptTarget.ES2020,
                allowNonTsExtensions: true,
                moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                module: monaco.languages.typescript.ModuleKind.CommonJS,
                noEmit: true,
                esModuleInterop: true,
                allowJs: true,
                typeRoots: ["node_modules/@types", "node_modules/@bloxd"],
                lib: ["ES2020", "DOM"],
                declaration: true,
                skipLibCheck: true,
                forceConsistentCasingInFileNames: false
            };

            monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);
            monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);

            // Also configure diagnostics to be less strict for better IntelliSense
            monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                noSemanticValidation: false,
                noSyntaxValidation: false,
                noSuggestionDiagnostics: false
            });

            monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                noSemanticValidation: false,
                noSyntaxValidation: false,
                noSuggestionDiagnostics: false
            });

            return addedCount > 0;
        } catch (error) {
            return false;
        }
    }

    // Monaco Editor initialization using local installation
    function initializeMonacoEditor() {
        const editorContainer = document.getElementById('editor');
        if (!editorContainer) {
            return;
        }

        try {
            // Load Monaco Editor from local node_modules
            loadMonacoLocally();
        } catch (error) {
            createFallbackEditor();
        }
    }

    function loadMonacoLocally() {
        // Get the path to Monaco Editor in node_modules
        const monacoPath = path.join(__dirname, '../node_modules/monaco-editor/min/vs');

        // Configure require for Monaco
        window.require = window.require || {};
        window.require.config = window.require.config || function() {};
        
        // Create script element to load Monaco loader
        const loaderScript = document.createElement('script');
        loaderScript.src = `file:///${monacoPath}/loader.js`.replace(/\\/g, '/');
        
        loaderScript.onload = function() {
            // Configure Monaco paths
            require.config({
                paths: {
                    'vs': `file:///${monacoPath}`.replace(/\\/g, '/')
                }
            });

            // Load Monaco Editor main module
            require(['vs/editor/editor.main'], function() {
                // Wait a bit for Monaco to fully initialize
                setTimeout(() => {
                    // Load multiple libraries
                    const bloxdLibraries = loadBloxdApiDefinitions();
                    if (bloxdLibraries.length > 0) {
                        addBloxdLibrariesToMonaco(bloxdLibraries);
                    }
                    
                    createEditor();
                }, 500);
                
            }, function(err) {
                createFallbackEditor();
            });
        };

        loaderScript.onerror = function(err) {
            // Try alternative approach
            loadMonacoAlternative();
        };

        document.head.appendChild(loaderScript);
    }

    function loadMonacoAlternative() {
        try {
            // Try to require Monaco directly (for Electron apps)
            const monaco = require('monaco-editor');

            if (monaco && monaco.editor) {
                window.monaco = monaco;
                
                // Wait for Monaco to be fully ready
                setTimeout(() => {
                    // Load multiple libraries for alternative loading
                    const bloxdLibraries = loadBloxdApiDefinitions();
                    if (bloxdLibraries.length > 0) {
                        addBloxdLibrariesToMonaco(bloxdLibraries);
                    }
                    
                    createEditor();
                }, 500);
            } else {
                throw new Error('Monaco not available via require');
            }
        } catch (error) {
            createFallbackEditor();
        }
    }

    function createEditor() {
        const editorContainer = document.getElementById('editor');
        
        try {
            // Clear any existing content
            editorContainer.innerHTML = '';
            
            // VS Code Dark+ theme with proper syntax highlighting
            monaco.editor.defineTheme('bloxd-colorful', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                    // Comments - green
                    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
                    { token: 'comment.line', foreground: '6A9955', fontStyle: 'italic' },
                    { token: 'comment.block', foreground: '6A9955', fontStyle: 'italic' },
                    
                    // Keywords - blue
                    { token: 'keyword', foreground: '569CD6' },
                    { token: 'keyword.control', foreground: 'C586C0' },
                    { token: 'storage.type', foreground: '569CD6' },
                    
                    // Strings - orange
                    { token: 'string', foreground: 'CE9178' },
                    { token: 'string.quoted', foreground: 'CE9178' },
                    
                    // Numbers - light green
                    { token: 'number', foreground: 'B5CEA8' },
                    { token: 'constant.numeric', foreground: 'B5CEA8' },
                    
                    // Variables - light blue
                    { token: 'variable', foreground: '9CDCFE' },
                    { token: 'identifier', foreground: '9CDCFE' },
                    { token: 'variable.other', foreground: '9CDCFE' },
                    
                    // Functions - yellow
                    { token: 'entity.name.function', foreground: 'DCDCAA' },
                    { token: 'support.function', foreground: 'DCDCAA' },
                    { token: 'meta.function-call', foreground: 'DCDCAA' },
                    { token: 'variable.function', foreground: 'DCDCAA' },
                    
                    // Types and classes - teal
                    { token: 'entity.name.type', foreground: '4EC9B0' },
                    { token: 'entity.name.class', foreground: '4EC9B0' },
                    { token: 'support.type', foreground: '4EC9B0' },
                    { token: 'support.class', foreground: '4EC9B0' },
                    
                    // Object properties - light blue
                    { token: 'variable.other.property', foreground: '9CDCFE' },
                    { token: 'support.variable.property', foreground: '9CDCFE' },
                    
                    // Constants - blue
                    { token: 'constant.language', foreground: '569CD6' },
                    { token: 'constant.language.boolean', foreground: '569CD6' },
                    { token: 'constant.language.null', foreground: '569CD6' },
                    
                    // Operators - white
                    { token: 'operator', foreground: 'D4D4D4' },
                    { token: 'punctuation', foreground: 'D4D4D4' },
                    { token: 'delimiter', foreground: 'D4D4D4' },
                    
                    // Invalid - red
                    { token: 'invalid', foreground: 'F44747' }
                ],
                colors: {
                    'editor.background': '#1E1E1E',
                    'editor.foreground': '#D4D4D4',
                    'editorCursor.foreground': '#AEAFAD',
                    'editor.lineHighlightBackground': '#2A2D2E',
                    'editorLineNumber.foreground': '#858585',
                    'editor.selectionBackground': '#264F78',
                    'editorWidget.background': '#252526',
                    'editorWidget.border': '#454545',
                    'editorSuggestWidget.background': '#252526',
                    'editorSuggestWidget.selectedBackground': '#062F4A',
                    'editorHoverWidget.background': '#252526',
                    'scrollbarSlider.background': '#79797966',
                    'scrollbarSlider.hoverBackground': '#646464B3',
                    'scrollbarSlider.activeBackground': '#BFBFBF66'
                }
            });

            // VS Code-like font styling
            const style = document.createElement('style');
            style.textContent = `
                .monaco-editor {
                    font-family: 'Consolas', 'Courier New', Monaco, monospace !important;
                    font-size: 14px !important;
                }
                .monaco-editor .view-line span {
                    font-weight: normal !important;
                }
            `;
            document.head.appendChild(style);
            
            monacoEditor = monaco.editor.create(editorContainer, {
                value: `/* Welcome to Bloxd Codium v1.0! */`,
                language: 'javascript',
                theme: 'bloxd-colorful',  // Use the first defined theme
                automaticLayout: true,
                fontSize: 14,
                fontFamily: 'Consolas, "Courier New", Monaco, monospace',
                fontLigatures: true,
                lineNumbers: 'on',
                lineNumbersMinChars: 4,
                lineDecorationsWidth: 10,
                lineHeight: 20,
                letterSpacing: 0.5,
                minimap: {
                    enabled: true,
                    side: 'right',  // Explicitly position minimap on the right
                    showSlider: 'always',
                    renderCharacters: true,
                    maxColumn: 120
                },
                scrollBeyondLastLine: false,
                wordWrap: 'off',  // Turn off word wrapping to show horizontal scrollbar
                wordWrapColumn: 120,
                wrappingIndent: 'indent',
                folding: true,
                foldingStrategy: 'indentation',
                showFoldingControls: 'always',
                contextmenu: true,
                selectOnLineNumbers: true,
                roundedSelection: false,
                readOnly: false,
                cursorBlinking: 'blink',
                cursorSmoothCaretAnimation: true,
                cursorWidth: 2,
                mouseWheelZoom: true,
                smoothScrolling: true,
                bracketPairColorization: {
                    enabled: true,
                    independentColorPoolPerBracketType: true
                },
                guides: {
                    bracketPairs: true,
                    bracketPairsHorizontal: true,
                    highlightActiveBracketPair: true,
                    indentation: true,
                    highlightActiveIndentation: true
                },
                renderWhitespace: 'selection',
                renderControlCharacters: true,
                renderLineHighlight: 'line',
                renderLineHighlightOnlyWhenFocus: false,
                occurrencesHighlight: true,
                selectionHighlight: true,
                codeLens: true,
                colorDecorators: true,
                lightbulb: {
                    enabled: true
                },
                links: true,
                scrollbar: {
                    verticalScrollbarSize: 20,
                    horizontalScrollbarSize: 20,
                    arrowSize: 15,
                    useShadows: true,
                    verticalHasArrows: false,
                    horizontalHasArrows: false,
                    handleMouseWheel: true,
                    vertical: 'visible',
                    horizontal: 'visible',
                    fadeScrollbars: false
                },
                overviewRulerBorder: true,
                overviewRulerLanes: 3,
                hideCursorInOverviewRuler: false,
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: 'on',
                acceptSuggestionOnCommitCharacter: true,
                tabCompletion: 'on',
                wordBasedSuggestions: true,
                wordBasedSuggestionsOnlySameLanguage: false,
                semanticHighlighting: {
                    enabled: true
                },
                quickSuggestions: {
                    other: true,
                    comments: false,
                    strings: false
                },
                quickSuggestionsDelay: 10,
                parameterHints: {
                    enabled: true,
                    cycle: true
                },
                autoClosingBrackets: 'always',
                autoClosingQuotes: 'always',
                autoClosingDelete: 'always',
                autoClosingOvertype: 'always',
                autoSurround: 'languageDefined',
                autoIndent: 'full',
                formatOnType: true,
                formatOnPaste: true,
                dragAndDrop: true,
                copyWithSyntaxHighlighting: true,
                suggest: {
                    showKeywords: true,
                    showSnippets: true,
                    showClasses: true,
                    showFunctions: true,
                    showVariables: true,
                    showInterfaces: true,
                    showModules: true,
                    showProperties: true,
                    insertMode: 'insert',
                    filterGraceful: true,
                    localityBonus: true,
                    maxVisibleSuggestions: 8
                },
                hover: {
                    enabled: true,
                    delay: 300,
                    sticky: true
                },
                matchBrackets: 'always',
                find: {
                    cursorMoveOnType: true,
                    seedSearchStringFromSelection: 'always',
                    autoFindInSelection: 'multiline',
                    addExtraSpaceOnTop: true,
                    loop: true
                },
                gotoLocation: {
                    multipleTypeDefinitions: 'peek',
                    multipleDeclarations: 'peek',
                    multipleImplementations: 'peek',
                    multipleReferences: 'peek'
                },
                definitionLinkOpensInPeek: false,
                showUnused: true,
                showDeprecated: true,
                inlayHints: {
                    enabled: 'on'
                },
                stickyScroll: {
                    enabled: true
                },
                fixedOverflowWidgets: true,
                peekWidgetDefaultFocus: 'editor',
                accessibilitySupport: 'auto',
                tabFocusMode: false,
                experimentalWhitespaceRendering: 'off'
            });
            


            // Set the theme (use the main theme, no need for separate semantic theme)
            monaco.editor.setTheme('bloxd-colorful');
            
            // Force apply custom scrollbar styles after Monaco has loaded
            function forceScrollbarStyles() {
                // Create a new style element with very high specificity
                const scrollbarStyle = document.createElement('style');
                scrollbarStyle.id = 'monaco-scrollbar-override';
                scrollbarStyle.textContent = `
                    /* Force custom scrollbar styles with maximum specificity */
                    .monaco-editor .monaco-scrollable-element > .scrollbar > .slider,
                    .monaco-editor .monaco-scrollable-element > .scrollbar > .slider:hover,
                    .monaco-editor .monaco-scrollable-element > .scrollbar > .slider.active,
                    .monaco-editor .monaco-scrollable-element > .scrollbar > .slider[style] {
                        background: linear-gradient(45deg, #00FFFF, #0080FF) !important;
                        box-shadow: 0 0 10px rgba(0, 255, 255, 0.6) !important;
                    }
                    
                    .monaco-editor .monaco-scrollable-element > .scrollbar > .slider:hover[style] {
                        background: linear-gradient(45deg, #40FFFF, #20A0FF) !important;
                        box-shadow: 0 0 15px rgba(0, 255, 255, 0.8) !important;
                    }
                    
                    /* Force scrollbar track styles */
                    .monaco-editor .monaco-scrollable-element > .scrollbar,
                    .monaco-editor .monaco-scrollable-element > .scrollbar[style] {
                        background: rgba(0, 30, 60, 1) !important;
                        opacity: 1 !important;
                        visibility: visible !important;
                    }
                    
                    .monaco-editor .monaco-scrollable-element > .scrollbar.vertical,
                    .monaco-editor .monaco-scrollable-element > .scrollbar.vertical[style] {
                        width: 20px !important;
                        background: rgba(0, 30, 60, 1) !important;
                    }
                    
                    .monaco-editor .monaco-scrollable-element > .scrollbar.horizontal,
                    .monaco-editor .monaco-scrollable-element > .scrollbar.horizontal[style] {
                        height: 20px !important;
                        background: rgba(0, 30, 60, 1) !important;
                    }
                    
                    /* Disable fade animations */
                    .monaco-editor .monaco-scrollable-element > .scrollbar.fade,
                    .monaco-editor .monaco-scrollable-element > .scrollbar.fade[style] {
                        opacity: 1 !important;
                        visibility: visible !important;
                        transition: none !important;
                    }
                    
                    /* Hide scrollbars in popup widgets */
                    .suggest-widget .monaco-scrollable-element > .scrollbar,
                    .hover-contents .monaco-scrollable-element > .scrollbar,
                    .parameter-hints-widget .monaco-scrollable-element > .scrollbar,
                    .context-view .monaco-scrollable-element > .scrollbar,
                    .monaco-menu .monaco-scrollable-element > .scrollbar,
                    .quick-input-widget .monaco-scrollable-element > .scrollbar,
                    .monaco-hover .monaco-scrollable-element > .scrollbar,
                    .editor-widget .monaco-scrollable-element > .scrollbar,
                    .suggest-widget .monaco-scrollable-element > .scrollbar
                `;
                
                // Remove existing override if present
                const existing = document.getElementById('monaco-scrollbar-override');
                if (existing) {
                    existing.remove();
                }
                
                // Add the new style element
                document.head.appendChild(scrollbarStyle);
                
                // Also apply styles directly to existing scrollbar elements
                const scrollbars = document.querySelectorAll('.monaco-editor .monaco-scrollable-element > .scrollbar');
                scrollbars.forEach(scrollbar => {
                    scrollbar.style.setProperty('background', 'rgba(0, 30, 60, 1)', 'important');
                    scrollbar.style.setProperty('opacity', '1', 'important');
                    scrollbar.style.setProperty('visibility', 'visible', 'important');
                    
                    const slider = scrollbar.querySelector('.slider');
                    if (slider) {
                        slider.style.setProperty('background', 'linear-gradient(45deg, #00FFFF, #0080FF)', 'important');
                        slider.style.setProperty('box-shadow', '0 0 10px rgba(0, 255, 255, 0.6)', 'important');
                    }
                });
                
                // Hide scrollbars in popup widgets
                const popupScrollbars = document.querySelectorAll(`
                    .suggest-widget .monaco-scrollable-element > .scrollbar,
                    .hover-contents .monaco-scrollable-element > .scrollbar,
                    .parameter-hints-widget .monaco-scrollable-element > .scrollbar,
                    .context-view .monaco-scrollable-element > .scrollbar,
                    .monaco-menu .monaco-scrollable-element > .scrollbar,
                    .quick-input-widget .monaco-scrollable-element > .scrollbar,
                    .monaco-hover .monaco-scrollable-element > .scrollbar,
                    .editor-widget .monaco-scrollable-element > .scrollbar,
                    .suggest-widget .monaco-scrollable-element > .scrollbar
                `);
                popupScrollbars.forEach(scrollbar => {
                    scrollbar.style.setProperty('display', 'none', 'important');
                    scrollbar.style.setProperty('width', '0', 'important');
                    scrollbar.style.setProperty('height', '0', 'important');
                    scrollbar.style.setProperty('opacity', '0', 'important');
                    scrollbar.style.setProperty('visibility', 'hidden', 'important');
                });

                // Also hide scrollbars in problems/markers panels (problems view)
                try {
                    const problemSelectors = [
                        '.markers-panel .monaco-scrollable-element > .scrollbar',
                        '.problems-panel .monaco-scrollable-element > .scrollbar',
                        '.marker-widget .monaco-scrollable-element > .scrollbar',
                        '.problems-view .monaco-scrollable-element > .scrollbar'
                    ].join(',');

                    const problemScrollbars = document.querySelectorAll(problemSelectors);
                    problemScrollbars.forEach(sb => {
                        sb.style.setProperty('display', 'none', 'important');
                        sb.style.setProperty('width', '0', 'important');
                        sb.style.setProperty('height', '0', 'important');
                        sb.style.setProperty('opacity', '0', 'important');
                        sb.style.setProperty('visibility', 'hidden', 'important');
                    });
                } catch (e) {
                    // ignore
                }
            }
            
            // Apply styles immediately and after layout
            setTimeout(forceScrollbarStyles, 100);
            setTimeout(forceScrollbarStyles, 500);
            setTimeout(forceScrollbarStyles, 1000);
            
            // Set up MutationObserver to catch Monaco's dynamic scrollbar changes
            const observeScrollbars = () => {
                const editorElement = document.querySelector('.monaco-editor');
                if (editorElement) {
                    const observer = new MutationObserver((mutations) => {
                        let shouldApplyStyles = false;
                        
                        mutations.forEach((mutation) => {
                            // Check if scrollbar-related elements were added or modified
                            if (mutation.type === 'childList') {
                                mutation.addedNodes.forEach((node) => {
                                    if (node.nodeType === Node.ELEMENT_NODE) {
                                        if (node.classList && (node.classList.contains('scrollbar') || 
                                            node.classList.contains('monaco-scrollable-element') ||
                                            node.classList.contains('suggest-widget') ||
                                            node.classList.contains('hover-contents') ||
                                            node.classList.contains('parameter-hints-widget') ||
                                            node.classList.contains('context-view') ||
                                            node.classList.contains('monaco-menu') ||
                                            node.classList.contains('quick-input-widget') ||
                                            node.classList.contains('monaco-hover') ||
                                            node.classList.contains('editor-widget') ||
                                            node.querySelector && (node.querySelector('.scrollbar') || 
                                                node.querySelector('.suggest-widget') ||
                                                node.querySelector('.hover-contents') ||
                                                node.querySelector('.parameter-hints-widget')))) {
                                            shouldApplyStyles = true;
                                        }
                                    }
                                });
                            }
                            
                            // Check if style attributes were modified on scrollbar elements
                            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                                const target = mutation.target;
                                if (target.classList && (target.classList.contains('scrollbar') || 
                                    target.classList.contains('slider'))) {
                                    shouldApplyStyles = true;
                                }
                            }
                        });
                        
                        if (shouldApplyStyles) {
                            setTimeout(forceScrollbarStyles, 50);
                        }
                    });
                    
                    // Observe the editor container and its children
                    observer.observe(editorElement, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeFilter: ['style']
                    });
                    
                    // Also observe document body for popup widgets that are added there
                    const bodyObserver = new MutationObserver((mutations) => {
                        let shouldApplyStyles = false;
                        
                        mutations.forEach((mutation) => {
                            if (mutation.type === 'childList') {
                                mutation.addedNodes.forEach((node) => {
                                    if (node.nodeType === Node.ELEMENT_NODE) {
                                        if (node.classList && (
                                            node.classList.contains('suggest-widget') ||
                                            node.classList.contains('hover-contents') ||
                                            node.classList.contains('parameter-hints-widget') ||
                                            node.classList.contains('context-view') ||
                                            node.classList.contains('monaco-menu') ||
                                            node.classList.contains('quick-input-widget') ||
                                            node.classList.contains('monaco-hover') ||
                                            node.classList.contains('editor-widget'))) {
                                            shouldApplyStyles = true;
                                        }
                                    }
                                });
                            }
                        });
                        
                        if (shouldApplyStyles) {
                            setTimeout(forceScrollbarStyles, 10);
                        }
                    });
                    
                    bodyObserver.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                    
                    // Store observer references for cleanup if needed
                    window.scrollbarObserver = observer;
                    window.popupObserver = bodyObserver;
                }
            };
            
            // Start observing after initial setup
            setTimeout(observeScrollbars, 200);
            
            // Listen for content changes
            monacoEditor.onDidChangeModelContent(() => {
                isModified = true;
                updateTitle();
            });

            // Linter integration: debounce and map results to Monaco markers (supports async linters)
            (function() {
                const lintDebounceMs = 300;
                let lintTimer = null;

                function toMarkerSeverity(sev) {
                    if (!sev) return monaco.MarkerSeverity.Info;
                    if (typeof sev === 'number') return sev; // already a Monaco severity
                    const s = String(sev).toLowerCase();
                    if (s === 'error' || s === 'err') return monaco.MarkerSeverity.Error;
                    if (s === 'warning' || s === 'warn') return monaco.MarkerSeverity.Warning;
                    if (s === 'info' || s === 'information') return monaco.MarkerSeverity.Info;
                    if (s === 'note' || s === 'hint') return monaco.MarkerSeverity.Hint;
                }

                // Normalize a single linter result into a standard object
                function normalizeResult(r) {
                    if (!r) return null;
                    // Common aliases
                    const message = r.message || r.msg || r.text || r.description || '';
                    const severity = r.severity || r.level || r.type || null;

                    // Range: try several patterns
                    let startLine = null, startCol = null, endLine = null, endCol = null;
                    if (r.range) {
                        // { start:{line,column}, end:{line,column} } or array
                        const range = r.range;
                        if (Array.isArray(range) && range.length >= 2) {
                            const [s, e] = range;
                            startLine = s.line || s.lineNumber || s.ln || s[0] || null;
                            startCol = s.column || s.col || s[1] || null;
                            endLine = e.line || e.lineNumber || e.ln || e[0] || startLine;
                            endCol = e.column || e.col || e[1] || null;
                        } else if (range.start && range.end) {
                            startLine = range.start.line || range.start.lineNumber || null;
                            startCol = range.start.column || range.start.col || null;
                            endLine = range.end.line || range.end.lineNumber || null;
                            endCol = range.end.column || range.end.col || null;
                        }
                    }

                    // Legacy single-line/column fields
                    startLine = startLine || r.startLine || r.line || r.ln || null;
                    startCol = startCol || r.startColumn || r.column || r.col || null;
                    endLine = endLine || r.endLine || r.endLineNumber || r.el || startLine;
                    endCol = endCol || r.endColumn || r.endColumnNumber || r.ec || (startCol ? startCol + 1 : null);

                    return {
                        message,
                        severity,
                        startLine: Number.isFinite(startLine) ? startLine : null,
                        startCol: Number.isFinite(startCol) ? startCol : null,
                        endLine: Number.isFinite(endLine) ? endLine : null,
                        endCol: Number.isFinite(endCol) ? endCol : null,
                        source: r.source || r.ruleId || r.code || 'linter'
                    };
                }

                async function runLinterOnce() {
                    try {
                        const model = monacoEditor && monacoEditor.getModel ? monacoEditor.getModel() : null;
                        if (!model) return;
                        if (!linter || typeof linter.lint !== 'function') {
                            // clear existing markers if linter not available
                            monaco.editor.setModelMarkers(model, 'bloxd-linter', []);
                            return;
                        }

                        const text = model.getValue();
                        let results = null;
                        try {
                            results = linter.lint(text);
                            // support Promise-based linters
                            if (results && typeof results.then === 'function') {
                                results = await results;
                            }
                        } catch (innerErr) {
                            console.error('Linter.lint threw', innerErr);
                            results = [];
                        }

                        if (!results) results = [];
                        if (!Array.isArray(results)) {
                            // try wrapping if single object
                            if (typeof results === 'object') results = [results];
                            else results = [];
                        }

                        // Debug: log raw results when in dev
                        if (results.length > 0) {
                            try { console.debug('Linter results sample:', results.slice(0,5)); } catch(e){}
                        }

                        const markers = [];
                        for (const raw of results) {
                            const r = normalizeResult(raw);
                            if (!r) continue;

                            const startLineNumber = r.startLine || 1;
                            const startColumn = r.startCol || 1;
                            const endLineNumber = r.endLine || startLineNumber;
                            const endColumn = r.endCol || (startColumn + 1);

                            markers.push({
                                severity: toMarkerSeverity(r.severity),
                                message: r.message || 'Linter issue',
                                startLineNumber: Math.max(1, startLineNumber),
                                startColumn: Math.max(1, startColumn),
                                endLineNumber: Math.max(1, endLineNumber),
                                endColumn: Math.max(1, endColumn),
                                source: r.source || 'linter'
                            });
                        }

                        monaco.editor.setModelMarkers(model, 'bloxd-linter', markers);
                    } catch (e) {
                        console.error('Linter run failed', e);
                    }
                }

                function scheduleLint() {
                    if (lintTimer) clearTimeout(lintTimer);
                    lintTimer = setTimeout(runLinterOnce, lintDebounceMs);
                }

                // Run linter on content changes
                monacoEditor.onDidChangeModelContent(() => {
                    scheduleLint();
                });

                // Run when model changes (file opened)
                monacoEditor.onDidChangeModel(() => {
                    scheduleLint();
                });

                // Initial lint after creation
                setTimeout(scheduleLint, 150);
            })();
            
            // Basic scrollbar style switching (no persistence logic)
            setTimeout(() => {
                if (monacoEditor) {
                    monacoEditor.layout();
                    
                    const editorElement = document.querySelector('.monaco-editor');
                    if (editorElement) {
                        // Simple style switcher
                        window.setScrollbarStyle = function(style) {
                            editorElement.classList.remove('neon-scrollbar', 'minimal-scrollbar', 'vscode-scrollbar');
                            
                            switch(style) {
                                case 'neon':
                                    editorElement.classList.add('neon-scrollbar');
                                    break;
                                case 'minimal':
                                    editorElement.classList.add('minimal-scrollbar');
                                    break;
                                case 'vscode':
                                    editorElement.classList.add('vscode-scrollbar');
                                    break;
                            }
                        };
                        
                        // Console commands
                        window.useNeonScrollbar = () => window.setScrollbarStyle('neon');
                        window.useVSCodeScrollbar = () => window.setScrollbarStyle('vscode');
                        window.useMinimalScrollbar = () => window.setScrollbarStyle('minimal');
                        
                        // Set neon as default
                        window.setScrollbarStyle('neon');
                        
                        console.log('🎨 Basic scrollbar styles: useNeonScrollbar(), useVSCodeScrollbar(), useMinimalScrollbar()');
                    }
                }
            }, 100);
            
            // Setup file operations
            setupFileOperations();
            
        } catch (error) {
            createFallbackEditor();
        }
    }

    function createFallbackEditor() {
        const editorContainer = document.getElementById('editor');
        editorContainer.innerHTML = `
            <div style="height: 100%; display: flex; flex-direction: column; background: #1e1e1e;">
                <div style="background: #2d2d30; color: #cccccc; padding: 8px; font-size: 12px; border-bottom: 1px solid #3e3e42; display: flex; align-items: center;">
                    <span style="color: #f48771; margin-right: 8px;">⚠️</span>
                    <span>Monaco Editor failed to load - Using enhanced fallback editor</span>
                    <span style="margin-left: auto; font-size: 10px; opacity: 0.7;">Press Ctrl+S to save</span>
                </div>
                <div style="flex: 1; position: relative;">
                    <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 40px; background: #1e1e1e; border-right: 1px solid #3e3e42; color: #858585; font-family: monospace; font-size: 12px; padding: 8px 4px; user-select: none;" id="line-numbers"></div>
                    <textarea 
                        id="fallback-editor" 
                        style="position: absolute; left: 41px; top: 0; right: 0; bottom: 0; 
                               background: #1e1e1e; color: #d4d4d4; 
                               font-family: Consolas, 'Courier New', monospace; font-size: 14px; 
                               border: none; outline: none; resize: none; padding: 8px; 
                               box-sizing: border-box; line-height: 1.5; tab-size: 4;"
                        spellcheck="false"
                    >// Welcome to Bloxd Codium v1.0!
// Enhanced Fallback Editor

function greetUser(name) {
    console.log("Hello, " + name + "!");
    console.log("Welcome to Bloxd Codium!");
    return "Greeting sent to " + name;
}

// Start coding your Bloxd game here!
class BloxdGame {
    constructor() {
        this.player = { name: "Player1", score: 0 };
        this.initialize();
    }
    
    initialize() {
        console.log("Game initialized!");
    }
}

const game = new BloxdGame();
greetUser("Developer");

// Your code goes here...
</textarea>
                </div>
            </div>
        `;

        // Add line numbers to fallback editor
        const textarea = document.getElementById('fallback-editor');
        const lineNumbers = document.getElementById('line-numbers');
        
        function updateLineNumbers() {
            const lines = textarea.value.split('\n').length;
            lineNumbers.innerHTML = Array.from({length: lines}, (_, i) => i + 1).join('\n');
        }
        
        textarea.addEventListener('input', () => {
            isModified = true;
            updateTitle();
            updateLineNumbers();
        });
        
        textarea.addEventListener('scroll', () => {
            lineNumbers.scrollTop = textarea.scrollTop;
        });
        
        // Initial line numbers
        updateLineNumbers();
    }

    function setupFileOperations() {
        try {
            const { dialog } = require('@electron/remote');

            function getEditorContent() {
                if (monacoEditor) {
                    return monacoEditor.getValue();
                } else {
                    const fallback = document.getElementById('fallback-editor');
                    return fallback ? fallback.value : '';
                }
            }

            function setEditorContent(content) {
                if (monacoEditor) {
                    monacoEditor.setValue(content);
                } else {
                    const fallback = document.getElementById('fallback-editor');
                    if (fallback) {
                        fallback.value = content;
                        // Update line numbers if using fallback
                        const event = new Event('input');
                        fallback.dispatchEvent(event);
                    }
                }
            }

            function setEditorContent(content) {
                if (monacoEditor) {
                    monacoEditor.setValue(content);
                } else {
                    const fallback = document.getElementById('fallback-editor');
                    if (fallback) {
                        fallback.value = content;
                        // Update line numbers if using fallback
                        const event = new Event('input');
                        fallback.dispatchEvent(event);
                    }
                }
            }
            // Edit operations (Monaco only)
            document.getElementById('undo')?.addEventListener('click', () => {
                if (monacoEditor) {
                    monacoEditor.trigger('keyboard', 'undo', null);
                }
            });

            document.getElementById('redo')?.addEventListener('click', () => {
                if (monacoEditor) {
                    monacoEditor.trigger('keyboard', 'redo', null);
                }
            });

            document.getElementById('find')?.addEventListener('click', () => {
                if (monacoEditor) {
                    monacoEditor.trigger('keyboard', 'actions.find', null);
                }
            });

            document.getElementById('replace')?.addEventListener('click', () => {
                if (monacoEditor) {
                    monacoEditor.trigger('keyboard', 'editor.action.startFindReplaceAction', null);
                }
            });

        } catch (error) {
            // Silent error handling
        }
    }

    function getLanguageFromExtension(ext) {
        const languages = {
            'js': 'javascript', 'jsx': 'javascript',
            'ts': 'typescript', 'tsx': 'typescript',
            'html': 'html', 'htm': 'html',
            'css': 'css', 'scss': 'scss',
            'json': 'json', 'md': 'markdown',
            'py': 'python', 'xml': 'xml',
            'yaml': 'yaml', 'yml': 'yaml'
        };
        return languages[ext] || 'plaintext';
    }

    // Update the window/app title and header title element
    function updateTitle() {
        try {
            const base = 'Bloxd Codium v1.0';
            const fileName = currentFile ? path.basename(currentFile) : 'Untitled';
            const modifiedMark = isModified ? '*' : '';
            const full = `${fileName}${modifiedMark} - ${base}`;

            const titleEl = document.getElementById('app-title');
            if (titleEl) titleEl.textContent = full;
            if (typeof document !== 'undefined') document.title = full;
        } catch (err) {
            // Fail silently if DOM not available
        }
    }

    function updateMaximizeIcon(isMaximized) {
        const maxBtn = document.getElementById("max-btn");
        const icon = maxBtn?.querySelector('i');
        if (icon) {
            icon.className = isMaximized ? 'fas fa-window-restore' : 'fas fa-window-maximize';
            maxBtn.title = isMaximized ? 'Restore' : 'Maximize';
        }
    }

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

    // Sidebar button handlers: toggle .active and ensure editor layout
    function setupSidebarButtons() {
        try {
            const container = document.getElementById('btn-sidebar');
            if (!container) return;
            const buttons = Array.from(container.querySelectorAll('a'));
            buttons.forEach(a => {
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    buttons.forEach(x => x.classList.remove('active'));
                    a.classList.add('active');

                    // Basic behavior: ensure editor is visible and layout
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

    // Splitter logic for resizing sidebar/editor
    function setupSplitter() {
        try {
            const splitter = document.getElementById('splitter');
            const sidebar = document.getElementById('sidebar');
            const editorEl = document.getElementById('editor');
            if (!splitter || !sidebar || !editorEl) return;

            // restore saved width
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
                const editorMin = 200; // matches CSS min-width for editor
                const maxAllowed = Math.min(800, containerRect.width - editorMin - 1); // leave space for splitter
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

    function setupResizeHandler() {
        window.addEventListener('resize', () => {
            if (monacoEditor) {
                setTimeout(() => monacoEditor.layout(), 50);
            }
        });
    }

    // Collapsible editor state and helpers
    const savedEditorState = {
        content: null,
        language: 'javascript',
        viewState: null,
        isCollapsed: false
    };

    function readEditorContent() {
        try {
            if (monacoEditor) return monacoEditor.getValue();
            const fb = document.getElementById('fallback-editor');
            return fb ? fb.value : '';
        } catch (e) {
            return '';
        }
    }

    function collapseEditor() {
        if (savedEditorState.isCollapsed) return;
        const editorContainer = document.getElementById('editor');

        // Save current content and view state
        try { savedEditorState.content = readEditorContent(); } catch (e) { savedEditorState.content = null; }
        if (monacoEditor) {
            try { savedEditorState.viewState = monacoEditor.saveViewState(); } catch (e) { savedEditorState.viewState = null; }
            try { savedEditorState.language = monacoEditor.getModel().getLanguageIdentifier().language; } catch (e) { /* ignore */ }
            try { monacoEditor.dispose(); } catch (e) { /* ignore */ }
            monacoEditor = null;
        }

        if (editorContainer) {
            // hide the whole editor container to avoid leftover canvas/background
            editorContainer.style.display = 'none';
            editorContainer.classList.add('editor-collapsed');
        }

        savedEditorState.isCollapsed = true;
    }

    function expandEditor() {
        if (!savedEditorState.isCollapsed) return;
        const editorContainer = document.getElementById('editor');

        if (editorContainer) {
            editorContainer.style.display = '';
            editorContainer.classList.remove('editor-collapsed');
        }

        // recreate editor using existing createEditor() logic
        try {
            createEditor();
            if (monacoEditor && savedEditorState.content != null) {
                const model = monacoEditor.getModel();
                if (model) model.setValue(savedEditorState.content);
                try { if (savedEditorState.viewState) monacoEditor.restoreViewState(savedEditorState.viewState); } catch (e) { /* ignore */ }
                monacoEditor.focus();
                setTimeout(() => monacoEditor.layout && monacoEditor.layout(), 50);
            }
        } catch (e) {
            // fallback: if createEditor fails, show a simple textarea
            createFallbackEditor();
        }

        savedEditorState.isCollapsed = false;
    }

    function toggleEditor() {
        if (savedEditorState.isCollapsed) expandEditor(); else collapseEditor();
    }

    function ensureEditorToggleButton() {
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
                toggleEditor();
                btn.textContent = savedEditorState.isCollapsed ? 'Show Editor' : 'Hide Editor';
                setTimeout(() => { if (monacoEditor) try { monacoEditor.layout(); } catch (e) {} }, 120);
            });
            header.appendChild(btn);
        }
    }

    const projectCreationBtn = document.getElementById('new-project');
    projectCreationBtn?.addEventListener('click', (e) => {
        e?.preventDefault();
        // Use a clear IPC channel; main process can decide how to show/create the modal
        ipcRenderer.send('show-project-creation');
    });

    try {
        setupWindowControls();
        setupDropdowns();
        setupResizeHandler();
        ensureEditorToggleButton();
        setupSidebarButtons();
        setupSplitter();
        initializeMonacoEditor();
        updateTitle();
    } catch (e) {
        // Fail silently in case functions are not available
        console.error('Initialization error:', e);
    }

})();
