/**
 * Frontend-UI-UX Skill - UI/UX Specialist Mode
 */
export function createFrontendUiUxSkill(context) {
    return {
        name: 'frontend-ui-ux',
        displayName: 'Frontend-UI-UX',
        description: 'Activates UI/UX specialist mode.',
        triggers: ['UI', 'UX', 'component', 'style', 'CSS'],
        autoActivate: false,
        handler: async ({ args, sessionState }) => {
            sessionState.activeSkill = 'frontend-ui-ux';
            return {
                success: true,
                output: `🎨 **Frontend-UI-UX Mode Activated**

Performing UI/UX work with Aichan (Frontend).

## UI/UX Principles
- User-centered design
- Accessibility (a11y) consideration
- Responsive design
- Consistent design system

## Task Description
${args || 'Please describe the UI/UX task'}

Delegating to Aichan (Frontend)...`,
                inject: `<frontend-ui-ux-mode>
Frontend-UI-UX mode is activated.
Delegate to Aichan (Frontend) to perform UI/UX work.
delegate_task(agent="aichan", task="...")
</frontend-ui-ux-mode>`,
            };
        },
    };
}
