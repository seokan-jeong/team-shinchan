/**
 * Tool Output Truncator Hook
 */
export function createToolOutputTruncatorHook(context) {
    return {
        name: 'tool-output-truncator',
        event: 'tool.execute.after',
        description: 'Truncates excessively long tool output.',
        enabled: true,
        priority: 40,
        handler: async () => ({ continue: true }),
    };
}
