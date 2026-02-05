/**
 * session_manager - Session management tool
 */
import { getRunningBackgroundTasks } from '../../features/session-state';
export function createSessionManagerTool(context) {
    return {
        name: 'session_manager',
        description: 'View and manage Team-Seokan session state.',
        parameters: [
            {
                name: 'action',
                type: 'string',
                description: 'Action to perform: status, list_tasks, cancel_task',
                required: true,
            },
            {
                name: 'task_id',
                type: 'string',
                description: 'Task ID (required for cancel_task)',
                required: false,
            },
        ],
        handler: async (params) => {
            const action = params.action;
            const taskId = params.task_id;
            switch (action) {
                case 'status':
                    return {
                        success: true,
                        output: {
                            sessionId: context.sessionState.sessionId,
                            messageCount: context.sessionState.messageCount,
                            activeAgent: context.sessionState.activeAgent,
                            activeSkill: context.sessionState.activeSkill,
                            ralphLoopActive: context.sessionState.ralphLoopActive,
                            ultraworkActive: context.sessionState.ultraworkActive,
                            autopilotActive: context.sessionState.autopilotActive,
                            todoCount: context.sessionState.todos.length,
                            pendingTodos: context.sessionState.todos.filter((t) => t.status === 'pending').length,
                            backgroundTaskCount: getRunningBackgroundTasks(context.sessionState).length,
                        },
                    };
                case 'list_tasks':
                    return {
                        success: true,
                        output: {
                            backgroundTasks: context.sessionState.backgroundTasks,
                            todos: context.sessionState.todos,
                        },
                    };
                case 'cancel_task':
                    if (!taskId) {
                        return {
                            success: false,
                            error: 'task_id is required.',
                        };
                    }
                    const task = context.sessionState.backgroundTasks.find((t) => t.id === taskId);
                    if (task) {
                        task.status = 'failed';
                        task.endTime = new Date();
                    }
                    return {
                        success: true,
                        output: { cancelled: taskId },
                    };
                default:
                    return {
                        success: false,
                        error: `Unknown action: ${action}`,
                    };
            }
        },
    };
}
