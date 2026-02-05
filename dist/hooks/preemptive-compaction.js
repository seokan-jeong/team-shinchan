/**
 * Preemptive Compaction Hook
 */
export function createPreemptiveCompactionHook(context) {
    return {
        name: 'preemptive-compaction',
        event: 'chat.message',
        description: 'Suggests preemptive compaction before context is full.',
        enabled: true,
        priority: 50,
        handler: async () => ({ continue: true }),
    };
}
