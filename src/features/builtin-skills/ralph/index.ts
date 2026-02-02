/**
 * Ralph 스킬 - 완료까지 반복 실행
 */

import type { SkillConfig, PluginContext, SkillResult } from '../../../types';
import { activateRalphLoop } from '../../session-state';

export function createRalphSkill(context: PluginContext): SkillConfig {
  return {
    name: 'ralph',
    displayName: 'Ralph',
    description: '작업이 완료될 때까지 반복 실행합니다.',
    triggers: ['ralph', '끝까지', '완료할 때까지', 'dont stop', "don't stop"],
    autoActivate: true,

    handler: async ({ args, sessionState }): Promise<SkillResult> => {
      activateRalphLoop(sessionState);

      return {
        success: true,
        output: `🔄 **Ralph 모드 활성화**

작업 완료까지 반복 실행 모드가 활성화되었습니다.

## 동작 방식
- 모든 TODO가 완료될 때까지 자동 계속
- 중단 시도 시 미완료 작업 알림
- 최대 재시도: ${context.settings.maxRetries}회

## 현재 작업
${args || '작업 내용을 입력하세요'}

Ralph를 중단하려면 \`/cancel-ralph\`를 사용하세요.`,
        inject: `<ralph-mode>
Ralph 모드가 활성화되었습니다.
모든 TODO가 완료될 때까지 작업을 계속하세요.
미완료 작업이 있으면 자동으로 재시작됩니다.
</ralph-mode>`,
      };
    },
  };
}
