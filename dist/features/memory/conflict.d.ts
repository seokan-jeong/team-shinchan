/**
 * Memory Conflict Resolution
 * Memory conflict resolution
 */
import type { MemoryEntry, CreateMemoryInput, MemoryConflict, ConflictResolution } from './types';
/**
 * Detect Conflict
 */
export declare function detectConflict(existing: MemoryEntry, incoming: CreateMemoryInput): MemoryConflict | null;
/**
 * Resolve Conflict
 * Default Strategy: Latest First + Confidence Score Based
 */
export declare function resolveConflict(conflict: MemoryConflict): ConflictResolution;
/**
 * Merge Memories
 */
export declare function mergeMemories(existing: MemoryEntry, incoming: CreateMemoryInput): MemoryEntry;
/**
 * Detect Batch Conflicts
 */
export declare function detectBatchConflicts(existingMemories: MemoryEntry[], incoming: CreateMemoryInput): MemoryConflict[];
/**
 * Auto Resolve Conflicts
 */
export declare function autoResolveConflicts(conflicts: MemoryConflict[]): Map<string, ConflictResolution>;
/**
 * Calculate Conflict Severity
 */
export declare function calculateConflictSeverity(conflict: MemoryConflict): 'low' | 'medium' | 'high';
//# sourceMappingURL=conflict.d.ts.map