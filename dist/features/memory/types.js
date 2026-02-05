/**
 * Memory System Types
 * Type definitions for agent learning and memory system
 */
/**
 * Default configuration
 */
export const DEFAULT_MEMORY_CONFIG = {
    globalPath: '~/.team-shinchan',
    projectPath: '.team-shinchan',
    maxEntries: 500,
    decayThreshold: 0.1,
    confidenceThreshold: 0.3,
    autoBackup: true,
};
/**
 * Default decay configuration
 */
export const DECAY_CONFIG = {
    /** Daily decay rate */
    dailyDecayRate: 0.01,
    /** Decay acceleration on contradiction */
    contradictionDecayMultiplier: 2.0,
    /** Decay recovery on access */
    accessRecoveryRate: 0.05,
    /** Confidence boost on reinforcement */
    reinforcementBoost: 0.1,
    /** Maximum confidence */
    maxConfidence: 1.0,
    /** Minimum confidence */
    minConfidence: 0.0,
};
