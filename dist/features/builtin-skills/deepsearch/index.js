/**
 * Deepsearch Skill - Deep Search
 */
export function createDeepsearchSkill(context) {
    return {
        name: 'deepsearch',
        displayName: 'Deepsearch',
        description: 'Deeply explores the codebase.',
        triggers: ['deepsearch', 'deep search', 'find', 'search'],
        autoActivate: true,
        handler: async ({ args, sessionState }) => {
            sessionState.activeSkill = 'deepsearch';
            return {
                success: true,
                output: `🔎 **Deepsearch Mode Activated**

Shiro (Explorer) and Masumi (Librarian) perform deep search together.

## Search Target
${args || 'Please describe what to search for'}

## Search Strategy
1. **Code Exploration**: Shiro explores the codebase
2. **Document Search**: Masumi searches documents/external information
3. **Result Synthesis**: Organize discovered information

Starting parallel search...`,
                inject: `<deepsearch-mode>
Deepsearch mode is activated.
Delegate in parallel to Shiro (Explorer) and Masumi (Librarian).
</deepsearch-mode>`,
            };
        },
    };
}
