/**
 * Memory Conflict Resolution
 * Resolves conflicts between existing and incoming memories
 */
import { calculateEffectiveConfidence } from './decay';
/**
 * Calculate text similarity (Jaccard similarity)
 */
function calculateTextSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    if (union.size === 0)
        return 0;
    return intersection.size / union.size;
}
/**
 * Calculate tag similarity
 */
function calculateTagSimilarity(tags1, tags2) {
    if (tags1.length === 0 && tags2.length === 0)
        return 1;
    if (tags1.length === 0 || tags2.length === 0)
        return 0;
    const set1 = new Set(tags1.map((t) => t.toLowerCase()));
    const set2 = new Set(tags2.map((t) => t.toLowerCase()));
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
}
/**
 * Detect conflict between existing and incoming memory
 */
export function detectConflict(existing, incoming) {
    // Check if same category
    if (existing.category !== incoming.category) {
        return null;
    }
    // Title similarity
    const titleSimilarity = calculateTextSimilarity(existing.title, incoming.title);
    // Content similarity
    const contentSimilarity = calculateTextSimilarity(existing.content, incoming.content);
    // Tag similarity
    const tagSimilarity = calculateTagSimilarity(existing.tags, incoming.tags || []);
    // Overall similarity (weighted average)
    const overallSimilarity = titleSimilarity * 0.4 + contentSimilarity * 0.4 + tagSimilarity * 0.2;
    // High similarity → duplicate or update
    if (overallSimilarity > 0.8) {
        // Almost identical content → duplicate
        if (contentSimilarity > 0.9) {
            return {
                existing,
                incoming,
                type: 'duplicate',
                description: `Almost identical to existing memory. (Similarity: ${(overallSimilarity * 100).toFixed(1)}%)`,
            };
        }
        // Same title but different content → update
        return {
            existing,
            incoming,
            type: 'update',
            description: `Appears to be an update to existing memory. (Similarity: ${(overallSimilarity * 100).toFixed(1)}%)`,
        };
    }
    // Medium similarity + same topic → potential conflict
    if (overallSimilarity > 0.5 && titleSimilarity > 0.6) {
        // Check for contradicting content (simple heuristic)
        const contradictionIndicators = ['not', "don't", 'instead', 'opposite', 'rather'];
        const hasContradiction = contradictionIndicators.some((indicator) => incoming.content.toLowerCase().includes(indicator) ||
            existing.content.toLowerCase().includes(indicator));
        if (hasContradiction) {
            return {
                existing,
                incoming,
                type: 'contradiction',
                description: `May contradict existing memory. (Similarity: ${(overallSimilarity * 100).toFixed(1)}%)`,
            };
        }
    }
    return null;
}
/**
 * Resolve conflict
 * Default strategy: Newest first + confidence score based
 */
export function resolveConflict(conflict) {
    const { existing, incoming, type } = conflict;
    switch (type) {
        case 'duplicate':
            // Duplicate → keep existing, reinforce
            return {
                action: 'keep_existing',
                reason: 'Duplicate content, keeping and reinforcing existing memory.',
            };
        case 'update':
            // Update → replace with newer content (if confidence is higher)
            const existingEffectiveConfidence = calculateEffectiveConfidence(existing);
            const incomingConfidence = incoming.confidence ?? 0.5;
            if (incomingConfidence >= existingEffectiveConfidence) {
                return {
                    action: 'replace',
                    reason: `New memory confidence (${incomingConfidence.toFixed(2)}) is higher or equal to existing (${existingEffectiveConfidence.toFixed(2)}), replacing.`,
                };
            }
            else {
                // Lower confidence → merge
                return {
                    action: 'merge',
                    mergedMemory: mergeMemories(existing, incoming),
                    reason: `Existing memory has higher confidence, merging information.`,
                };
            }
        case 'contradiction':
            // Conflict → apply newest first principle
            return {
                action: 'replace',
                reason: 'Replacing with new memory per newest-first principle. Existing memory is marked as contradicted.',
            };
        default:
            return {
                action: 'keep_both',
                reason: 'Cannot determine conflict type, keeping both.',
            };
    }
}
/**
 * Merge memories
 */
export function mergeMemories(existing, incoming) {
    const now = new Date();
    // Merge tags
    const mergedTags = [...new Set([...existing.tags, ...(incoming.tags || [])])];
    // Merge sources
    const mergedSources = [...new Set([...existing.sources, ...(incoming.sources || [])])];
    // Merge related memories
    const mergedRelated = [
        ...new Set([...existing.relatedMemories, ...(incoming.relatedMemories || [])]),
    ];
    // Calculate confidence (weighted average of existing and new)
    const existingWeight = existing.reinforcementCount + 1;
    const incomingWeight = 1;
    const totalWeight = existingWeight + incomingWeight;
    const mergedConfidence = (existing.confidence * existingWeight + (incoming.confidence ?? 0.5) * incomingWeight) /
        totalWeight;
    return {
        ...existing,
        content: `${existing.content}\n\n[Update ${now.toISOString().split('T')[0]}]\n${incoming.content}`,
        tags: mergedTags,
        sources: mergedSources,
        relatedMemories: mergedRelated,
        confidence: Math.min(1.0, mergedConfidence),
        updatedAt: now,
        reinforcementCount: existing.reinforcementCount + 1,
        metadata: {
            ...existing.metadata,
            ...(incoming.metadata || {}),
            mergedAt: now.toISOString(),
        },
    };
}
/**
 * Batch conflict detection
 */
export function detectBatchConflicts(existingMemories, incoming) {
    const conflicts = [];
    for (const existing of existingMemories) {
        const conflict = detectConflict(existing, incoming);
        if (conflict) {
            conflicts.push(conflict);
        }
    }
    // Sort by similarity (highest first)
    return conflicts.sort((a, b) => {
        const simA = calculateTextSimilarity(a.existing.content, incoming.content);
        const simB = calculateTextSimilarity(b.existing.content, incoming.content);
        return simB - simA;
    });
}
/**
 * Auto-resolve conflicts
 */
export function autoResolveConflicts(conflicts) {
    const resolutions = new Map();
    for (const conflict of conflicts) {
        const resolution = resolveConflict(conflict);
        resolutions.set(conflict.existing.id, resolution);
    }
    return resolutions;
}
/**
 * Calculate conflict severity
 */
export function calculateConflictSeverity(conflict) {
    switch (conflict.type) {
        case 'duplicate':
            return 'low';
        case 'update':
            return 'medium';
        case 'contradiction':
            return 'high';
        default:
            return 'medium';
    }
}
