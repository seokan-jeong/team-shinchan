/**
 * call_team_agent - 에이전트 직접 호출
 */

import type { ToolConfig, PluginContext, BuiltinAgentName } from '../../types';
import { getAgentDisplayName, getAgentRole } from '../../shared';

export function createCallTeamAgentTool(context: PluginContext): ToolConfig {
  return {
    name: 'call_team_agent',
    description: '특정 Team-Seokan 에이전트를 직접 호출합니다.',

    parameters: [
      {
        name: 'agent',
        type: 'string',
        description: '호출할 에이전트 이름',
        required: true,
      },
      {
        name: 'message',
        type: 'string',
        description: '에이전트에게 전달할 메시지',
        required: true,
      },
    ],

    handler: async (params) => {
      const agentName = params.agent as BuiltinAgentName;
      const message = params.message as string;

      const agent = context.agents.get(agentName);
      if (!agent) {
        return {
          success: false,
          error: `에이전트 '${agentName}'을 찾을 수 없습니다.`,
        };
      }

      return {
        success: true,
        output: {
          agent: agentName,
          displayName: getAgentDisplayName(agentName),
          role: getAgentRole(agentName),
          message,
          systemPrompt: agent.systemPrompt,
          model: agent.metadata.model,
        },
      };
    },
  };
}
