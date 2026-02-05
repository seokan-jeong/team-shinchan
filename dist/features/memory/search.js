/**
 * Memory Search
 * Memory search and relevance calculation
 */
import { calculateEffectiveConfidence } from './decay';
/**
 * Calculate keyword matching score
 */
function calculateKeywordScore(memory, keyword) {
    const lowerKeyword = keyword.toLowerCase();
    let score = 0;
    // Title match (high weight)
    if (memory.title.toLowerCase().includes(lowerKeyword)) {
        score += 3;
    }
    // Content match
    const contentLower = memory.content.toLowerCase();
    const contentMatches = (contentLower.match(new RegExp(lowerKeyword, 'g')) || []).length;
    score += Math.min(contentMatches, 5); // Max 5 points
    // Tag match (exact)
    if (memory.tags.some((tag) => tag.toLowerCase() === lowerKeyword)) {
        score += 4;
    }
    // Tag partial match
    if (memory.tags.some((tag) => tag.toLowerCase().includes(lowerKeyword))) {
        score += 2;
    }
    return score;
}
/**
 * Date filtering
 */
function isWithinDays(memory, days) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return memory.updatedAt >= cutoff;
}
/**
 * Filter memories
 */
export function filterMemories(memories, query) {
    return memories.filter((memory) => {
        // Category filter
        if (query.categories && query.categories.length > 0) {
            if (!query.categories.includes(memory.category)) {
                return false;
            }
        }
        // Scope filter
        if (query.scope && memory.scope !== query.scope) {
            return false;
        }
        // Owner filter
        if (query.owner && memory.owner !== query.owner) {
            return false;
        }
        // Minimum confidence filter
        if (query.minConfidence !== undefined) {
            const effectiveConfidence = calculateEffectiveConfidence(memory);
            if (effectiveConfidence < query.minConfidence) {
                return false;
            }
        }
        // Tag filter (AND condition)
        if (query.tags && query.tags.length > 0) {
            const memoryTagsLower = memory.tags.map((t) => t.toLowerCase());
            const hasAllTags = query.tags.every((tag) => memoryTagsLower.includes(tag.toLowerCase()));
            if (!hasAllTags) {
                return false;
            }
        }
        // Date filter
        if (query.withinDays !== undefined) {
            if (!isWithinDays(memory, query.withinDays)) {
                return false;
            }
        }
        // Keyword filter
        if (query.keyword) {
            const score = calculateKeywordScore(memory, query.keyword);
            if (score === 0) {
                return false;
            }
        }
        return true;
    });
}
/**
 * Calculate relevance score
 */
export function calculateRelevanceScore(memory, context) {
    let score = 0;
    // Base confidence score
    const effectiveConfidence = calculateEffectiveConfidence(memory);
    score += effectiveConfidence * 10;
    // Keyword matching
    if (context.keywords) {
        for (const keyword of context.keywords) {
            score += calculateKeywordScore(memory, keyword) * 2;
        }
    }
    // Relevance to current task
    if (context.currentTask) {
        const taskWords = context.currentTask.toLowerCase().split(/\s+/);
        for (const word of taskWords) {
            if (word.length > 2) {
                // Ignore short words
                score += calculateKeywordScore(memory, word) * 0.5;
            }
        }
    }
    // Agent matching
    if (context.currentAgent && memory.owner === context.currentAgent) {
        score += 5;
    }
    // Recent tag matching
    if (context.recentTags) {
        const matchingTags = memory.tags.filter((tag) => context.recentTags.some((rt) => rt.toLowerCase() === tag.toLowerCase()));
        score += matchingTags.length * 3;
    }
    // Recent access bonus
    const daysSinceAccess = Math.floor((Date.now() - memory.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceAccess < 7) {
        score += (7 - daysSinceAccess) * 0.5;
    }
    // Reinforcement count bonus
    score += Math.min(memory.reinforcementCount, 10) * 0.5;
    return score;
}
/**
 * Sort memories
 */
export function sortMemories(memories, sortBy = 'relevance', sortOrder = 'desc', relevanceScores) {
    const sorted = [...memories].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
            case 'confidence':
                comparison = calculateEffectiveConfidence(a) - calculateEffectiveConfidence(b);
                break;
            case 'createdAt':
                comparison = a.createdAt.getTime() - b.createdAt.getTime();
                break;
            case 'updatedAt':
                comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
                break;
            case 'accessCount':
                comparison = a.accessCount - b.accessCount;
                break;
            case 'relevance':
            default:
                if (relevanceScores) {
                    comparison = (relevanceScores.get(a.id) || 0) - (relevanceScores.get(b.id) || 0);
                }
                else {
                    comparison = calculateEffectiveConfidence(a) - calculateEffectiveConfidence(b);
                }
                break;
        }
        return sortOrder === 'desc' ? -comparison : comparison;
    });
    return sorted;
}
/**
 * Search memories
 */
