/**
 * session_manager - 세션 관리 도구
 */

import type { ToolConfig, PluginContext } from '../../types';
import { getRunningBackgroundTasks } from '../../features/session-state';

export function createSessionManagerTool(context: PluginContext): ToolConfig {
  return {
    name: 'session_manager',
    description: 'Team-Seokan 세션 상태를 조회하고 관리합니다.',

    parameters: [
      {
        name: 'action',
        type: 'string',
        description: '수행할 액션: status, list_tasks, cancel_task',
        required: true,
      },
      {
        name: 'task_id',
        type: 'string',
        description: '작업 ID (cancel_task 시 필요)',
        required: false,
      },
    ],

    handler: async (params) => {
      const action = params.action as string;
      const taskId = params.task_id as string | undefined;

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
              error: 'task_id가 필요합니다.',
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
            error: `알 수 없는 액션: ${action}`,
          };
      }
    },
  };
}
