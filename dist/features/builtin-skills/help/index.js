/**
 * Help Skill - Help Guide
 */
export function createHelpSkill(context) {
    return {
        name: 'help',
        displayName: 'Help',
        description: 'Provides Team-Shinchan usage guide.',
        triggers: ['help', 'guide', 'usage'],
        autoActivate: false,
        handler: async () => {
            return {
                success: true,
                output: `# 🎭 Team-Shinchan Help

## Agent Team (15 Members)

### Orchestration
- **Shinnosuke**: Main orchestrator
- **Himawari**: Large-scale project coordinator
- **Midori**: Debate moderator

### Execution
- **Bo**: Code writing/modification
- **Kazama**: Complex long-running tasks

### Specialists
- **Aichan**: UI/UX Frontend
- **Bunta**: API/DB Backend
- **Masao**: DevOps Infrastructure

### Advisory (Read-only)
- **Hiroshi**: Strategy advice/debugging
- **Nene**: Planning
- **Misae**: Pre-analysis
- **Action Kamen**: Verification/review

### Exploration (Read-only)
- **Shiro**: Code exploration
- **Masumi**: Document search
- **Ume**: Image/PDF analysis

## Skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| ultrawork | ulw, parallel | Parallel execution mode |
| ralph | until done | Repeat until complete |
| autopilot | auto | Autonomous execution |
| plan | plan | Planning session |
| analyze | analyze | Deep analysis |
| deepsearch | search | Deep search |

## Usage Examples

\`\`\`
# Agent delegation
delegate_task(agent="bo", task="Add button component")

# Execute skill
/team-shinchan:ultrawork Process quickly

# Background execution
background_task(agent="shiro", task="Find API endpoint")
\`\`\``,
            };
        },
    };
}
