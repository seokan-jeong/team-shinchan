/**
 * Memory Decay
 * Memory decay management
 */
import { DECAY_CONFIG } from './types';
/**
 * Calculate time-based decay
 */
export function calculateTimeDecay(memory, now = new Date()) {
    const daysSinceUpdate = Math.floor((now.getTime() - memory.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceAccess = Math.floor((now.getTime() - memory.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24));
    // Calculate decay based on older date
    const daysOld = Math.max(daysSinceUpdate, daysSinceAccess);
    // Exponential decay
    const decay = Math.pow(1 - DECAY_CONFIG.dailyDecayRate, daysOld);
    return Math.max(DECAY_CONFIG.minConfidence, decay);
}
/**
 * Calculate decay from contradictions
 */
export function calculateContradictionDecay(memory) {
    if (memory.contradictionCount === 0) {
        return 1.0;
    }
    // Decay based on contradiction count
    const contradictionPenalty = Math.pow(1 - DECAY_CONFIG.dailyDecayRate * DECAY_CONFIG.contradictionDecayMultiplier, memory.contradictionCount);
    return Math.max(DECAY_CONFIG.minConfidence, contradictionPenalty);
}
/**
 * Calculate confidence increase from reinforcement
 */
export function calculateReinforcementBoost(memory) {
    if (memory.reinforcementCount === 0) {
        return 0;
    }
    // Confidence increase based on reinforcement count (diminishing returns)
    const boost = DECAY_CONFIG.reinforcementBoost * Math.log(memory.reinforcementCount + 1);
    return Math.min(boost, DECAY_CONFIG.maxConfidence - memory.confidence);
}
/**
 * Calculate decay recovery from access
 */
export function calculateAccessRecovery(accessCount) {
    if (accessCount <= 1) {
        return 0;
    }
    // Recovery based on access count (log scale)
    return DECAY_CONFIG.accessRecoveryRate * Math.log(accessCount);
}
/**
 * Calculate final effective confidence
 */
export function calculateEffectiveConfidence(memory, now = new Date()) {
    const baseConfidence = memory.confidence;
    // Time decay
    const timeDecay = calculateTimeDecay(memory, now);
    // Contradiction decay
    const contradictionDecay = calculateContradictionDecay(memory);
    // Reinforcement boost
    const reinforcementBoost = calculateReinforcementBoost(memory);
    // Access recovery
    const accessRecovery = calculateAccessRecovery(memory.accessCount);
    // Final calculation
    let effectiveConfidence = baseConfidence * timeDecay * contradictionDecay;
    effectiveConfidence += reinforcementBoost;
    effectiveConfidence += accessRecovery;
    // Range constraint
    return Math.max(DECAY_CONFIG.minConfidence, Math.min(DECAY_CONFIG.maxConfidence, effectiveConfidence));
}
/**
 * Apply memory decay
 */
export function applyDecay(memory, now = new Date()) {
    const effectiveConfidence = calculateEffectiveConfidence(memory, now);
    const timeDecay = calculateTimeDecay(memory, now);
    return {
        ...memory,
        confidence: effectiveConfidence,
        decayFactor: timeDecay,
    };
}
/**
 * Filter decayed memories (for deletion)
 */
export function filterDecayedMemories(memories, threshold = DECAY_CONFIG.minConfidence) {
    const now = new Date();
    const active = [];
    const expired = [];
    for (const memory of memories) {
        const effectiveConfidence = calculateEffectiveConfidence(memory, now);
        if (effectiveConfidence >= threshold) {
            active.push(applyDecay(memory, now));
        }
        else {
            expired.push(memory);
        }
    }
    return { active, expired };
}
/**
 * Reinforce memory
 */
export function reinforceMemory(memory) {
    const now = new Date();
    return {
        ...memory,
        reinforcementCount: memory.reinforcementCount + 1,
        confidence: Math.min(DECAY_CONFIG.maxConfidence, memory.confidence + DECAY_CONFIG.reinforcementBoost),
        updatedAt: now,
        lastAccessedAt: now,
    };
}
/**
 * Contradict memory
 */
export function contradictMemory(memory) {
    const now = new Date();
    const newContradictionCount = memory.contradictionCount + 1;
    // Confidence decrease from contradiction
    const penalty = DECAY_CONFIG.dailyDecayRate * DECAY_CONFIG.contradictionDecayMultiplier;
    const newConfidence = Math.max(DECAY_CONFIG.minConfidence, memory.confidence - penalty);
    return {
        ...memory,
        contradictionCount: newContradictionCount,
        confidence: newConfidence,
        updatedAt: now,
    };
}
/**
 * Record memory access
 */
export function recordAccess(memory) {
    const now = new Date();
    return {
        ...memory,
        accessCount: memory.accessCount + 1,
        lastAccessedAt: now,
    };
}
/**
 * Process batch decay
 */
export function processBatchDecay(memories, options = {}) {
    const threshold = options.threshold ?? DECAY_CONFIG.minConfidence;
    const applyChanges = options.applyChanges ?? true;
    const { active, expired } = filterDecayedMemories(memories, threshold);
    const processed = applyChanges ? active : memories.filter((m) => !expired.includes(m));
    const averageConfidence = processed.length > 0
        ? processed.reduce((sum, m) => sum + m.confidence, 0) / processed.length
        : 0;
    return {
        processed,
        removed: expired,
        stats: {
            total: memories.length,
            active: active.length,
            expired: expired.length,
            averageConfidence,
        },
    };
}
