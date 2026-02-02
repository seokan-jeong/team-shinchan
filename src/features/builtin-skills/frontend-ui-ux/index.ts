/**
 * Frontend-UI-UX 스킬 - UI/UX 전문 모드
 */

import type { SkillConfig, PluginContext, SkillResult } from '../../../types';

export function createFrontendUiUxSkill(context: PluginContext): SkillConfig {
  return {
    name: 'frontend-ui-ux',
    displayName: 'Frontend-UI-UX',
    description: 'UI/UX 작업 전문 모드를 활성화합니다.',
    triggers: ['UI', 'UX', '컴포넌트', '스타일', 'CSS', 'component'],
    autoActivate: false,

    handler: async ({ args, sessionState }): Promise<SkillResult> => {
      sessionState.activeSkill = 'frontend-ui-ux';

      return {
        success: true,
        output: `🎨 **Frontend-UI-UX 모드 활성화**

수지(Frontend)와 함께 UI/UX 작업을 수행합니다.

## UI/UX 원칙
- 사용자 중심 설계
- 접근성 (a11y) 고려
- 반응형 디자인
- 일관된 디자인 시스템

## 작업 내용
${args || 'UI/UX 작업 내용을 설명해주세요'}

수지(Frontend)에게 위임합니다...`,
        inject: `<frontend-ui-ux-mode>
Frontend-UI-UX 모드가 활성화되었습니다.
수지(Frontend)에게 위임하여 UI/UX 작업을 수행하세요.
delegate_task(agent="suji", task="...")
</frontend-ui-ux-mode>`,
      };
    },
  };
}
