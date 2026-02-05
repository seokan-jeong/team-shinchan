/**
 * Ralph Skill - Repeat Until Complete
 */
import { activateRalphLoop } from '../../session-state';
export function createRalphSkill(context) {
    return {
        name: 'ralph',
        displayName: 'Ralph',
        description: 'Repeats execution until task completion.',
        triggers: ['ralph', 'until done', 'dont stop', "don't stop"],
        autoActivate: true,
        handler: async ({ args, sessionState }) => {
            activateRalphLoop(sessionState);
            return {
                success: true,
                output: `🔄 **Ralph Mode Activated**

Repeat-until-complete execution mode is now active.

## How It Works
- Automatically continues until all TODOs are complete
- Alerts about incomplete tasks if stop is attempted
- Maximum retries: ${context.settings.maxRetries} times

## Current Task
${args || 'Enter task description'}

To stop Ralph, use \`/cancel-ralph\`.`,
                inject: `<ralph-mode>
Ralph mode is activated.
Continue working until all TODOs are complete.
Will automatically restart if incomplete tasks remain.
</ralph-mode>`,
            };
        },
    };
}
