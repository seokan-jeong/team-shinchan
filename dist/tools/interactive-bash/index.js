/**
 * interactive_bash - Interactive bash session
 */
export function createInteractiveBashTool(context) {
    return {
        name: 'interactive_bash',
        description: 'Start an interactive bash session. Use for commands requiring user input.',
        parameters: [
            {
                name: 'command',
                type: 'string',
                description: 'Command to execute',
                required: true,
            },
            {
                name: 'timeout',
                type: 'number',
                description: 'Timeout (milliseconds)',
                required: false,
                default: 30000,
            },
        ],
        handler: async (params) => {
            const command = params.command;
            const timeout = params.timeout;
            return {
                success: true,
                output: {
                    command,
                    timeout,
                    note: 'Interactive bash sessions are managed through tmux.',
                    instruction: `Use the Bash tool: Bash(command="${command}", timeout=${timeout})`,
                },
            };
        },
    };
}
