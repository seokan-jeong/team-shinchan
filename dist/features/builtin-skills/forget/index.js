/**
 * Forget Skill - Delete Memory
 */
import { getMemoryManager } from '../../memory';
export function createForgetSkill(context) {
    return {
        name: 'forget',
        displayName: 'Forget',
        description: 'Deletes specific memories.',
        triggers: ['forget', 'delete memory', 'remove'],
        autoActivate: false,
        handler: async ({ args, sessionState }) => {
            if (!args || args.trim() === '') {
                return {
                    success: false,
                    output: `# ❌ Deletion Target Required

Please specify the memory to delete using the format \`/forget "keyword"\`.

**Usage:**
- \`/forget naming\` - Delete "naming" related memories
- \`/forget preference\` - Delete all preference memories
- \`/forget all\` - Delete all memories (caution!)

💡 First check current learned content with \`/memories\`.`,
                };
            }
            try {
                const manager = getMemoryManager();
                await manager.initialize();
                const keyword = args.trim();
                // Check for full deletion
                if (keyword.toLowerCase() === 'all') {
                    // Delete all memories
                    const stats = await manager.getStats();
                    const totalBefore = stats.total;
                    // Actually need to iterate through each memory to delete
                    const allMemories = manager.getAllMemories();
                    for (const memory of allMemories) {
                        await manager.delete(memory.id);
                    }
                    return {
                        success: true,
                        output: `# 🗑️ All Memories Deleted

All **${totalBefore}** memories have been deleted.

Learning has been reset. Will start learning again from new tasks.`,
                    };
                }
                // Delete by keyword
                const deletedCount = await manager.forget(keyword);
                if (deletedCount === 0) {
                    return {
                        success: true,
                        output: `# ℹ️ No Deletion Target

Could not find memories related to "${keyword}".

💡 Check current learned content with \`/memories\`.`,
                    };
                }
                return {
                    success: true,
                    output: `# 🗑️ Memory Deletion Complete

**${deletedCount}** memories related to "${keyword}" have been deleted.

This content will no longer influence agent behavior.`,
                };
            }
            catch (error) {
                return {
                    success: false,
                    output: `❌ Memory deletion failed: ${error}`,
                };
            }
        },
    };
}
