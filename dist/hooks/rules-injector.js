/**
 * Rules Injector Hook
 */
export function createRulesInjectorHook(context) {
    return {
        name: 'rules-injector',
        event: 'chat.message',
        description: 'Injects Team-Shinchan rules into context.',
        enabled: true,
        priority: 20,
        handler: async () => ({ continue: true }),
    };
}
