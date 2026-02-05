/**
 * skill - Execute skill
 */
export function createSkillTool(context) {
    return {
        name: 'skill',
        description: `Execute Team-Seokan skill.

Available skills:
- ultrawork: Parallel execution mode
- ralph: Repeat execution until complete
- autopilot: Autonomous execution mode
- plan: Start planning session
- analyze: Analysis mode
- deepsearch: Deep search
- git-master: Git expert mode
- frontend-ui-ux: UI/UX expert mode
- help: Help
- cancel: Cancel current mode`,
        parameters: [
            {
                name: 'name',
                type: 'string',
                description: 'Name of the skill to execute',
                required: true,
            },
            {
                name: 'args',
                type: 'string',
                description: 'Arguments to pass to skill',
                required: false,
            },
        ],
        handler: async (params) => {
            const skillName = params.name;
            const args = params.args;
            const skill = context.skills.get(skillName);
            if (!skill) {
                return {
                    success: false,
                    error: `Skill '${skillName}' not found.`,
                };
            }
            // Execute skill
            const result = await skill.handler({
                args,
                message: args || '',
                sessionState: context.sessionState,
            });
            return result;
        },
    };
}
