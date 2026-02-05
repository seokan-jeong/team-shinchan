/**
 * Memory Manager
 * Main interface for the memory system
 */
import { v4 as uuidv4 } from 'uuid';
import { getDefaultStorage } from './storage';
import { applyDecay, reinforceMemory, contradictMemory, recordAccess, processBatchDecay, calculateEffectiveConfidence, } from './decay';
import { detectBatchConflicts, autoResolveConflicts } from './conflict';
import { searchMemories, findSimilarMemories, groupByCategory, analyzeTagFrequency } from './search';
/**
 * Memory Manager class
 */
export class MemoryManager {
    storage;
    cache;
    cacheExpiry = 5 * 60 * 1000; // 5 minutes
    constructor(storage) {
        this.storage = storage || getDefaultStorage();
        this.cache = {
            global: [],
            project: [],
            lastLoaded: null,
        };
    }
    /**
     * Initialize
     */
    async initialize() {
        await this.storage.initialize();
        await this.loadMemories();
    }
    /**
     * Load memories (with caching)
     */
    async loadMemories(force = false) {
        const now = new Date();
        // Skip loading if cache is valid
        if (!force &&
            this.cache.lastLoaded &&
            now.getTime() - this.cache.lastLoaded.getTime() < this.cacheExpiry) {
            return;
        }
        const { global, project } = await this.storage.loadAllMemories();
        // Apply decay
        this.cache.global = global.map((m) => applyDecay(m));
        this.cache.project = project.map((m) => applyDecay(m));
        this.cache.lastLoaded = now;
    }
    /**
     * Get all memories (merge global + project)
     */
    getAllMemories() {
        // Project memories take priority (use project version for same ID)
        const projectIds = new Set(this.cache.project.map((m) => m.id));
        const globalFiltered = this.cache.global.filter((m) => !projectIds.has(m.id));
        return [...this.cache.project, ...globalFiltered];
    }
    /**
     * Create memory
     */
    async create(input) {
        await this.loadMemories();
        const now = new Date();
        const allMemories = this.getAllMemories();
        // Check for conflicts
        const conflicts = detectBatchConflicts(allMemories, input);
        if (conflicts.length > 0) {
            const resolutions = autoResolveConflicts(conflicts);
            const firstConflict = conflicts[0];
            const resolution = resolutions.get(firstConflict.existing.id);
            if (resolution) {
                switch (resolution.action) {
                    case 'keep_existing':
                        // Reinforce existing memory
                        const reinforced = reinforceMemory(firstConflict.existing);
                        await this.storage.saveMemory(reinforced);
                        this.invalidateCache();
                        return reinforced;
                    case 'replace':
                        // Mark existing memory as contradicted, then create new
                        const contradicted = contradictMemory(firstConflict.existing);
                        await this.storage.saveMemory(contradicted);
                        break;
                    case 'merge':
                        // Merge
                        if (resolution.mergedMemory) {
                            await this.storage.saveMemory(resolution.mergedMemory);
                            this.invalidateCache();
                            return resolution.mergedMemory;
                        }
                        break;
                }
            }
        }
        // Create new memory
        const memory = {
            id: uuidv4(),
            title: input.title,
            content: input.content,
            category: input.category,
            scope: input.scope,
            owner: input.owner || 'shared',
            confidence: input.confidence ?? 0.5,
            tags: input.tags || [],
            sources: input.sources || [],
            createdAt: now,
            updatedAt: now,
            lastAccessedAt: now,
            accessCount: 0,
            reinforcementCount: 0,
            decayFactor: 1.0,
            contradictionCount: 0,
            relatedMemories: input.relatedMemories || [],
            metadata: input.metadata || {},
        };
        await this.storage.saveMemory(memory);
        this.invalidateCache();
        return memory;
    }
    /**
     * Read memory
     */
    async read(id) {
        await this.loadMemories();
        const memory = this.getAllMemories().find((m) => m.id === id);
        if (memory) {
            // Record access
            const updated = recordAccess(memory);
            await this.storage.saveMemory(updated);
            return updated;
        }
        return null;
    }
    /**
     * Update memory
     */
    async update(id, input) {
        await this.loadMemories();
        const memory = this.getAllMemories().find((m) => m.id === id);
        if (!memory) {
            return null;
        }
        const now = new Date();
        const updated = {
            ...memory,
            title: input.title ?? memory.title,
            content: input.content ?? memory.content,
            category: input.category ?? memory.category,
            confidence: input.confidence ?? memory.confidence,
            tags: input.tags ?? memory.tags,
            sources: input.sources ?? memory.sources,
            relatedMemories: input.relatedMemories ?? memory.relatedMemories,
            metadata: { ...memory.metadata, ...(input.metadata || {}) },
            updatedAt: now,
        };
        await this.storage.saveMemory(updated);
        this.invalidateCache();
        return updated;
    }
    /**
     * Delete memory
     */
    async delete(id) {
        await this.loadMemories();
        const memory = this.getAllMemories().find((m) => m.id === id);
        if (!memory) {
            return false;
        }
        const result = await this.storage.deleteMemory(id, memory.scope);
        this.invalidateCache();
        return result;
    }
    /**
     * Search memories
     */
    async search(query, context) {
        await this.loadMemories();
        return searchMemories(this.getAllMemories(), query, context);
    }
    /**
     * Reinforce memory
     */
    async reinforce(id) {
        await this.loadMemories();
        const memory = this.getAllMemories().find((m) => m.id === id);
        if (!memory) {
            return null;
        }
        const reinforced = reinforceMemory(memory);
        await this.storage.saveMemory(reinforced);
        this.invalidateCache();
        return reinforced;
    }
    /**
     * Contradict memory
     */
    async contradict(id) {
        await this.loadMemories();
        const memory = this.getAllMemories().find((m) => m.id === id);
        if (!memory) {
            return null;
        }
        const contradicted = contradictMemory(memory);
        await this.storage.saveMemory(contradicted);
        this.invalidateCache();
        return contradicted;
    }
    /**
     * Find similar memories
     */
    async findSimilar(id, limit = 5) {
        await this.loadMemories();
        const memory = this.getAllMemories().find((m) => m.id === id);
        if (!memory) {
            return [];
        }
        return findSimilarMemories(memory, this.getAllMemories(), limit);
    }
    /**
     * Generate memory summary
     */
    async generateSummary(query, maxTokens = 500) {
        await this.loadMemories();
        let memories = this.getAllMemories();
        if (query) {
            const result = await this.search(query);
            memories = result.memories;
        }
        // Sort by confidence (highest first)
        const sorted = memories
            .map((m) => ({ memory: m, confidence: calculateEffectiveConfidence(m) }))
            .sort((a, b) => b.confidence - a.confidence);
        // Generate summary within token budget
        const lines = [];
        const includedIds = [];
        let estimatedTokens = 0;
        const tokensPerChar = 0.25; // Rough estimate
        for (const { memory } of sorted) {
            const line = `- [${memory.category}] ${memory.title}: ${memory.content.slice(0, 100)}${memory.content.length > 100 ? '...' : ''}`;
            const lineTokens = Math.ceil(line.length * tokensPerChar);
            if (estimatedTokens + lineTokens > maxTokens) {
                break;
            }
            lines.push(line);
            includedIds.push(memory.id);
            estimatedTokens += lineTokens;
        }
        return {
            text: lines.join('\n'),
            includedMemoryIds: includedIds,
            generatedAt: new Date(),
            estimatedTokens,
        };
    }
    /**
     * Process decay (batch)
     */
    async processDecay() {
        await this.loadMemories(true);
        const globalResult = processBatchDecay(this.cache.global, {
            threshold: this.storage.getConfig().decayThreshold,
            applyChanges: true,
        });
        const projectResult = processBatchDecay(this.cache.project, {
            threshold: this.storage.getConfig().decayThreshold,
            applyChanges: true,
        });
        // Delete expired memories
        for (const memory of [...globalResult.removed, ...projectResult.removed]) {
            await this.storage.deleteMemory(memory.id, memory.scope);
        }
        this.invalidateCache();
        return {
            removed: globalResult.removed.length + projectResult.removed.length,
            remaining: globalResult.processed.length + projectResult.processed.length,
        };
    }
    /**
     * Get statistics
     */
    async getStats() {
        await this.loadMemories();
        const all = this.getAllMemories();
        const byCategory = groupByCategory(all);
        const tagFrequency = analyzeTagFrequency(all);
        const categoryCount = new Map();
        for (const [cat, memories] of byCategory) {
            categoryCount.set(cat, memories.length);
        }
        const ownerCount = new Map();
        for (const memory of all) {
            ownerCount.set(memory.owner, (ownerCount.get(memory.owner) || 0) + 1);
        }
        const avgConfidence = all.length > 0
            ? all.reduce((sum, m) => sum + calculateEffectiveConfidence(m), 0) / all.length
            : 0;
        return {
            total: all.length,
            global: this.cache.global.length,
            project: this.cache.project.length,
            byCategory: categoryCount,
            byOwner: ownerCount,
            averageConfidence: avgConfidence,
            topTags: [...tagFrequency.entries()].slice(0, 10),
        };
    }
    /**
     * Forget by keyword
     */
    async forget(keyword) {
        await this.loadMemories();
        const result = await this.search({ keyword });
        let deletedCount = 0;
        for (const memory of result.memories) {
            const deleted = await this.delete(memory.id);
            if (deleted) {
                deletedCount++;
            }
        }
        return deletedCount;
    }
    /**
     * Invalidate cache
     */
    invalidateCache() {
        this.cache.lastLoaded = null;
    }
    /**
     * Create backup
     */
    async backup() {
        return this.storage.createBackup();
    }
}
/**
 * Default manager instance
 */
let defaultManager = null;
export function getMemoryManager() {
    if (!defaultManager) {
        defaultManager = new MemoryManager();
    }
    return defaultManager;
}
export function setMemoryManager(manager) {
    defaultManager = manager;
}
