const { dialog } = require('@electron/remote');

function setupFileOperations(monacoEditor) {
    try {
        function getEditorContent() {
            if (monacoEditor) return monacoEditor.getValue();
            const fallback = document.getElementById('fallback-editor');
            return fallback ? fallback.value : '';
        }

        function setEditorContent(content) {
            if (monacoEditor) {
                monacoEditor.setValue(content);
            } else {
                const fallback = document.getElementById('fallback-editor');
                if (fallback) {
                    fallback.value = content;
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

module.exports = { setupFileOperations, getLanguageFromExtension };
