/**
 * Memory System Types
 * Type definitions for agent learning and memory system
 */
/**
 * Memory Category
 */
export type MemoryCategory = 'preference' | 'pattern' | 'context' | 'mistake' | 'decision' | 'convention' | 'insight';
/**
 * Memory Scope
 */
export type MemoryScope = 'global' | 'project';
/**
 * Agent Name (Memory Owner)
 */
export type MemoryOwner = 'shared' | 'jjangu' | 'jjanga' | 'maenggu' | 'cheolsu' | 'suji' | 'heukgom' | 'hooni' | 'shinhyungman' | 'yuri' | 'bongmisun' | 'actiongamen' | 'heendungi' | 'chaesunga' | 'namiri';
/**
 * Memory Entry
 */
export interface MemoryEntry {
    /** Unique ID */
    id: string;
    /** Memory Title */
    title: string;
    /** Memory Content */
    content: string;
    /** Category */
    category: MemoryCategory;
    /** Scope */
    scope: MemoryScope;
    /** Owner (agent or shared) */
    owner: MemoryOwner;
    /** Confidence Score (0.0 ~ 1.0) */
    confidence: number;
    /** Tag List */
    tags: string[];
    /** Source (which task/interaction it was learned from) */
    sources: string[];
    /** Creation Time */
    createdAt: Date;
    /** Last Update Time */
    updatedAt: Date;
    /** Last Access Time */
    lastAccessedAt: Date;
    /** Access Count */
    accessCount: number;
    /** Reinforcement Count (how many times same pattern confirmed) */
    reinforcementCount: number;
    /** Decay Factor (0.0 ~ 1.0, decreases over time) */
    decayFactor: number;
    /** Contradiction Count (how many conflicting behaviors) */
    contradictionCount: number;
    /** Related Memory ID List */
    relatedMemories: string[];
    /** Metadata */
    metadata: Record<string, unknown>;
}
/**
 * Memory Creation Input
 */
export interface CreateMemoryInput {
    title: string;
    content: string;
    category: MemoryCategory;
    scope: MemoryScope;
    owner?: MemoryOwner;
    confidence?: number;
    tags?: string[];
    sources?: string[];
    relatedMemories?: string[];
    metadata?: Record<string, unknown>;
}
/**
 * Memory Update Input
 */
export interface UpdateMemoryInput {
    title?: string;
    content?: string;
    category?: MemoryCategory;
    confidence?: number;
    tags?: string[];
    sources?: string[];
    relatedMemories?: string[];
    metadata?: Record<string, unknown>;
}
/**
 * Memory Search Query
 */
export interface MemoryQuery {
    /** Keyword Search (title, content, tags) */
    keyword?: string;
    /** Category Filter */
    categories?: MemoryCategory[];
    /** Scope Filter */
    scope?: MemoryScope;
    /** Owner Filter */
    owner?: MemoryOwner;
    /** Minimum Confidence */
    minConfidence?: number;
    /** Tag Filter (AND condition) */
    tags?: string[];
    /** Within N Days */
    withinDays?: number;
    /** Sort By */
    sortBy?: 'confidence' | 'createdAt' | 'updatedAt' | 'accessCount' | 'relevance';
    /** Sort Order */
    sortOrder?: 'asc' | 'desc';
    /** Limit Count */
    limit?: number;
    /** Offset */
    offset?: number;
}
/**
 * Memory Search Result
 */
export interface MemorySearchResult {
    /** Found Memory List */
    memories: MemoryEntry[];
    /** Total Count */
    total: number;
    /** Search Score (relevance) */
    scores: Map<string, number>;
}
/**
 * Memory Summary
 */
export interface MemorySummary {
    /** Summary Text */
    text: string;
    /** Included Memory ID List */
    includedMemoryIds: string[];
    /** Summary Generated Time */
    generatedAt: Date;
    /** Token Count (estimated) */
    estimatedTokens: number;
}
/**
 * Memory Conflict Information
 */
