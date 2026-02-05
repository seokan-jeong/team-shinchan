/**
 * Learning Extractor
 * Extract learning points from interactions
 */
/**
 * Detect coding style patterns
 */
const codingStylePatterns = [
    {
        name: 'naming_convention',
        category: 'convention',
        detect: (result) => {
            return result.codeChanges.some((c) => c.changeType === 'create' && (c.filePath.includes('component') || c.filePath.includes('service')));
        },
        extract: (result) => {
            const patterns = [];
            for (const change of result.codeChanges) {
                // Analyze filename patterns
                const fileName = change.filePath.split('/').pop() || '';
                if (fileName.includes('.component.')) {
                    patterns.push('Component file: *.component.{ext} pattern');
                }
                if (fileName.includes('.service.')) {
                    patterns.push('Service file: *.service.{ext} pattern');
                }
                if (fileName.includes('.test.') || fileName.includes('.spec.')) {
                    patterns.push('Test file: *.test.{ext} or *.spec.{ext} pattern');
                }
                if (fileName.match(/^[A-Z]/)) {
                    patterns.push('Using PascalCase filenames');
                }
                if (fileName.match(/^[a-z]+(-[a-z]+)*\./)) {
                    patterns.push('Using kebab-case filenames');
                }
            }
            if (patterns.length === 0)
                return null;
            return {
                title: 'File Naming Convention',
                content: [...new Set(patterns)].join('\n'),
                category: 'convention',
                scope: 'project',
                confidence: 0.6,
                tags: ['naming', 'convention', 'file'],
                sources: [result.taskId],
            };
        },
    },
    {
        name: 'folder_structure',
        category: 'context',
        detect: (result) => {
            return result.codeChanges.filter((c) => c.changeType === 'create').length >= 2;
        },
        extract: (result) => {
            const folders = new Set();
            for (const change of result.codeChanges) {
                const parts = change.filePath.split('/');
                if (parts.length > 1) {
                    folders.add(parts.slice(0, -1).join('/'));
                }
            }
            if (folders.size === 0)
                return null;
            return {
                title: 'Project Folder Structure',
                content: `Folders used:\n${[...folders].map((f) => `- ${f}`).join('\n')}`,
                category: 'context',
                scope: 'project',
                confidence: 0.7,
                tags: ['structure', 'folder', 'project'],
                sources: [result.taskId],
            };
        },
    },
];
/**
 * Detect task patterns
 */
const taskPatterns = [
    {
        name: 'common_task_type',
        category: 'pattern',
        detect: (result) => result.success,
        extract: (result) => {
            const taskType = detectTaskType(result.description);
            if (!taskType)
                return null;
            return {
                title: `Frequent task: ${taskType}`,
                content: `${taskType} task completed. Description: ${result.description}`,
                category: 'pattern',
                scope: 'global',
                confidence: 0.5,
                tags: ['task', taskType.toLowerCase()],
                sources: [result.taskId],
            };
        },
    },
    {
        name: 'agent_preference',
        category: 'preference',
        detect: (result) => result.success && result.agent !== 'shared',
        extract: (result) => {
            const taskType = detectTaskType(result.description);
            return {
                title: `${result.agent} agent task success`,
                content: `${result.agent} successfully completed "${result.description}" task.${taskType ? ` Task type: ${taskType}` : ''}`,
                category: 'pattern',
                scope: 'global',
                owner: result.agent,
                confidence: 0.5,
                tags: ['agent', result.agent, 'success'],
                sources: [result.taskId],
            };
        },
    },
];
/**
 * Detect mistake/correction patterns
 */
const mistakePatterns = [
    {
        name: 'error_recovery',
        category: 'mistake',
        detect: (result) => result.errors.length > 0 && result.success,
        extract: (result) => {
            return {
                title: 'Error Recovery Experience',
                content: `Errors occurred:\n${result.errors.map((e) => `- ${e}`).join('\n')}\n\nResolved.`,
                category: 'mistake',
                scope: 'project',
                confidence: 0.7,
                tags: ['error', 'recovery', 'debug'],
                sources: [result.taskId],
            };
        },
    },
    {
        name: 'failed_approach',
        category: 'mistake',
        detect: (result) => !result.success,
        extract: (result) => {
            return {
                title: 'Failed Approach',
                content: `Task "${result.description}" failed.\nError: ${result.errors.join(', ') || 'Unknown'}`,
                category: 'mistake',
                scope: 'project',
                confidence: 0.6,
                tags: ['failure', 'avoid'],
                sources: [result.taskId],
            };
        },
    },
];
/**
 * Detect task type
 */
