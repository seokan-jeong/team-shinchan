/**
 * Plan Skill - Planning Session
 */
export function createPlanSkill(context) {
    return {
        name: 'plan',
        displayName: 'Plan',
        description: 'Starts a planning session to organize requirements.',
        triggers: ['plan', 'planning', 'design'],
        autoActivate: true,
        handler: async ({ args, sessionState }) => {
            sessionState.activeSkill = 'plan';
            return {
                success: true,
                output: `📋 **Planning Session Started**

Creating a plan with Nene (Planner).

## Project/Task
${args || 'Please describe what to plan'}

## Process
1. **Requirements Gathering**: Identify goals, constraints, priorities
2. **Analysis**: Misae (Metis) analyzes hidden requirements
3. **Plan Creation**: Break down into step-by-step tasks
4. **Review**: Action Kamen (Reviewer) reviews

## Questions
Will ask a few questions to create the plan.

Delegating to Nene (Planner)...`,
                inject: `<plan-mode>
Planning session has started.
Delegate to Nene (Planner) to create a systematic plan.
delegate_task(agent="nene", task="...")
</plan-mode>`,
            };
        },
    };
}
