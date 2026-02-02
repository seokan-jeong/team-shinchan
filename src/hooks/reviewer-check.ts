/**
 * 액션가면 검증 훅
 * 코드 변경 후 자동으로 액션가면(Reviewer)에게 검증 요청
 */

import type { HookConfig, PluginContext, HookContext, HookResult } from '../types';

export function createReviewerCheckHook(context: PluginContext): HookConfig {
  let editCount = 0;
  const editThreshold = 3; // 3번 편집 후 검증 권장

  return {
    name: 'reviewer-check',
    event: 'tool.execute.after',
    description: '코드 변경 후 액션가면(Reviewer)에게 검증을 권장합니다.',
    enabled: true,
    priority: 70,
    matchTools: ['Edit', 'Write'],

    handler: async (hookContext: HookContext): Promise<HookResult> => {
      editCount++;

      // 일정 횟수 편집 후 검증 권장
      if (editCount >= editThreshold) {
        editCount = 0;

        return {
          continue: true,
          message: `📋 **검증 권장**

${editThreshold}번의 코드 변경이 있었습니다.
액션가면(Reviewer)에게 검증을 권장합니다.

\`delegate_task(agent="actiongamen", task="최근 변경사항을 검토해주세요")\``,
          inject: `<reviewer-reminder>
여러 코드 변경이 있었습니다.
액션가면(Reviewer)에게 검증을 위임하는 것을 고려하세요.
</reviewer-reminder>`,
        };
      }

      return { continue: true };
    },
  };
}
