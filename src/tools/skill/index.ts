/**
 * skill - 스킬 실행
 */

import type { ToolConfig, PluginContext } from '../../types';

export function createSkillTool(context: PluginContext): ToolConfig {
  return {
    name: 'skill',
    description: `Team-Seokan 스킬을 실행합니다.

사용 가능한 스킬:
- ultrawork: 병렬 실행 모드
- ralph: 완료까지 반복 실행
- autopilot: 자율 실행 모드
- plan: 계획 세션 시작
- analyze: 분석 모드
- deepsearch: 심층 검색
- git-master: Git 전문 모드
- frontend-ui-ux: UI/UX 전문 모드
- help: 도움말
- cancel: 현재 모드 취소`,

    parameters: [
      {
        name: 'name',
        type: 'string',
        description: '실행할 스킬 이름',
        required: true,
      },
      {
        name: 'args',
        type: 'string',
        description: '스킬에 전달할 인자',
        required: false,
      },
    ],

    handler: async (params) => {
      const skillName = params.name as string;
      const args = params.args as string | undefined;

      const skill = context.skills.get(skillName);
      if (!skill) {
        return {
          success: false,
          error: `스킬 '${skillName}'을 찾을 수 없습니다.`,
        };
      }

      // 스킬 실행
      const result = await skill.handler({
        args,
        message: args || '',
        sessionState: context.sessionState,
      });

      return result;
    },
  };
}
