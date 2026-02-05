/**
 * Keyword Detector Hook (Intent Gate)
 * Detects keywords in user messages and recommends appropriate skills/agents
 */
import { SKILL_TRIGGERS } from '../config';
import { findMatchedKeyword } from '../shared';
export function createKeywordDetectorHook(context) {
    return {
        name: 'keyword-detector',
        event: 'UserPromptSubmit',
        description: 'Detects keywords in user messages and recommends appropriate skills.',
        enabled: true,
        priority: 80,
        handler: async (hookContext) => {
            const message = hookContext.message || '';
            if (!message) {
                return { continue: true };
            }
            // Check trigger keywords for each skill
            const detectedSkills = [];
            for (const [skillName, triggers] of Object.entries(SKILL_TRIGGERS)) {
                const matchedKeyword = findMatchedKeyword(message, triggers);
                if (matchedKeyword) {
                    detectedSkills.push({ skill: skillName, keyword: matchedKeyword });
                }
            }
            if (detectedSkills.length === 0) {
                return { continue: true };
            }
            // Select high-priority skill
            const priorityOrder = ['cancel', 'ultrawork', 'ralph', 'autopilot', 'plan', 'analyze'];
            const prioritized = detectedSkills.sort((a, b) => {
                const aIdx = priorityOrder.indexOf(a.skill);
                const bIdx = priorityOrder.indexOf(b.skill);
                return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
            });
            const topSkill = prioritized[0];
            // Generate skill auto-activation messages
            const skillMessages = {
                ultrawork: '🚀 Activating **Ultrawork** mode. Processing quickly with parallel execution.',
                ralph: '🔄 Activating **Ralph** mode. Continuing until task completion.',
                autopilot: '🤖 Activating **Autopilot** mode. Performing tasks autonomously.',
                plan: '📋 Starting **Plan** session. Analyzing requirements.',
                analyze: '🔍 Activating **Analyze** mode. Performing deep analysis.',
                deepsearch: '🔎 Activating **Deepsearch** mode. Deeply exploring codebase.',
                'git-master': '🌿 Activating **Git-Master** mode.',
                'frontend-ui-ux': '🎨 Activating **Frontend-UI-UX** mode.',
                cancel: '⏹️ Canceling current mode.',
            };
            return {
                continue: true,
                modified: true,
                message: skillMessages[topSkill.skill] || `Detected skill '${topSkill.skill}'.`,
                inject: `<intent-gate>
Detected keyword: "${topSkill.keyword}"
Recommended skill: ${topSkill.skill}
Auto-activation: Yes
</intent-gate>`,
            };
        },
    };
}