function detectTaskType(description) {
    const lower = description.toLowerCase();
    const typePatterns = [
        [/component|ui|button|modal/i, 'UI Component'],
        [/api|endpoint|rest|graphql/i, 'API'],
        [/test|spec/i, 'Testing'],
        [/refactor/i, 'Refactoring'],
        [/bug|fix/i, 'Bug Fix'],
        [/style|css|tailwind/i, 'Styling'],
        [/deploy|ci|cd/i, 'Deployment'],
        [/doc|readme/i, 'Documentation'],
        [/config|install/i, 'Configuration'],
    ];
    for (const [pattern, type] of typePatterns) {
        if (pattern.test(lower)) {
            return type;
        }
    }
    return null;
}
/**
 * All patterns
 */
const allPatterns = [
    ...codingStylePatterns,
    ...taskPatterns,
    ...mistakePatterns,
];
/**
 * Execute learning extraction
 */
export function extractLearnings(result) {
    const learnings = [];
    const reinforceMemoryIds = [];
    const contradictMemoryIds = [];
    for (const pattern of allPatterns) {
        if (pattern.detect(result)) {
            const learning = pattern.extract(result);
            if (learning) {
                learnings.push(learning);
            }
        }
    }
    // Calculate extraction confidence
    const extractionConfidence = result.success ? 0.8 : 0.5;
    return {
        learnings,
        reinforceMemoryIds,
        contradictMemoryIds,
        extractionConfidence,
    };
}
/**
 * Create simple learning (for explicit learning)
 */
export function createSimpleLearning(content, options = {}) {
    // Auto-generate title (first line or first 50 characters)
    const firstLine = content.split('\n')[0];
    const title = firstLine.length > 50 ? firstLine.slice(0, 47) + '...' : firstLine;
    // Auto-detect category
    const category = options.category || detectCategory(content);
    return {
        title,
        content,
        category,
        scope: options.scope || 'global',
        owner: options.owner,
        confidence: 0.7,
        tags: options.tags || extractTags(content),
        sources: options.source ? [options.source] : [],
    };
}
/**
 * Auto-detect category
 */
function detectCategory(content) {
    const lower = content.toLowerCase();
    if (/prefer|like|dislike|always|never/i.test(lower)) {
        return 'preference';
    }
    if (/pattern|repeat|workflow/i.test(lower)) {
        return 'pattern';
    }
    if (/architecture|structure|tech stack|framework/i.test(lower)) {
        return 'context';
    }
    if (/mistake|error|caution/i.test(lower)) {
        return 'mistake';
    }
    if (/decision|choice|chose/i.test(lower)) {
        return 'decision';
    }
    if (/convention|rule/i.test(lower)) {
        return 'convention';
    }
    return 'insight';
}
/**
 * Auto-extract tags
 */
function extractTags(content) {
    const tags = [];
    // Tech keywords
    const techKeywords = [
        'react', 'vue', 'angular', 'typescript', 'javascript',
        'python', 'go', 'rust', 'java', 'node',
        'css', 'tailwind', 'sass', 'scss',
        'api', 'rest', 'graphql', 'database', 'sql',
        'docker', 'kubernetes', 'aws', 'gcp', 'azure',
        'git', 'ci', 'cd', 'test', 'deploy',
    ];
    const lower = content.toLowerCase();
    for (const keyword of techKeywords) {
        if (lower.includes(keyword)) {
            tags.push(keyword);
        }
    }
    // Extract hashtags
    const hashtagMatches = content.match(/#\w+/g);
    if (hashtagMatches) {
        tags.push(...hashtagMatches.map((t) => t.slice(1)));
    }
    return [...new Set(tags)].slice(0, 10);
}
/**
 * Extract learning from code changes
 */
export function extractFromCodeChanges(changes) {
    const learnings = [];
    // Group by language
    const byLanguage = new Map();
    for (const change of changes) {
        const lang = change.language || 'unknown';
        const existing = byLanguage.get(lang) || [];
        existing.push(change);
        byLanguage.set(lang, existing);
    }
    // Analyze patterns by language
    for (const [language, langChanges] of byLanguage) {
        if (langChanges.length >= 2) {
            learnings.push({
                title: `${language} Code Work Pattern`,
                content: `Worked on ${langChanges.length} ${language} files. Files: ${langChanges.map((c) => c.filePath.split('/').pop()).join(', ')}`,
                category: 'pattern',
                scope: 'project',
                confidence: 0.5,
                tags: ['code', language.toLowerCase()],
                sources: [],
            });
        }
    }
    return learnings;
}