export function searchMemories(memories, query, context) {
    // Filter
    let filtered = filterMemories(memories, query);
    // Calculate relevance scores
    const scores = new Map();
    for (const memory of filtered) {
        const score = calculateRelevanceScore(memory, context || {});
        scores.set(memory.id, score);
    }
    // Sort
    const sorted = sortMemories(filtered, query.sortBy, query.sortOrder, scores);
    // Pagination
    const offset = query.offset || 0;
    const limit = query.limit || sorted.length;
    const paginated = sorted.slice(offset, offset + limit);
    return {
        memories: paginated,
        total: filtered.length,
        scores,
    };
}
/**
 * Find similar memories
 */
export function findSimilarMemories(targetMemory, allMemories, limit = 5) {
    const scores = new Map();
    for (const memory of allMemories) {
        if (memory.id === targetMemory.id)
            continue;
        let score = 0;
        // Same category bonus
        if (memory.category === targetMemory.category) {
            score += 5;
        }
        // Same owner bonus
        if (memory.owner === targetMemory.owner) {
            score += 3;
        }
        // Tag similarity
        const commonTags = memory.tags.filter((tag) => targetMemory.tags.some((tt) => tt.toLowerCase() === tag.toLowerCase()));
        score += commonTags.length * 2;
        // Content keyword matching
        const targetWords = targetMemory.content.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
        for (const word of targetWords.slice(0, 10)) {
            if (memory.content.toLowerCase().includes(word)) {
                score += 1;
            }
        }
        scores.set(memory.id, score);
    }
    return allMemories
        .filter((m) => m.id !== targetMemory.id && (scores.get(m.id) || 0) > 0)
        .sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0))
        .slice(0, limit);
}
/**
 * Group memories by category
 */
export function groupByCategory(memories) {
    const groups = new Map();
    for (const memory of memories) {
        const existing = groups.get(memory.category) || [];
        existing.push(memory);
        groups.set(memory.category, existing);
    }
    return groups;
}
/**
 * Analyze tag frequency
 */
export function analyzeTagFrequency(memories) {
    const frequency = new Map();
    for (const memory of memories) {
        for (const tag of memory.tags) {
            const lowerTag = tag.toLowerCase();
            frequency.set(lowerTag, (frequency.get(lowerTag) || 0) + 1);
        }
    }
    return new Map([...frequency.entries()].sort((a, b) => b[1] - a[1]));
}
/**
 * Generate search suggestions
 */
export function generateSearchSuggestions(memories, partialQuery, limit = 5) {
    const suggestions = new Set();
    const lowerQuery = partialQuery.toLowerCase();
    // Suggestions from titles
    for (const memory of memories) {
        if (memory.title.toLowerCase().includes(lowerQuery)) {
            suggestions.add(memory.title);
        }
    }
    // Suggestions from tags
    for (const memory of memories) {
        for (const tag of memory.tags) {
            if (tag.toLowerCase().includes(lowerQuery)) {
                suggestions.add(tag);
            }
        }
    }
    return [...suggestions].slice(0, limit);
}
