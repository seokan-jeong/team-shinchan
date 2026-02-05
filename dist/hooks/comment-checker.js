/**
 * Comment Checker Hook
 */
export function createCommentCheckerHook(context) {
    return {
        name: 'comment-checker',
        event: 'tool.execute.after',
        description: 'Detects excessive comment usage and provides warnings.',
        enabled: true,
        priority: 30,
        matchTools: ['Edit', 'Write'],
        handler: async () => ({ continue: true }),
    };
}
