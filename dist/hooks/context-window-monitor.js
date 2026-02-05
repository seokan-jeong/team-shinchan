/**
 * Context Window Monitoring Hook
 * Tracks context usage and provides warnings
 */
export function createContextWindowMonitorHook(context) {
    return {
        name: 'context-window-monitor',
        event: 'chat.message',
        description: 'Monitors context window usage.',
        enabled: true,
        priority: 60,
        handler: async (hookContext) => {
            const state = context.sessionState;
            const threshold = context.settings.contextWarningThreshold;
            // Increment message count
            state.messageCount++;
            // Check warning threshold
            if (state.messageCount === threshold) {
                return {
                    continue: true,
                    message: `⚠️ **Context Warning**

Message count has reached ${threshold}.
Context may be compacted in long sessions.

It is recommended to save important information in TODOs or files.`,
                };
            }
            // Critical warning (1.5x threshold)
            if (state.messageCount === Math.floor(threshold * 1.5)) {
                return {
                    continue: true,
                    message: `🚨 **Critical Context Warning**

Message count is ${state.messageCount}.
Context compaction may occur soon.

- Save important context to files
- Clean up completed tasks
- Start a new session if necessary`,
                };
            }
            return { continue: true };
        },
    };
}
