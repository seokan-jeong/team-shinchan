/**
 * Context Injector
 * Inject memory into agent prompts
 */
import { getMemoryManager } from '../memory/manager';
import { calculateRelevanceScore } from '../memory/search';
import { calculateEffectiveConfidence } from '../memory/decay';
/**
 * Default options
 */
const DEFAULT_OPTIONS = {
    currentTask: '',
    keywords: [],
    maxTokens: 500,
    includeCategories: [],
    excludeCategories: [],
    minConfidence: 0.3,
    includeDetails: false,
};
/**
 * Estimate token count (character-based)
 */
function estimateTokens(text) {
    // Korean characters: ~1.5 tokens/char, English: ~0.25 tokens/char
    const koreanChars = (text.match(/[가-힣]/g) || []).length;
    const otherChars = text.length - koreanChars;
    return Math.ceil(koreanChars * 1.5 + otherChars * 0.25);
}
/**
 * Filter memories
 */
function filterMemories(memories, options) {
    return memories.filter((memory) => {
        // Confidence filter
        const confidence = calculateEffectiveConfidence(memory);
        if (confidence < options.minConfidence) {
            return false;
        }
        // Include category filter
        if (options.includeCategories.length > 0) {
            if (!options.includeCategories.includes(memory.category)) {
                return false;
            }
        }
        // Exclude category filter
        if (options.excludeCategories.length > 0) {
            if (options.excludeCategories.includes(memory.category)) {
                return false;
            }
        }
        return true;
    });
}
/**
 * Rank memories by relevance
 */
function rankMemories(memories, options) {
    const scores = new Map();
    for (const memory of memories) {
        let score = calculateRelevanceScore(memory, {
            keywords: options.keywords,
            currentTask: options.currentTask,
            currentAgent: options.agent,
        });
        // Bonus for agent-specific memory
        if (memory.owner === options.agent) {
            score *= 1.5;
        }
        // Slight penalty for shared memory
        if (memory.owner === 'shared') {
            score *= 0.9;
        }
        scores.set(memory.id, score);
    }
    return memories.sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));
}
/**
 * Convert memory to summary line
 */
function memoryToSummaryLine(memory) {
    const confidence = calculateEffectiveConfidence(memory);
    const confidenceStr = confidence >= 0.8 ? '⭐' : confidence >= 0.5 ? '○' : '·';
    return `${confidenceStr} [${memory.category}] ${memory.title}: ${memory.content.slice(0, 80)}${memory.content.length > 80 ? '...' : ''}`;
}
/**
 * Generate summary
 */
function generateSummary(memories, maxTokens) {
    const lines = [];
    const includedIds = [];
    let currentTokens = 0;
    // Header
    const header = '## Learned Context\n';
    currentTokens += estimateTokens(header);
    for (const memory of memories) {
        const line = memoryToSummaryLine(memory);
        const lineTokens = estimateTokens(line + '\n');
        if (currentTokens + lineTokens > maxTokens) {
            break;
        }
        lines.push(line);
        includedIds.push(memory.id);
        currentTokens += lineTokens;
    }
    return {
        text: header + lines.join('\n'),
        includedIds,
        tokens: currentTokens,
    };
}
/**
 * Generate context injection
 */
export async function generateContextInjection(options) {
    const fullOptions = {
        ...DEFAULT_OPTIONS,
        ...options,
    };
    const manager = getMemoryManager();
    await manager.loadMemories();
    // Get all memories
    let memories = manager.getAllMemories();
    // Filter
    memories = filterMemories(memories, fullOptions);
    // Sort by relevance
    memories = rankMemories(memories, fullOptions);
    // Generate summary
    const { text, includedIds, tokens } = generateSummary(memories, fullOptions.maxTokens);
    // Detailed memories (optional)
    const details = fullOptions.includeDetails
        ? memories.filter((m) => includedIds.includes(m.id))
        : [];
    // Included categories
    const includedCategories = [
        ...new Set(memories
            .filter((m) => includedIds.includes(m.id))
            .map((m) => m.category)),
    ];
    return {
        summary: text,
        details,
        totalTokens: tokens,
        includedCategories,
    };
}
/**
 * Generate agent-optimized context
 */
export async function generateAgentContext(agent, task) {
    // Default category settings per agent
    const agentCategories = {
        maenggu: ['pattern', 'convention', 'mistake'],
        suji: ['preference', 'convention', 'context'],
        heukgom: ['context', 'decision', 'pattern'],
        shinhyungman: ['insight', 'decision', 'mistake'],
        yuri: ['decision', 'context', 'pattern'],
        actiongamen: ['mistake', 'convention', 'insight'],
    };
    const injection = await generateContextInjection({
        agent,
        currentTask: task,
        keywords: extractKeywords(task),
        includeCategories: agentCategories[agent] || [],
        maxTokens: 400,
    });
    if (injection.summary.trim() === '## Learned Context') {
        return ''; // No memory
    }
    return `
<learned-context>
${injection.summary}
</learned-context>
`;
}
/**
 * Extract keywords
 */
function extractKeywords(text) {
    // Remove stop words
    const stopWords = new Set([
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
        'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'this', 'that',
    ]);
    const words = text
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w));
    return [...new Set(words)].slice(0, 10);
}
/**
 * Inject context into prompt
 */
export function injectContextIntoPrompt(originalPrompt, context, position = 'after-system') {
    if (!context.trim()) {
        return originalPrompt;
    }
    switch (position) {
        case 'start':
            return context + '\n\n' + originalPrompt;
        case 'end':
            return originalPrompt + '\n\n' + context;
        case 'after-system':
            // Insert right after system prompt
            const systemEndMarkers = ['</system>', '---', '\n\n'];
            for (const marker of systemEndMarkers) {
                const index = originalPrompt.indexOf(marker);
                if (index !== -1) {
                    const insertPoint = index + marker.length;
                    return (originalPrompt.slice(0, insertPoint) +
                        '\n\n' +
                        context +
                        '\n\n' +
                        originalPrompt.slice(insertPoint));
                }
            }
            // If no marker found, insert at start
            return context + '\n\n' + originalPrompt;
        default:
            return originalPrompt;
    }
}
/**
 * Cached context management
 */
class ContextCache {
    cache = new Map();
    ttl = 5 * 60 * 1000; // 5 minutes
    get(agent, taskHash) {
        const key = `${agent}:${taskHash}`;
        const entry = this.cache.get(key);
        if (entry && Date.now() - entry.timestamp < this.ttl) {
            return entry.context;
        }
        return null;
    }
    set(agent, taskHash, context) {
        const key = `${agent}:${taskHash}`;
        this.cache.set(key, { context, timestamp: Date.now() });
    }
    invalidate() {
        this.cache.clear();
    }
}
export const contextCache = new ContextCache();
/**
 * Generate cached context
 */
export async function getCachedAgentContext(agent, task) {
    const taskHash = simpleHash(task);
    const cached = contextCache.get(agent, taskHash);
    if (cached !== null) {
        return cached;
    }
    const context = await generateAgentContext(agent, task);
    contextCache.set(agent, taskHash, context);
    return context;
}
/**
 * Simple hash function
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}
