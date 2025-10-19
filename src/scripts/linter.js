// Linter module for Bloxd
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

module.exports = linter;
