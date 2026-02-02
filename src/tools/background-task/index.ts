/**
 * background_task - 배경 작업 실행
 */

import type { ToolConfig, PluginContext, BuiltinAgentName } from '../../types';
import { addBackgroundTask, canStartNewBackgroundTask } from '../../features/session-state';

export function createBackgroundTaskTool(context: PluginContext): ToolConfig {
  return {
    name: 'background_task',
    description: '배경에서 에이전트 작업을 실행합니다. 메인 작업을 차단하지 않습니다.',

    parameters: [
      {
        name: 'agent',
        type: 'string',
        description: '실행할 에이전트 이름',
        required: true,
      },
      {
        name: 'task',
        type: 'string',
        description: '수행할 작업',
        required: true,
      },
      {
        name: 'description',
        type: 'string',
        description: '작업 설명 (추적용)',
        required: false,
      },
    ],

    handler: async (params) => {
      const agentName = params.agent as BuiltinAgentName;
      const task = params.task as string;
      const description = (params.description as string) || task;

      // 에이전트 확인
      const agent = context.agents.get(agentName);
      if (!agent) {
        return {
          success: false,
          error: `에이전트 '${agentName}'을 찾을 수 없습니다.`,
        };
      }

      // 동시 실행 제한 확인
      const maxConcurrent = context.settings.maxConcurrentAgents;
      if (!canStartNewBackgroundTask(context.sessionState, maxConcurrent)) {
        return {
          success: false,
          error: `최대 동시 실행 수(${maxConcurrent})에 도달했습니다. 기존 작업이 완료될 때까지 기다려주세요.`,
        };
      }

      // 배경 작업 등록
      const backgroundTask = addBackgroundTask(context.sessionState, agentName, description);

      return {
        success: true,
        output: {
          taskId: backgroundTask.id,
          agent: agentName,
          displayName: agent.metadata.displayName,
          description,
          status: 'running',
          instruction: `Task(subagent_type="team-seokan:${agentName}", model="${agent.metadata.model}", prompt="${task}", run_in_background=true)`,
        },
      };
    },
  };
}
