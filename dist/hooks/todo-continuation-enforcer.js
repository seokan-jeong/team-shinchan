/**
 * TODO Continuation Enforcer Hook
 * Prevents session termination when pending TODOs exist
 */
import { hasPendingOrInProgressTodos, getInProgressTodo, getTodosByStatus } from '../features/session-state';
export function createTodoContinuationEnforcerHook(context) {
    let retryCount = 0;
    const maxRetries = context.settings.maxRetries;
    return {
        name: 'todo-continuation-enforcer',
        event: 'Stop',
        description: 'Prevents session termination when TODOs are incomplete.',
        enabled: true,
        priority: 100, // High priority
        handler: async (hookContext) => {
            const state = context.sessionState;
            // Check for incomplete TODOs
            if (!hasPendingOrInProgressTodos(state)) {
                retryCount = 0;
                return { continue: true };
            }
            const pendingTodos = getTodosByStatus(state, 'pending');
            const inProgressTodo = getInProgressTodo(state);
            // Max retry count exceeded
            if (retryCount >= maxRetries) {
                retryCount = 0;
                return {
                    continue: true,
                    message: `⚠️ Maximum retry count (${maxRetries}) reached. Allowing termination despite incomplete TODOs.`,
                };
            }
            retryCount++;
            // Create incomplete TODO list
            const todoList = [
                ...(inProgressTodo ? [`🔄 In Progress: ${inProgressTodo.content}`] : []),
                ...pendingTodos.map((t) => `⏳ Pending: ${t.content}`),
            ].join('\n');
            return {
                continue: false,
                message: `🚫 **TODO Enforcement**

Cannot terminate due to incomplete tasks. (Attempt ${retryCount}/${maxRetries})

${todoList}

Continue working or explicitly cancel with \`/cancel\`.`,
                inject: `<system-reminder>
Incomplete TODOs exist. Continue working.
${todoList}
</system-reminder>`,
            };
        },
    };
}
