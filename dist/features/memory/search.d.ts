/**
 * Memory Search
 * Memory search and relevance calculation
 */
import type { MemoryEntry, MemoryQuery, MemorySearchResult, MemoryCategory } from './types';
/**
 * Filter Memories
 */
export declare function filterMemories(memories: MemoryEntry[], query: MemoryQuery): MemoryEntry[];
/**
 * Calculate Relevance Score
 */
export declare function calculateRelevanceScore(memory: MemoryEntry, context: {
    keywords?: string[];
    currentTask?: string;
    currentAgent?: string;
    recentTags?: string[];
}): number;
/**
 * Sort Memories
 */
export declare function sortMemories(memories: MemoryEntry[], sortBy?: MemoryQuery['sortBy'], sortOrder?: MemoryQuery['sortOrder'], relevanceScores?: Map<string, number>): MemoryEntry[];
/**
 * Search Memories
 */
export declare function searchMemories(memories: MemoryEntry[], query: MemoryQuery, context?: {
    keywords?: string[];
    currentTask?: string;
    currentAgent?: string;
    recentTags?: string[];
}): MemorySearchResult;
/**
 * Find Similar Memories
 */
export declare function findSimilarMemories(targetMemory: MemoryEntry, allMemories: MemoryEntry[], limit?: number): MemoryEntry[];
/**
 * Group Memories by Category
 */
export declare function groupByCategory(memories: MemoryEntry[]): Map<MemoryCategory, MemoryEntry[]>;
/**
 * Analyze Tag Frequency
 */
export declare function analyzeTagFrequency(memories: MemoryEntry[]): Map<string, number>;
/**
 * Generate Search Suggestions
 */
export declare function generateSearchSuggestions(memories: MemoryEntry[], partialQuery: string, limit?: number): string[];
//# sourceMappingURL=search.d.ts.map