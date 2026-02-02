/**
 * 컨텍스트 윈도우 모니터링 훅
 * 컨텍스트 사용량을 추적하고 경고
 */

import type { HookConfig, PluginContext, HookContext, HookResult } from '../types';

export function createContextWindowMonitorHook(context: PluginContext): HookConfig {
  return {
    name: 'context-window-monitor',
    event: 'chat.message',
    description: '컨텍스트 윈도우 사용량을 모니터링합니다.',
    enabled: true,
    priority: 60,

    handler: async (hookContext: HookContext): Promise<HookResult> => {
      const state = context.sessionState;
      const threshold = context.settings.contextWarningThreshold;

      // 메시지 카운트 증가
      state.messageCount++;

      // 경고 임계값 확인
      if (state.messageCount === threshold) {
        return {
          continue: true,
          message: `⚠️ **컨텍스트 경고**

메시지 수가 ${threshold}개에 도달했습니다.
긴 세션에서는 컨텍스트가 압축될 수 있습니다.

중요한 정보는 TODO나 파일에 저장하는 것을 권장합니다.`,
        };
      }

      // 심각한 경고 (임계값의 1.5배)
      if (state.messageCount === Math.floor(threshold * 1.5)) {
        return {
          continue: true,
          message: `🚨 **컨텍스트 심각 경고**

메시지 수가 ${state.messageCount}개입니다.
곧 컨텍스트 압축이 발생할 수 있습니다.

- 중요한 컨텍스트는 파일에 저장하세요
- 완료된 작업은 정리하세요
- 필요시 새 세션을 시작하세요`,
        };
      }

      return { continue: true };
    },
  };
}
