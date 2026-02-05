/**
 * Memory Decay
 * Memory decay management
 */
import type { MemoryEntry } from './types';
/**
 * Calculate Time-Based Decay
 */
export declare function calculateTimeDecay(memory: MemoryEntry, now?: Date): number;
/**
 * Calculate Contradiction-Based Decay
 */
export declare function calculateContradictionDecay(memory: MemoryEntry): number;
/**
 * Calculate Reinforcement Confidence Boost
 */
export declare function calculateReinforcementBoost(memory: MemoryEntry): number;
/**
 * Calculate Access-Based Decay Recovery
 */
export declare function calculateAccessRecovery(accessCount: number): number;
/**
 * Calculate Final Effective Confidence
 */
export declare function calculateEffectiveConfidence(memory: MemoryEntry, now?: Date): number;
/**
 * Apply Memory Decay
 */
export declare function applyDecay(memory: MemoryEntry, now?: Date): MemoryEntry;
/**
 * Filter Decayed Memories (for removal)
 */
export declare function filterDecayedMemories(memories: MemoryEntry[], threshold?: number): {
    active: MemoryEntry[];
    expired: MemoryEntry[];
};
/**
 * Reinforce Memory
 */
export declare function reinforceMemory(memory: MemoryEntry): MemoryEntry;
/**
 * Contradict Memory
 */
export declare function contradictMemory(memory: MemoryEntry): MemoryEntry;
/**
 * Record Memory Access
 */
export declare function recordAccess(memory: MemoryEntry): MemoryEntry;
/**
 * Process Batch Decay
 */
export declare function processBatchDecay(memories: MemoryEntry[], options?: {
    threshold?: number;
    applyChanges?: boolean;
}): {
    processed: MemoryEntry[];
    removed: MemoryEntry[];
    stats: {
        total: number;
        active: number;
        expired: number;
        averageConfidence: number;
    };
};
//# sourceMappingURL=decay.d.ts.map