/**
 * Stop Continuation Guard Hook
 * Warns if background tasks are running
 */
import { getRunningBackgroundTasks } from '../features/session-state';
export function createStopContinuationGuardHook(context) {
    return {
        name: 'stop-continuation-guard',
        event: 'Stop',
        description: 'Warns if background tasks are running.',
        enabled: true,
        priority: 85,
        handler: async (hookContext) => {
            const runningTasks = getRunningBackgroundTasks(context.sessionState);
            if (runningTasks.length === 0) {
                return { continue: true };
            }
            const taskList = runningTasks
                .map((t) => `- ${t.agentName}: ${t.description}`)
                .join('\n');
            return {
                continue: true, // Warning only, allow continuation
                message: `⚠️ **Background Tasks Running**

The following background tasks are still running:
${taskList}

Use \`session_manager(action="list_tasks")\` to check results.`,
            };
        },
    };
}
