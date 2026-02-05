/**
 * ast_grep - AST-based code search
 */
export function createAstGrepTool(context) {
    return {
        name: 'ast_grep',
        description: 'Search code patterns based on AST (Abstract Syntax Tree). Useful for precise code structure matching.',
        parameters: [
            {
                name: 'pattern',
                type: 'string',
                description: 'AST pattern to search',
                required: true,
            },
            {
                name: 'language',
                type: 'string',
                description: 'Target language (typescript, javascript, python, etc.)',
                required: true,
            },
            {
                name: 'path',
                type: 'string',
                description: 'Path to search',
                required: false,
                default: '.',
            },
        ],
        handler: async (params) => {
            const pattern = params.pattern;
            const language = params.language;
            const path = params.path;
            return {
                success: true,
                output: {
                    pattern,
                    language,
                    path,
                    instruction: `Use ast-grep CLI: sg --pattern "${pattern}" --lang ${language} ${path}`,
                },
            };
        },
    };
}