export interface MemoryConflict {
    /** Existing Memory */
    existing: MemoryEntry;
    /** New Memory */
    incoming: CreateMemoryInput;
    /** Conflict Type */
    type: 'contradiction' | 'update' | 'duplicate';
    /** Conflict Description */
    description: string;
}
/**
 * Conflict Resolution Result
 */
export interface ConflictResolution {
    /** Resolution Method */
    action: 'keep_existing' | 'replace' | 'merge' | 'keep_both';
    /** Result Memory (for merge case) */
    mergedMemory?: MemoryEntry;
    /** Resolution Reason */
    reason: string;
}
/**
 * Memory Storage Configuration
 */
export interface MemoryStorageConfig {
    /** Global Memory Path */
    globalPath: string;
    /** Project Memory Path */
    projectPath: string;
    /** Maximum Memory Count */
    maxEntries: number;
    /** Decay Threshold (auto-delete below this value) */
    decayThreshold: number;
    /** Confidence Threshold (ignore below this value) */
    confidenceThreshold: number;
    /** Auto Backup Enabled */
    autoBackup: boolean;
}
/**
 * Reflection Result
 */
export interface ReflectionResult {
    /** Task ID */
    taskId: string;
    /** Task Description */
    taskDescription: string;
    /** Success Status */
    success: boolean;
    /** Reflection Depth */
    depth: 'simple' | 'standard' | 'deep';
    /** Learned Content */
    learnings: CreateMemoryInput[];
    /** Improvements for Next Time */
    improvements: string[];
    /** Confirmed Patterns */
    confirmedPatterns: string[];
    /** Reflection Time */
    reflectedAt: Date;
}
/**
 * Implicit Feedback
 */
export interface ImplicitFeedback {
    /** Feedback Type */
    type: 'correction' | 'rejection' | 'acceptance' | 'modification';
    /** Original Content */
    original: string;
    /** Modified Content (if exists) */
    modified?: string;
    /** Related Agent */
    agent: MemoryOwner;
    /** Context */
    context: string;
    /** Timestamp */
    timestamp: Date;
}
/**
 * Learning Extraction Result
 */
export interface LearningExtraction {
    /** Extracted Learnings */
    learnings: CreateMemoryInput[];
    /** Existing Memory IDs to Reinforce */
    reinforceMemoryIds: string[];
    /** Existing Memory IDs to Contradict */
    contradictMemoryIds: string[];
    /** Extraction Confidence */
    extractionConfidence: number;
}
/**
 * Bootstrap Result
 */
export interface BootstrapResult {
    /** Detected Conventions */
    conventions: CreateMemoryInput[];
    /** Project Context */
    projectContext: CreateMemoryInput[];
    /** Default Best Practices */
    bestPractices: CreateMemoryInput[];
    /** Analysis Time */
    analyzedAt: Date;
}
/**
 * Context Injection Result
 */
export interface ContextInjection {
    /** Summary Text to Inject */
    summary: string;
    /** Detailed Memory (if needed) */
    details: MemoryEntry[];
    /** Total Token Count (estimated) */
    totalTokens: number;
    /** Included Categories */
    includedCategories: MemoryCategory[];
}
/**
 * Default Configuration
 */
export declare const DEFAULT_MEMORY_CONFIG: MemoryStorageConfig;
/**
 * Default Decay Configuration
 */
export declare const DECAY_CONFIG: {
    /** Daily Decay Rate */
    dailyDecayRate: number;
    /** Contradiction Decay Multiplier */
    contradictionDecayMultiplier: number;
    /** Access Recovery Rate */
    accessRecoveryRate: number;
    /** Reinforcement Confidence Boost */
    reinforcementBoost: number;
    /** Maximum Confidence */
    maxConfidence: number;
    /** Minimum Confidence */
    minConfidence: number;
};
//# sourceMappingURL=types.d.ts.map