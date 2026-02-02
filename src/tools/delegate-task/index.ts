/**
 * delegate_task - 에이전트에게 작업 위임
 */

import type { ToolConfig, PluginContext, BuiltinAgentName } from '../../types';

export function createDelegateTaskTool(context: PluginContext): ToolConfig {
  return {
    name: 'delegate_task',
    description: `에이전트에게 작업을 위임합니다.

사용 가능한 에이전트:
- jjangu (짱구): 오케스트레이터
- jjanga (짱아): 마스터 오케스트레이터
- maenggu (맹구): 코드 작성/수정
- cheolsu (철수): 복잡한 장시간 작업
- suji (수지): UI/UX 프론트엔드
- heukgom (흑곰): API/DB 백엔드
- hooni (훈이): DevOps 인프라
- shinhyungman (신형만): 전략 조언
- yuri (유리): 계획 수립
- bongmisun (봉미선): 사전 분석
- actiongamen (액션가면): 코드 검증
- heendungi (흰둥이): 코드 탐색
- chaesunga (채성아): 문서 검색
- namiri (나미리): 이미지/PDF 분석`,

    parameters: [
      {
        name: 'agent',
        type: 'string',
        description: '위임할 에이전트 이름 (예: maenggu, heendungi)',
        required: true,
      },
      {
        name: 'task',
        type: 'string',
        description: '수행할 작업 설명',
        required: true,
      },
      {
        name: 'context',
        type: 'string',
        description: '추가 컨텍스트 정보',
        required: false,
      },
      {
        name: 'run_in_background',
        type: 'boolean',
        description: '배경에서 실행할지 여부',
        required: false,
        default: false,
      },
    ],

    handler: async (params) => {
      const agentName = params.agent as BuiltinAgentName;
      const task = params.task as string;
      const additionalContext = params.context as string | undefined;
      const runInBackground = params.run_in_background as boolean;

      // 에이전트 존재 확인
      const agent = context.agents.get(agentName);
      if (!agent) {
        return {
          success: false,
          error: `에이전트 '${agentName}'을 찾을 수 없습니다.`,
        };
      }

      // 배경 실행 제한 확인
      if (runInBackground) {
        const maxConcurrent = context.settings.maxConcurrentAgents;
        const runningTasks = context.sessionState.backgroundTasks.filter(
          (t) => t.status === 'running'
        );
        if (runningTasks.length >= maxConcurrent) {
          return {
            success: false,
            error: `최대 동시 실행 수(${maxConcurrent})에 도달했습니다.`,
          };
        }
      }

      // 위임 결과 반환
      return {
        success: true,
        output: {
          delegatedTo: agentName,
          displayName: agent.metadata.displayName,
          role: agent.metadata.role,
          task,
          context: additionalContext,
          runInBackground,
          model: agent.metadata.model,
          // 실제로는 여기서 Task tool을 호출하도록 구성
          instruction: `Task(subagent_type="team-seokan:${agentName}", model="${agent.metadata.model}", prompt="${task}")`,
        },
      };
    },
  };
}
