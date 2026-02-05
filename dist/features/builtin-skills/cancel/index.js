/**
 * Cancel Skill - Cancel Current Mode
 */
import { deactivateRalphLoop, deactivateUltrawork, deactivateAutopilot, } from '../../session-state';
export function createCancelSkill(context) {
    return {
        name: 'cancel',
        displayName: 'Cancel',
        description: 'Cancels active modes.',
        triggers: ['cancel', 'stop', 'halt', 'abort'],
        autoActivate: true,
        handler: async ({ args, sessionState }) => {
            const cancelTarget = args?.toLowerCase() || 'all';
            const cancelled = [];
            if (cancelTarget === 'all' || cancelTarget.includes('ralph')) {
                if (sessionState.ralphLoopActive) {
                    deactivateRalphLoop(sessionState);
                    cancelled.push('Ralph');
                }
            }
            if (cancelTarget === 'all' || cancelTarget.includes('ultrawork')) {
                if (sessionState.ultraworkActive) {
                    deactivateUltrawork(sessionState);
                    cancelled.push('Ultrawork');
                }
            }
            if (cancelTarget === 'all' || cancelTarget.includes('autopilot')) {
                if (sessionState.autopilotActive) {
                    deactivateAutopilot(sessionState);
                    deactivateRalphLoop(sessionState);
                    deactivateUltrawork(sessionState);
                    cancelled.push('Autopilot (including Ralph + Ultrawork)');
                }
            }
            sessionState.activeSkill = undefined;
            if (cancelled.length === 0) {
                return {
                    success: true,
                    output: `ℹ️ No active modes to cancel.`,
                };
            }
            return {
                success: true,
                output: `⏹️ **Modes Cancelled**

The following modes have been cancelled:
${cancelled.map((c) => `- ${c}`).join('\n')}

Returning to normal mode.`,
            };
        },
    };
}
