/**
 * Ultrawork 스킬 - 병렬 실행 모드
 */

import type { SkillConfig, PluginContext, SkillResult } from '../../../types';
import { activateUltrawork } from '../../session-state';

export function createUltraworkSkill(context: PluginContext): SkillConfig {
  return {
    name: 'ultrawork',
    displayName: 'Ultrawork',
    description: '병렬 실행 모드를 활성화하여 여러 에이전트를 동시에 실행합니다.',
    triggers: ['ulw', 'ultrawork', '병렬', '빠르게', 'parallel'],
    autoActivate: true,

    handler: async ({ args, sessionState }): Promise<SkillResult> => {
      activateUltrawork(sessionState);

      return {
        success: true,
        output: `🚀 **Ultrawork 모드 활성화**

병렬 실행 모드가 활성화되었습니다.

## 활성화된 기능
- 여러 에이전트 동시 실행
- 배경 작업 자동 활용
- 독립적인 작업 병렬 처리

## 사용 방법
독립적인 작업들은 자동으로 병렬 실행됩니다.
순차적 의존성이 있는 작업은 순서대로 실행됩니다.

최대 동시 실행: ${context.settings.maxConcurrentAgents}개

Ultrawork를 비활성화하려면 \`/cancel-ultrawork\`를 사용하세요.`,
        inject: `<ultrawork-mode>
Ultrawork 모드가 활성화되었습니다.
병렬 실행 가능한 작업은 동시에 처리하세요.
최대 동시 에이전트: ${context.settings.maxConcurrentAgents}개
</ultrawork-mode>`,
      };
    },
  };
}
