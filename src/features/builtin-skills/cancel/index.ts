/**
 * Cancel 스킬 - 현재 모드 취소
 */

import type { SkillConfig, PluginContext, SkillResult } from '../../../types';
import {
  deactivateRalphLoop,
  deactivateUltrawork,
  deactivateAutopilot,
} from '../../session-state';

export function createCancelSkill(context: PluginContext): SkillConfig {
  return {
    name: 'cancel',
    displayName: 'Cancel',
    description: '활성화된 모드를 취소합니다.',
    triggers: ['cancel', '취소', '중단', 'stop', '멈춰'],
    autoActivate: true,

    handler: async ({ args, sessionState }): Promise<SkillResult> => {
      const cancelTarget = args?.toLowerCase() || 'all';

      const cancelled: string[] = [];

      if (cancelTarget === 'all' || cancelTarget.includes('ralph')) {
        if (sessionState.ralphLoopActive) {
          deactivateRalphLoop(sessionState);
          cancelled.push('Ralph');
        }
      }

      if (cancelTarget === 'all' || cancelTarget.includes('ultrawork')) {
        if (sessionState.ultraworkActive) {
          deactivateUltrawork(sessionState);
          cancelled.push('Ultrawork');
        }
      }

      if (cancelTarget === 'all' || cancelTarget.includes('autopilot')) {
        if (sessionState.autopilotActive) {
          deactivateAutopilot(sessionState);
          deactivateRalphLoop(sessionState);
          deactivateUltrawork(sessionState);
          cancelled.push('Autopilot (Ralph + Ultrawork 포함)');
        }
      }

      sessionState.activeSkill = undefined;

      if (cancelled.length === 0) {
        return {
          success: true,
          output: `ℹ️ 취소할 활성 모드가 없습니다.`,
        };
      }

      return {
        success: true,
        output: `⏹️ **모드 취소됨**

다음 모드가 취소되었습니다:
${cancelled.map((c) => `- ${c}`).join('\n')}

일반 모드로 돌아갑니다.`,
      };
    },
  };
}
