/**
 * Ralph Loop 훅
 * 작업이 완료될 때까지 반복 실행
 */

import type { HookConfig, PluginContext, HookContext, HookResult } from '../../types';
import { hasPendingOrInProgressTodos } from '../../features/session-state';

export function createRalphLoopHook(context: PluginContext): HookConfig {
  return {
    name: 'ralph-loop',
    event: 'Stop',
    description: 'Ralph 모드가 활성화되면 작업 완료까지 계속 실행합니다.',
    enabled: true,
    priority: 90,

    handler: async (hookContext: HookContext): Promise<HookResult> => {
      const state = context.sessionState;

      // Ralph 모드가 비활성화되어 있으면 통과
      if (!state.ralphLoopActive) {
        return { continue: true };
      }

      // 미완료 TODO 확인
      if (hasPendingOrInProgressTodos(state)) {
        return {
          continue: false,
          message: `🔄 **Ralph Loop 활성화**

작업이 아직 완료되지 않았습니다. 계속 진행합니다.

Ralph를 중단하려면 \`/cancel-ralph\`를 사용하세요.`,
          inject: `<system-reminder>
Ralph Loop가 활성화되어 있습니다.
모든 TODO가 완료될 때까지 작업을 계속하세요.
</system-reminder>`,
        };
      }

      // 모든 작업 완료 - Ralph 비활성화
      state.ralphLoopActive = false;

      return {
        continue: true,
        message: `✅ **Ralph Loop 완료**

모든 작업이 완료되었습니다. Ralph 모드를 종료합니다.`,
      };
    },
  };
}
