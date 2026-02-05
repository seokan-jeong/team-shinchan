/**
 * Ralph Loop Hook
 * Repeats execution until tasks are completed
 */
import { hasPendingOrInProgressTodos } from '../../features/session-state';
export function createRalphLoopHook(context) {
    return {
        name: 'ralph-loop',
        event: 'Stop',
        description: 'Continues execution until task completion when Ralph mode is active.',
        enabled: true,
        priority: 90,
        handler: async (hookContext) => {
            const state = context.sessionState;
            // Pass through if Ralph mode is inactive
            if (!state.ralphLoopActive) {
                return { continue: true };
            }
            // Check for incomplete TODOs
            if (hasPendingOrInProgressTodos(state)) {
                return {
                    continue: false,
                    message: `🔄 **Ralph Loop Active**

Tasks are not yet complete. Continuing.

Use \`/cancel-ralph\` to stop Ralph.`,
                    inject: `<system-reminder>
Ralph Loop is active.
Continue working until all TODOs are complete.
</system-reminder>`,
                };
            }
            // All tasks complete - deactivate Ralph
            state.ralphLoopActive = false;
            return {
                continue: true,
                message: `✅ **Ralph Loop Complete**

All tasks are complete. Exiting Ralph mode.`,
            };
        },
    };
}
