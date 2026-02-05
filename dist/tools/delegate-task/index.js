/**
 * delegate_task - Delegate task to agent
 */
export function createDelegateTaskTool(context) {
    return {
        name: 'delegate_task',
        description: `Delegate a task to an agent.

Available agents:
- jjangu (Shinnosuke): Orchestrator
- jjanga (Himawari): Master Orchestrator
- maenggu (Bo): Code Writing/Modification
- cheolsu (Kazama): Complex Long-term Tasks
- suji (Aichan): UI/UX Frontend
- heukgom (Bunta): API/DB Backend
- hooni (Masao): DevOps Infrastructure
- shinhyungman (Hiroshi): Strategic Advice
- yuri (Nene): Planning
- bongmisun (Misae): Pre-analysis
- actiongamen (Action Kamen): Code Verification
- heendungi (Shiro): Code Exploration
- chaesunga (Masumi): Document Search
- namiri (Ume): Image/PDF Analysis`,
        parameters: [
            {
                name: 'agent',
                type: 'string',
                description: 'Name of the agent to delegate to (e.g., maenggu, heendungi)',
                required: true,
            },
            {
                name: 'task',
                type: 'string',
                description: 'Description of the task to perform',
                required: true,
            },
            {
                name: 'context',
                type: 'string',
                description: 'Additional context information',
                required: false,
            },
            {
                name: 'run_in_background',
                type: 'boolean',
                description: 'Whether to run in background',
                required: false,
                default: false,
            },
        ],
        handler: async (params) => {
            const agentName = params.agent;
            const task = params.task;
            const additionalContext = params.context;
            const runInBackground = params.run_in_background;
            // Check agent existence
            const agent = context.agents.get(agentName);
            if (!agent) {
                return {
                    success: false,
                    error: `Agent '${agentName}' not found.`,
                };
            }
            // Check background execution limit
            if (runInBackground) {
                const maxConcurrent = context.settings.maxConcurrentAgents;
                const runningTasks = context.sessionState.backgroundTasks.filter((t) => t.status === 'running');
                if (runningTasks.length >= maxConcurrent) {
                    return {
                        success: false,
                        error: `Maximum concurrent execution limit (${maxConcurrent}) reached.`,
                    };
                }
            }
            // Return delegation result
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
                    // In practice, configure to call Task tool here
                    instruction: `Task(subagent_type="team-seokan:${agentName}", model="${agent.metadata.model}", prompt="${task}")`,
                },
            };
        },
    };
}
