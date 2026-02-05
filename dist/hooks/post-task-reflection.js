/**
 * Post-Task Reflection Hook
 * Executes automatic reflection after task completion
 */
import { reflect, summarizeReflection } from '../features/reflection';
import { getMemoryManager } from '../features/memory';
/**
 * Convert task result to TaskResult format
 */
function parseTaskResult(toolName, toolInput, toolOutput, sessionState) {
    // Process Task tool results only
    if (toolName !== 'Task') {
        return null;
    }
    const taskId = `task-${Date.now()}`;
    const description = toolInput.prompt || toolInput.description || '';
    const agent = toolInput.subagent_type?.replace('team-shinchan:', '') || 'shared';
    // Determine success
    const success = !toolOutput.toLowerCase().includes('error') &&
        !toolOutput.toLowerCase().includes('failed') &&
        !toolOutput.toLowerCase().includes('failed');
    // Extract errors
    const errors = [];
    const errorMatches = toolOutput.match(/error:?\s*(.+?)(?:\n|$)/gi);
    if (errorMatches) {
        errors.push(...errorMatches.map((e) => e.trim()));
    }
    // Extract file changes (simple pattern)
    const filesModified = [];
    const fileMatches = toolOutput.match(/(?:created|modified|edited|wrote)\s+([^\s]+\.[a-z]+)/gi);
    if (fileMatches) {
        filesModified.push(...fileMatches.map((m) => m.replace(/^(created|modified|edited|wrote)\s+/i, '')));
    }
    // Code change information (simplified)
    const codeChanges = filesModified.map((file) => ({
        filePath: file,
        changeType: 'modify',
        language: file.split('.').pop() || 'unknown',
        linesAdded: 0,
        linesRemoved: 0,
        summary: '',
    }));
    // Calculate task duration
    const duration = sessionState?.taskStartTime
        ? Date.now() - sessionState.taskStartTime
        : 0;
    return {
        taskId,
        description,
        success,
        agent: agent,
        filesModified,
        codeChanges,
        duration,
        errors,
        context: {},
    };
}
export function createPostTaskReflectionHook(context) {
    return {
        name: 'post-task-reflection',
        event: 'PostToolUse',
        description: 'Executes automatic reflection after task completion.',
        enabled: true,
        priority: 50,
        handler: async ({ toolName, toolInput, toolOutput, sessionState, }) => {
            // Skip if not Task tool
            if (toolName !== 'Task') {
                return { continue: true };
            }
            try {
                const taskResult = parseTaskResult(toolName, toolInput, toolOutput, sessionState);
                if (!taskResult) {
                    return { continue: true };
                }
                // Execute reflection
                const reflection = reflect(taskResult);
                // Save learning
                const manager = getMemoryManager();
                await manager.initialize();
                for (const learning of reflection.learnings) {
                    await manager.create(learning);
                }
                // Output simple reflection summary
                const summary = summarizeReflection(reflection);
                return {
                    continue: true,
                    message: `
<reflection>
${summary}
</reflection>
`,
                };
            }
            catch (error) {
                console.error('Reflection error:', error);
                return { continue: true };
            }
        },
    };
}
