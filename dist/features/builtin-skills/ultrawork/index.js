/**
 * Ultrawork Skill - Parallel Execution Mode
 */
import { activateUltrawork } from '../../session-state';
export function createUltraworkSkill(context) {
    return {
        name: 'ultrawork',
        displayName: 'Ultrawork',
        description: 'Activates parallel execution mode to run multiple agents simultaneously.',
        triggers: ['ulw', 'ultrawork', 'parallel', 'fast'],
        autoActivate: true,
        handler: async ({ args, sessionState }) => {
            activateUltrawork(sessionState);
            return {
                success: true,
                output: `🚀 **Ultrawork Mode Activated**

Parallel execution mode is now active.

## Activated Features
- Multiple agents running simultaneously
- Automatic background task utilization
- Parallel processing of independent tasks

## How to Use
Independent tasks are automatically executed in parallel.
Tasks with sequential dependencies are executed in order.

Maximum concurrent agents: ${context.settings.maxConcurrentAgents}

To deactivate Ultrawork, use \`/cancel-ultrawork\`.`,
                inject: `<ultrawork-mode>
Ultrawork mode is activated.
Process parallelizable tasks concurrently.
Maximum concurrent agents: ${context.settings.maxConcurrentAgents}
</ultrawork-mode>`,
            };
        },
    };
}
