/**
 * Directory AGENTS.md Injector Hook
 */
export function createDirectoryAgentsInjectorHook(context) {
    return {
        name: 'directory-agents-injector',
        event: 'chat.message',
        description: 'Injects the current directory\'s AGENTS.md into context.',
        enabled: true,
        priority: 15,
        handler: async () => ({ continue: true }),
    };
}
