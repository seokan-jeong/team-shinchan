/**
 * Learn Skill - Explicit Learning
 */
import { getMemoryManager } from '../../memory';
import { createSimpleLearning } from '../../learning';
/**
 * Parse options from arguments
 */
function parseLearnArgs(args) {
    let content = args;
    let category;
    let scope;
    const tags = [];
    // Extract hashtags
    const tagMatches = args.match(/#\w+/g);
    if (tagMatches) {
        tags.push(...tagMatches.map((t) => t.slice(1)));
        content = content.replace(/#\w+/g, '').trim();
    }
    // Specify category (--category=xxx)
    const categoryMatch = args.match(/--category[=:]?\s*(\w+)/i);
    if (categoryMatch) {
        const cat = categoryMatch[1].toLowerCase();
        const validCategories = [
            'preference', 'pattern', 'context', 'mistake',
            'decision', 'convention', 'insight',
        ];
        if (validCategories.includes(cat)) {
            category = cat;
        }
        content = content.replace(/--category[=:]?\s*\w+/i, '').trim();
    }
    // Specify scope (--global or --project)
    if (args.includes('--global')) {
        scope = 'global';
        content = content.replace(/--global/i, '').trim();
    }
    else if (args.includes('--project')) {
        scope = 'project';
        content = content.replace(/--project/i, '').trim();
    }
    return { content, category, scope, tags };
}
export function createLearnSkill(context) {
    return {
        name: 'learn',
        displayName: 'Learn',
        description: 'Explicitly learns new content.',
        triggers: ['learn', 'remember this', 'memorize'],
        autoActivate: false,
        handler: async ({ args, sessionState }) => {
            if (!args || args.trim() === '') {
                return {
                    success: false,
                    output: `# ❌ Learning Content Required

Please enter the content to learn using the format \`/learn "content"\`.

**Usage:**
\`\`\`
/learn I always use .component.tsx extension for components

/learn Always display API errors in Korean #preference #api

/learn --category=convention Use camelCase for variable names

/learn --project --category=context This project uses Next.js 14
\`\`\`

**Options:**
- \`#tag\` - Add tag
- \`--category=xxx\` - Specify category (preference, pattern, convention, etc.)
- \`--global\` - Apply to all projects
- \`--project\` - Apply to current project only (default)`,
                };
            }
            try {
                const manager = getMemoryManager();
                await manager.initialize();
                const { content, category, scope, tags } = parseLearnArgs(args);
                if (!content) {
                    return {
                        success: false,
                        output: '❌ Learning content is empty.',
                    };
                }
                // Create learning
                const learning = createSimpleLearning(content, {
                    category,
                    scope: scope || 'project',
                    tags,
                    source: 'explicit-learn',
                });
                // Set high confidence (explicit learning)
                learning.confidence = 0.9;
                // Save
                const memory = await manager.create(learning);
                return {
                    success: true,
                    output: `# ✅ Learning Complete!

**Title**: ${memory.title}
**Category**: ${memory.category}
**Scope**: ${memory.scope === 'global' ? 'Global (all projects)' : 'Project-specific'}
**Tags**: ${memory.tags.length > 0 ? memory.tags.map((t) => `#${t}`).join(' ') : 'None'}

> ${memory.content}

---
This content will be reflected in future agent behavior.

💡 Check learned content: \`/memories\`
💡 Delete learning: \`/forget "${memory.title.slice(0, 10)}..."\``,
                };
            }
            catch (error) {
                return {
                    success: false,
                    output: `❌ Learning failed: ${error}`,
                };
            }
        },
    };
}
