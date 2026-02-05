/**
 * Edit Error Recovery Hook
 */
export function createEditErrorRecoveryHook(context) {
    return {
        name: 'edit-error-recovery',
        event: 'tool.execute.after',
        description: 'Attempts recovery when edit errors occur.',
        enabled: true,
        priority: 55,
        matchTools: ['Edit'],
        handler: async () => ({ continue: true }),
    };
}
