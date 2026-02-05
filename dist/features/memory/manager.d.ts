/**
 * Memory Manager
 * Main interface for memory system
 */
import type { MemoryEntry, CreateMemoryInput, UpdateMemoryInput, MemoryQuery, MemorySearchResult, MemorySummary } from './types';
import { MemoryStorage } from './storage';
/**
 * Memory Manager Class
 */
export declare class MemoryManager {
    private storage;
    private cache;
    private cacheExpiry;
    constructor(storage?: MemoryStorage);
    /**
     * Initialize
     */
    initialize(): Promise<void>;
    /**
     * Load Memories (with cache)
     */
    loadMemories(force?: boolean): Promise<void>;
    /**
     * Get All Memories (merge global + project)
     */
    getAllMemories(): MemoryEntry[];
    /**
     * Create Memory
     */
    create(input: CreateMemoryInput): Promise<MemoryEntry>;
    /**
     * Read Memory
     */
    read(id: string): Promise<MemoryEntry | null>;
    /**
     * Update Memory
     */
    update(id: string, input: UpdateMemoryInput): Promise<MemoryEntry | null>;
    /**
     * Delete Memory
     */
    delete(id: string): Promise<boolean>;
    /**
     * Search Memories
     */
    search(query: MemoryQuery, context?: {
        keywords?: string[];
        currentTask?: string;
        currentAgent?: string;
        recentTags?: string[];
    }): Promise<MemorySearchResult>;
    /**
     * Reinforce Memory
     */
    reinforce(id: string): Promise<MemoryEntry | null>;
    /**
     * Contradict Memory
     */
    contradict(id: string): Promise<MemoryEntry | null>;
    /**
     * Find Similar Memories
     */
    findSimilar(id: string, limit?: number): Promise<MemoryEntry[]>;
    /**
     * Generate Memory Summary
     */
    generateSummary(query?: MemoryQuery, maxTokens?: number): Promise<MemorySummary>;
    /**
     * Process Decay (Batch)
     */
    processDecay(): Promise<{
        removed: number;
        remaining: number;
    }>;
    /**
     * Get Statistics
     */
    getStats(): Promise<{
        total: number;
        global: number;
        project: number;
        byCategory: Map<string, number>;
        byOwner: Map<string, number>;
        averageConfidence: number;
        topTags: [string, number][];
    }>;
    /**
     * Forget by Keyword
     */
    forget(keyword: string): Promise<number>;
    /**
     * Invalidate Cache
     */
    private invalidateCache;
    /**
     * Create Backup
     */
    backup(): Promise<string>;
}
export declare function getMemoryManager(): MemoryManager;
export declare function setMemoryManager(manager: MemoryManager): void;
//# sourceMappingURL=manager.d.ts.map