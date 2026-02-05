/**
 * Analyze Skill - Analysis Mode
 */
export function createAnalyzeSkill(context) {
    return {
        name: 'analyze',
        displayName: 'Analyze',
        description: 'Activates deep analysis mode.',
        triggers: ['analyze', 'analysis', 'debug', 'investigate'],
        autoActivate: true,
        handler: async ({ args, sessionState }) => {
            sessionState.activeSkill = 'analyze';
            return {
                success: true,
                output: `🔍 **Analysis Mode Activated**

Performing deep analysis with Hiroshi (Oracle).

## Analysis Target
${args || 'Please describe what needs to be analyzed'}

## Analysis Approach
1. **Phenomenon Identification**: Accurately understand the problem situation
2. **Root Cause Tracking**: Identify the root cause
3. **Impact Analysis**: Identify related code/features
4. **Solution Options**: Present options and recommendations

Delegating to Hiroshi (Oracle)...`,
                inject: `<analyze-mode>
Analysis mode is activated.
Delegate to Hiroshi (Oracle) to perform deep analysis.
delegate_task(agent="hiroshi", task="...")
</analyze-mode>`,
            };
        },
    };
}
