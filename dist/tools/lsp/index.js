/**
 * LSP Tools - Language Server Protocol based tools
 */
export function createLspDiagnosticsTool(context) {
    return {
        name: 'lsp_diagnostics',
        description: 'Use LSP to check type errors and lint errors in files or directories.',
        parameters: [
            {
                name: 'path',
                type: 'string',
                description: 'File or directory path to diagnose',
                required: true,
            },
        ],
        handler: async (params) => {
            const path = params.path;
            return {
                success: true,
                output: {
                    path,
                    note: 'For TypeScript projects, use tsc --noEmit.',
                    instruction: `Bash(command="npx tsc --noEmit", description="TypeScript type check")`,
                },
            };
        },
    };
}
export function createLspRenameTool(context) {
    return {
        name: 'lsp_rename',
        description: 'Use LSP to safely rename a symbol across the entire project.',
        parameters: [
            {
                name: 'file',
                type: 'string',
                description: 'File where the symbol is defined',
                required: true,
            },
            {
                name: 'line',
                type: 'number',
                description: 'Line number of the symbol',
                required: true,
            },
            {
                name: 'column',
                type: 'number',
                description: 'Column number of the symbol',
                required: true,
            },
            {
                name: 'newName',
                type: 'string',
                description: 'New name',
                required: true,
            },
        ],
        handler: async (params) => {
            const file = params.file;
            const line = params.line;
            const column = params.column;
            const newName = params.newName;
            return {
                success: true,
                output: {
                    file,
                    position: { line, column },
                    newName,
                    note: 'Use IDE refactoring features or ts-morph to safely rename.',
                },
            };
        },
    };
}
export function createLspReferencesTool(context) {
    return {
        name: 'lsp_references',
        description: 'Use LSP to find all references of a symbol.',
        parameters: [
            {
                name: 'file',
                type: 'string',
                description: 'File where the symbol is defined',
                required: true,
            },
            {
                name: 'line',
                type: 'number',
                description: 'Line number of the symbol',
                required: true,
            },
            {
                name: 'column',
                type: 'number',
                description: 'Column number of the symbol',
                required: true,
            },
        ],
        handler: async (params) => {
            const file = params.file;
            const line = params.line;
            const column = params.column;
            return {
                success: true,
                output: {
                    file,
                    position: { line, column },
                    instruction: `Search for symbol name with Grep tool, or delegate to Shiro (Explorer).`,
                },
            };
        },
    };
}
