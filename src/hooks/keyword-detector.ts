/**
 * 키워드 감지 훅 (의도 게이트)
 * 사용자 메시지에서 키워드를 감지하여 적절한 스킬/에이전트 추천
 */

import type { HookConfig, PluginContext, HookContext, HookResult } from '../types';
import { SKILL_TRIGGERS } from '../config';
import { matchKeywords, findMatchedKeyword } from '../shared';

export function createKeywordDetectorHook(context: PluginContext): HookConfig {
  return {
    name: 'keyword-detector',
    event: 'UserPromptSubmit',
    description: '사용자 메시지에서 키워드를 감지하여 적절한 스킬을 추천합니다.',
    enabled: true,
    priority: 80,

    handler: async (hookContext: HookContext): Promise<HookResult> => {
      const message = hookContext.message || '';
      if (!message) {
        return { continue: true };
      }

      // 각 스킬의 트리거 키워드 확인
      const detectedSkills: { skill: string; keyword: string }[] = [];

      for (const [skillName, triggers] of Object.entries(SKILL_TRIGGERS)) {
        const matchedKeyword = findMatchedKeyword(message, triggers);
        if (matchedKeyword) {
          detectedSkills.push({ skill: skillName, keyword: matchedKeyword });
        }
      }

      if (detectedSkills.length === 0) {
        return { continue: true };
      }

      // 우선순위가 높은 스킬 선택
      const priorityOrder = ['cancel', 'ultrawork', 'ralph', 'autopilot', 'plan', 'analyze'];
      const prioritized = detectedSkills.sort((a, b) => {
        const aIdx = priorityOrder.indexOf(a.skill);
        const bIdx = priorityOrder.indexOf(b.skill);
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      });

      const topSkill = prioritized[0];

      // 스킬 자동 활성화 메시지 생성
      const skillMessages: Record<string, string> = {
        ultrawork: '🚀 **Ultrawork** 모드를 활성화합니다. 병렬 실행으로 빠르게 처리합니다.',
        ralph: '🔄 **Ralph** 모드를 활성화합니다. 작업이 완료될 때까지 계속합니다.',
        autopilot: '🤖 **Autopilot** 모드를 활성화합니다. 자율적으로 작업을 수행합니다.',
        plan: '📋 **Plan** 세션을 시작합니다. 요구사항을 파악하겠습니다.',
        analyze: '🔍 **Analyze** 모드를 활성화합니다. 심층 분석을 수행합니다.',
        deepsearch: '🔎 **Deepsearch** 모드를 활성화합니다. 코드베이스를 깊이 탐색합니다.',
        'git-master': '🌿 **Git-Master** 모드를 활성화합니다.',
        'frontend-ui-ux': '🎨 **Frontend-UI-UX** 모드를 활성화합니다.',
        cancel: '⏹️ 현재 모드를 취소합니다.',
      };

      return {
        continue: true,
        modified: true,
        message: skillMessages[topSkill.skill] || `스킬 '${topSkill.skill}'을 감지했습니다.`,
        inject: `<intent-gate>
감지된 키워드: "${topSkill.keyword}"
추천 스킬: ${topSkill.skill}
자동 활성화: 예
</intent-gate>`,
      };
    },
  };
}
