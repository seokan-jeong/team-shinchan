/**
 * Reviewer Check Hook
 * Automatically requests verification from Action Kamen (Reviewer) after code changes
 */
export function createReviewerCheckHook(context) {
    let editCount = 0;
    const editThreshold = 3; // Recommend verification after 3 edits
    return {
        name: 'reviewer-check',
        event: 'tool.execute.after',
        description: 'Recommends verification by Action Kamen (Reviewer) after code changes.',
        enabled: true,
        priority: 70,
        matchTools: ['Edit', 'Write'],
        handler: async (hookContext) => {
            editCount++;
            // Recommend verification after certain number of edits
            if (editCount >= editThreshold) {
                editCount = 0;
                return {
                    continue: true,
                    message: `📋 **Verification Recommended**

There have been ${editThreshold} code changes.
Verification by Action Kamen (Reviewer) is recommended.

\`delegate_task(agent="actionkamen", task="Please review recent changes")\``,
                    inject: `<reviewer-reminder>
Multiple code changes have occurred.
Consider delegating verification to Action Kamen (Reviewer).
</reviewer-reminder>`,
                };
            }
            return { continue: true };
        },
    };
}
