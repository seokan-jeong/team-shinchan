/**
 * TODO 강제 실행 훅
 * 미완료 TODO가 있으면 세션 종료를 방지
 */

import type { HookConfig, PluginContext, HookContext, HookResult } from '../types';
import { hasPendingOrInProgressTodos, getInProgressTodo, getTodosByStatus } from '../features/session-state';

export function createTodoContinuationEnforcerHook(context: PluginContext): HookConfig {
  let retryCount = 0;
  const maxRetries = context.settings.maxRetries;

  return {
    name: 'todo-continuation-enforcer',
    event: 'Stop',
    description: 'TODO가 완료되지 않으면 세션 종료를 방지합니다.',
    enabled: true,
    priority: 100, // 높은 우선순위

    handler: async (hookContext: HookContext): Promise<HookResult> => {
      const state = context.sessionState;

      // 미완료 TODO 확인
      if (!hasPendingOrInProgressTodos(state)) {
        retryCount = 0;
        return { continue: true };
      }

      const pendingTodos = getTodosByStatus(state, 'pending');
      const inProgressTodo = getInProgressTodo(state);

      // 최대 재시도 횟수 초과
      if (retryCount >= maxRetries) {
        retryCount = 0;
        return {
          continue: true,
          message: `⚠️ 최대 재시도 횟수(${maxRetries})에 도달했습니다. 미완료 TODO가 있지만 종료를 허용합니다.`,
        };
      }

      retryCount++;

      // 미완료 TODO 목록 생성
      const todoList = [
        ...(inProgressTodo ? [`🔄 진행 중: ${inProgressTodo.content}`] : []),
        ...pendingTodos.map((t) => `⏳ 대기 중: ${t.content}`),
      ].join('\n');

      return {
        continue: false,
        message: `🚫 **TODO 강제 실행**

미완료 작업이 있어 종료할 수 없습니다. (시도 ${retryCount}/${maxRetries})

${todoList}

계속 진행하거나, \`/cancel\`로 명시적으로 취소하세요.`,
        inject: `<system-reminder>
미완료 TODO가 있습니다. 작업을 계속하세요.
${todoList}
</system-reminder>`,
      };
    },
  };
}
