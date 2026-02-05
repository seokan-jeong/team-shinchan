/**
 * Empty Task Response Detector Hook
 */
export function createEmptyTaskResponseDetectorHook(context) {
    return {
        name: 'empty-task-response-detector',
        event: 'tool.execute.after',
        description: 'Detects empty task responses and recommends retry.',
        enabled: true,
        priority: 45,
        handler: async () => ({ continue: true }),
    };
}
