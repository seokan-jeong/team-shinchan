/**
 * 중단 보호 훅
 * 실행 중인 배경 작업이 있으면 경고
 */

import type { HookConfig, PluginContext, HookContext, HookResult } from '../types';
import { getRunningBackgroundTasks } from '../features/session-state';

export function createStopContinuationGuardHook(context: PluginContext): HookConfig {
  return {
    name: 'stop-continuation-guard',
    event: 'Stop',
    description: '실행 중인 배경 작업이 있으면 경고합니다.',
    enabled: true,
    priority: 85,

    handler: async (hookContext: HookContext): Promise<HookResult> => {
      const runningTasks = getRunningBackgroundTasks(context.sessionState);

      if (runningTasks.length === 0) {
        return { continue: true };
      }

      const taskList = runningTasks
        .map((t) => `- ${t.agentName}: ${t.description}`)
        .join('\n');

      return {
        continue: true, // 경고만 하고 통과
        message: `⚠️ **배경 작업 실행 중**

다음 배경 작업이 아직 실행 중입니다:
${taskList}

결과를 확인하려면 \`session_manager(action="list_tasks")\`를 사용하세요.`,
      };
    },
  };
}
