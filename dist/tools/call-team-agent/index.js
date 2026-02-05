/**
 * call_team_agent - Call agent directly
 */
import { getAgentDisplayName, getAgentRole } from '../../shared';
export function createCallTeamAgentTool(context) {
    return {
        name: 'call_team_agent',
        description: 'Directly call a specific Team-Seokan agent.',
        parameters: [
            {
                name: 'agent',
                type: 'string',
                description: 'Name of the agent to call',
                required: true,
            },
            {
                name: 'message',
                type: 'string',
                description: 'Message to deliver to the agent',
                required: true,
            },
        ],
        handler: async (params) => {
            const agentName = params.agent;
            const message = params.message;
            const agent = context.agents.get(agentName);
            if (!agent) {
                return {
                    success: false,
                    error: `Agent '${agentName}' not found.`,
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
