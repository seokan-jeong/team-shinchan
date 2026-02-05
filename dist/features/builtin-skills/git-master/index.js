/**
 * Git-Master Skill - Git Specialist Mode
 */
export function createGitMasterSkill(context) {
    return {
        name: 'git-master',
        displayName: 'Git-Master',
        description: 'Activates Git specialist mode.',
        triggers: ['commit', 'push', 'merge', 'rebase', 'git'],
        autoActivate: false, // Do not auto-activate
        handler: async ({ args, sessionState }) => {
            sessionState.activeSkill = 'git-master';
            return {
                success: true,
                output: `🌿 **Git-Master Mode Activated**

Git specialist mode.

## Git Guidelines
- Atomic commits (one purpose, one commit)
- Clear commit messages
- Follow branching strategy

## Commit Message Format
\`\`\`
<type>: <subject>

<body>

Co-Authored-By: Team-Shinchan <noreply@team-shinchan.dev>
\`\`\`

## Types
- feat: New feature
- fix: Bug fix
- refactor: Refactoring
- docs: Documentation
- test: Tests
- chore: Other`,
            };
        },
    };
}
