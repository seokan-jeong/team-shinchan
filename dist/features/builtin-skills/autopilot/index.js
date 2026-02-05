/**
 * Autopilot Skill - Autonomous Execution Mode
 */
import { activateAutopilot, activateRalphLoop, activateUltrawork } from '../../session-state';
export function createAutopilotSkill(context) {
    return {
        name: 'autopilot',
        displayName: 'Autopilot',
        description: 'Autonomous execution mode - Ralph + Ultrawork combined',
        triggers: ['autopilot', 'auto', 'autonomous'],
        autoActivate: true,
        handler: async ({ args, sessionState }) => {
            // Autopilot = Ralph + Ultrawork
            activateAutopilot(sessionState);
            activateRalphLoop(sessionState);
            activateUltrawork(sessionState);
            return {
                success: true,
                output: `🤖 **Autopilot Mode Activated**

Fully autonomous execution mode is now active.

## Activated Features
- ✅ Ralph: Repeat until task completion
- ✅ Ultrawork: Parallel execution
- ✅ Automatic agent delegation
- ✅ Automatic verification request

## Task Description
${args || 'Enter task description'}

## Workflow
1. Requirements analysis (Misae)
2. Plan creation (Nene)
3. Implementation (Bo/Specialists)
4. Verification (Action Kamen)
5. Repeat until completion

To stop Autopilot, use \`/cancel-autopilot\`.`,
                inject: `<autopilot-mode>
Autopilot mode is activated.
Complete the task autonomously.
Ralph + Ultrawork are both active.
</autopilot-mode>`,
            };
        },
    };
}
