/**
 * Implicit Feedback Hook
 * Detects and learns from user's implicit feedback
 */
import { detectImplicitFeedback, extractLearningFromFeedback, } from '../features/learning';
import { getMemoryManager } from '../features/memory';
/**
 * Extract modification content from Edit tool results
 */
function extractEditFeedback(toolInput, toolOutput, sessionState) {
    const filePath = toolInput.file_path;
    const oldString = toolInput.old_string;
    const newString = toolInput.new_string;
    if (!filePath || !oldString || !newString) {
        return null;
    }
    // Compare with previous agent output
    const lastAgentOutput = sessionState.lastAgentOutput;
    const lastAgent = sessionState.lastAgent;
    // User modified code written by agent
    if (lastAgentOutput && lastAgentOutput.includes(oldString)) {
        return {
            type: 'modify',
            timestamp: new Date(),
            context: {
                filePath,
                originalContent: oldString,
                modifiedContent: newString,
                agent: lastAgent,
                taskDescription: `Modified ${filePath}`,
            },
        };
    }
    return null;
}
/**
 * Detect undo/revert from Bash tool
 */
function detectUndoAction(toolInput, sessionState) {
    const command = toolInput.command;
    if (!command)
        return null;
    // Detect git revert, git checkout, undo-related commands
    const undoPatterns = [
        /git\s+(revert|checkout|reset)/i,
        /rm\s+-rf?\s+.*\.(ts|js|tsx|jsx|py)/i, // Code file deletion
    ];
    for (const pattern of undoPatterns) {
        if (pattern.test(command)) {
            return {
                type: 'undo',
                timestamp: new Date(),
                context: {
                    agent: sessionState.lastAgent,
                    taskDescription: `Command executed: ${command}`,
                },
            };
        }
    }
    return null;
}
export function createImplicitFeedbackHook(context) {
    return {
        name: 'implicit-feedback',
        event: 'PostToolUse',
        description: 'Detects implicit feedback from user modification/rejection actions.',
        enabled: true,
        priority: 40,
        handler: async ({ toolName, toolInput, toolOutput, sessionState, }) => {
            let userAction = null;
            const state = sessionState;
            // When Edit tool is used
            if (toolName === 'Edit' && state) {
                userAction = extractEditFeedback(toolInput, toolOutput, state);
            }
            // Detect undo from Bash tool
            if (toolName === 'Bash' && state) {
                userAction = detectUndoAction(toolInput, state);
            }
            if (!userAction) {
                return { continue: true };
            }
            try {
                // Detect implicit feedback
                const feedback = detectImplicitFeedback(userAction);
                if (!feedback) {
                    return { continue: true };
                }
                // Extract learning
                const extraction = extractLearningFromFeedback(feedback);
                if (extraction.learnings.length === 0) {
                    return { continue: true };
                }
                // Save learning
                const manager = getMemoryManager();
                await manager.initialize();
                for (const learning of extraction.learnings) {
                    await manager.create(learning);
                }
                // Reinforce/contradict existing memory
                for (const id of extraction.reinforceMemoryIds) {
                    await manager.reinforce(id);
                }
                for (const id of extraction.contradictMemoryIds) {
                    await manager.contradict(id);
                }
                return {
                    continue: true,
                    message: `💡 Implicit feedback learned: ${extraction.learnings[0]?.title || ''}`,
                };
            }
            catch (error) {
                console.error('Implicit feedback error:', error);
                return { continue: true };
            }
        },
    };
}
