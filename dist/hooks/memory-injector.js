/**
 * Memory Injector Hook
 * Injects relevant memory before agent execution
 */
import { getCachedAgentContext, contextCache } from '../features/context';
/**
 * Extract agent name
 */
function extractAgentName(subagentType) {
    // team-shinchan:shinnosuke -> shinnosuke
    if (subagentType.startsWith('team-shinchan:')) {
        return subagentType.replace('team-shinchan:', '');
    }
    // Direct agent name
    const validAgents = [
        'jjangu', 'jjanga', 'maenggu', 'cheolsu', 'suji', 'heukgom',
        'hooni', 'shinhyungman', 'yuri', 'bongmisun', 'actiongamen',
        'heendungi', 'chaesunga', 'namiri',
    ];
    if (validAgents.includes(subagentType)) {
        return subagentType;
    }
    return null;
}
export function createMemoryInjectorHook(context) {
    return {
        name: 'memory-injector',
        event: 'PreToolUse',
        description: 'Injects learned memory before agent execution.',
        enabled: true,
        priority: 80,
        handler: async ({ toolName, toolInput, sessionState, }) => {
            // Process Task tool only
            if (toolName !== 'Task') {
                return { continue: true };
            }
            const input = toolInput;
            const subagentType = input.subagent_type;
            const prompt = input.prompt;
            if (!subagentType || !prompt) {
                return { continue: true };
            }
            // Extract agent name
            const agentName = extractAgentName(subagentType);
            if (!agentName) {
                return { continue: true };
            }
            try {
                // Get cached context
                const memoryContext = await getCachedAgentContext(agentName, prompt);
                if (!memoryContext || memoryContext.trim() === '') {
                    return { continue: true };
                }
                // Record last agent in session state
                if (sessionState) {
                    sessionState.lastAgent = agentName;
                    sessionState.taskStartTime = Date.now();
                }
                // Inject memory context via inject
                return {
                    continue: true,
                    inject: memoryContext,
                };
            }
            catch (error) {
                console.error('Memory injection error:', error);
                return { continue: true };
            }
        },
    };
}
/**
 * Memory Initialization Hook at Session Start
 */
export function createMemoryInitHook(pluginContext) {
    return {
        name: 'memory-init',
        event: 'SessionStart',
        description: 'Initializes memory system at session start.',
        enabled: true,
        priority: 100,
        handler: async ({ sessionState }) => {
            try {
                // Initialize cache
                contextCache.invalidate();
                // Bootstrap check (first run)
                const state = sessionState;
                const isFirstRun = !state?.memoryInitialized;
                if (isFirstRun && state) {
                    state.memoryInitialized = true;
                    // Set project analysis flag
                    state.shouldRunBootstrap = true;
                }
                return {
                    continue: true,
                    message: isFirstRun
                        ? '🧠 Memory system initialized'
                        : undefined,
                };
            }
            catch (error) {
                console.error('Memory init error:', error);
                return { continue: true };
            }
        },
    };
}
