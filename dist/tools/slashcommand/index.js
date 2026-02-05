/**
 * slashcommand - Execute slash command
 */
export function createSlashcommandTool(context) {
    return {
        name: 'slashcommand',
        description: 'Execute Team-Seokan slash command.',
        parameters: [
            {
                name: 'command',
                type: 'string',
                description: 'Command to execute (e.g., team-seokan:help)',
                required: true,
            },
            {
                name: 'args',
                type: 'string',
                description: 'Command arguments',
                required: false,
            },
        ],
        handler: async (params) => {
            const command = params.command;
            const args = params.args;
            // Handle team-seokan: prefix
            const normalizedCommand = command.startsWith('team-seokan:')
                ? command.replace('team-seokan:', '')
                : command;
            // Try to convert to skill
            const skill = context.skills.get(normalizedCommand);
            if (skill) {
                const result = await skill.handler({
                    args,
                    message: args || '',
                    sessionState: context.sessionState,
                });
                return result;
            }
            return {
                success: false,
                error: `Command '${command}' not found.`,
            };
        },
    };
}
