/**
 * background_task - Execute background task
 */
import { addBackgroundTask, canStartNewBackgroundTask } from '../../features/session-state';
export function createBackgroundTaskTool(context) {
    return {
        name: 'background_task',
        description: 'Execute an agent task in the background. Does not block main task.',
        parameters: [
            {
                name: 'agent',
                type: 'string',
                description: 'Name of the agent to execute',
                required: true,
            },
            {
                name: 'task',
                type: 'string',
                description: 'Task to perform',
                required: true,
            },
            {
                name: 'description',
                type: 'string',
                description: 'Task description (for tracking)',
                required: false,
            },
        ],
        handler: async (params) => {
            const agentName = params.agent;
            const task = params.task;
            const description = params.description || task;
            // Check agent
            const agent = context.agents.get(agentName);
            if (!agent) {
                return {
                    success: false,
                    error: `Agent '${agentName}' not found.`,
                };
            }
            // Check concurrent execution limit
            const maxConcurrent = context.settings.maxConcurrentAgents;
            if (!canStartNewBackgroundTask(context.sessionState, maxConcurrent)) {
                return {
                    success: false,
                    error: `Maximum concurrent execution limit (${maxConcurrent}) reached. Please wait until existing tasks complete.`,
                };
            }
            // Register background task
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
