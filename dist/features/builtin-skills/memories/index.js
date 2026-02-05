/**
 * Memories Skill - View Learned Memories
 */
import { getMemoryManager } from '../../memory';
import { calculateEffectiveConfidence } from '../../memory/decay';
/**
 * Format memory in readable format
 */
function formatMemory(memory, index) {
    const confidence = calculateEffectiveConfidence(memory);
    const confidenceStr = confidence >= 0.8 ? '⭐⭐⭐' : confidence >= 0.5 ? '⭐⭐' : '⭐';
    const date = memory.createdAt.toISOString().split('T')[0];
    const tags = memory.tags.length > 0 ? memory.tags.map((t) => `#${t}`).join(' ') : '';
    return `### ${index + 1}. ${memory.title}
- **Category**: ${memory.category}
- **Confidence**: ${confidenceStr} (${(confidence * 100).toFixed(0)}%)
- **Created**: ${date}
- **Tags**: ${tags || 'None'}

> ${memory.content}
`;
}
/**
 * Category summary
 */
function formatCategorySummary(stats, avgConfidence) {
    const lines = [];
    for (const [category, count] of stats) {
        lines.push(`- ${category}: ${count} items`);
    }
    return `## 📊 Memory Statistics

**Total Memories**: ${Array.from(stats.values()).reduce((a, b) => a + b, 0)} items
**Average Confidence**: ${(avgConfidence * 100).toFixed(1)}%

### By Category
${lines.join('\n')}
`;
}
export function createMemoriesSkill(context) {
    return {
        name: 'memories',
        displayName: 'Memories',
        description: 'Views learned memories.',
        triggers: ['memories', 'learnings', 'what did you learn'],
        autoActivate: false,
        handler: async ({ args, sessionState }) => {
            try {
                const manager = getMemoryManager();
                await manager.initialize();
                // Parse arguments
                const lowerArgs = (args || '').toLowerCase();
                // Filter options
                let category;
                let limit = 10;
                let showStats = false;
                // Category filter
                const categories = [
                    'preference', 'pattern', 'context', 'mistake',
                    'decision', 'convention', 'insight',
                ];
                for (const cat of categories) {
                    if (lowerArgs.includes(cat)) {
                        category = cat;
                        break;
                    }
                }
                // Statistics mode
                if (lowerArgs.includes('stats')) {
                    showStats = true;
                }
                // Limit count
                const limitMatch = lowerArgs.match(/(\d+)/);
                if (limitMatch) {
                    limit = parseInt(limitMatch[1], 10);
                }
                // Statistics mode
                if (showStats) {
                    const stats = await manager.getStats();
                    return {
                        success: true,
                        output: `# 🧠 Team-Shinchan Memory Statistics

${formatCategorySummary(stats.byCategory, stats.averageConfidence)}

### By Agent
${Array.from(stats.byOwner.entries())
                            .map(([owner, count]) => `- ${owner}: ${count} items`)
                            .join('\n')}

### Popular Tags
${stats.topTags.slice(0, 5).map(([tag, count]) => `- #${tag}: ${count} times`).join('\n')}
`,
                    };
                }
                // Search memories
                const result = await manager.search({
                    categories: category ? [category] : undefined,
                    sortBy: 'confidence',
                    sortOrder: 'desc',
                    limit,
                });
                if (result.memories.length === 0) {
                    return {
                        success: true,
                        output: `# 🧠 Learned Memories

No learned memories yet.

Memories are automatically learned during tasks, or you can teach directly with \`/learn "content"\`.`,
                    };
                }
                const memoryList = result.memories
                    .map((m, i) => formatMemory(m, i))
                    .join('\n---\n\n');
                return {
                    success: true,
                    output: `# 🧠 Learned Memories (${result.memories.length} of ${result.total})

${category ? `**Filter**: ${category}` : ''}

${memoryList}

---
💡 To see more: \`/memories 20\`
💡 By category: \`/memories preference\`
💡 View stats: \`/memories stats\`
`,
                };
            }
            catch (error) {
                return {
                    success: false,
                    output: `❌ Memory retrieval failed: ${error}`,
                };
            }
        },
    };
}
