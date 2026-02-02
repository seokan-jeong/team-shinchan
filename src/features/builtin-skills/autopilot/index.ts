/**
 * Autopilot 스킬 - 자율 실행 모드
 */

import type { SkillConfig, PluginContext, SkillResult } from '../../../types';
import { activateAutopilot, activateRalphLoop, activateUltrawork } from '../../session-state';

export function createAutopilotSkill(context: PluginContext): SkillConfig {
  return {
    name: 'autopilot',
    displayName: 'Autopilot',
    description: '자율 실행 모드 - Ralph + Ultrawork 결합',
    triggers: ['autopilot', '자동으로', '알아서', 'auto'],
    autoActivate: true,

    handler: async ({ args, sessionState }): Promise<SkillResult> => {
      // Autopilot = Ralph + Ultrawork
      activateAutopilot(sessionState);
      activateRalphLoop(sessionState);
      activateUltrawork(sessionState);

      return {
        success: true,
        output: `🤖 **Autopilot 모드 활성화**

완전 자율 실행 모드가 활성화되었습니다.

## 활성화된 기능
- ✅ Ralph: 작업 완료까지 반복
- ✅ Ultrawork: 병렬 실행
- ✅ 자동 에이전트 위임
- ✅ 자동 검증 요청

## 작업 내용
${args || '작업 내용을 입력하세요'}

## 동작 방식
1. 요구사항 분석 (봉미선)
2. 계획 수립 (유리)
3. 구현 (맹구/전문가)
4. 검증 (액션가면)
5. 완료까지 반복

Autopilot을 중단하려면 \`/cancel-autopilot\`를 사용하세요.`,
        inject: `<autopilot-mode>
Autopilot 모드가 활성화되었습니다.
자율적으로 작업을 완료하세요.
Ralph + Ultrawork가 함께 활성화되었습니다.
</autopilot-mode>`,
      };
    },
  };
}
