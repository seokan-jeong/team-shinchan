/**
 * Reflection Engine
 * Execute reflection after task completion
 */
import { extractLearnings } from '../learning/extractor';
import { classifyBatch } from '../learning/categorizer';
/**
 * Calculate complexity
 */
export function calculateComplexity(factors) {
    let score = 0;
    // Number of files
    if (factors.filesModified > 5)
        score += 3;
    else if (factors.filesModified > 2)
        score += 2;
    else if (factors.filesModified > 0)
        score += 1;
    // Amount of code changes
    if (factors.linesChanged > 500)
        score += 3;
    else if (factors.linesChanged > 100)
        score += 2;
    else if (factors.linesChanged > 20)
        score += 1;
    // Error occurrence
    if (factors.errorCount > 3)
        score += 3;
    else if (factors.errorCount > 0)
        score += 2;
    // Task duration
    if (factors.duration > 30 * 60 * 1000)
        score += 2; // Over 30 minutes
    else if (factors.duration > 10 * 60 * 1000)
        score += 1; // Over 10 minutes
    // User feedback exists
    if (factors.hasUserFeedback)
        score += 2;
    // New feature
    if (factors.isNewFeature)
        score += 2;
    // Number of involved agents
    if (factors.involvedAgents > 2)
        score += 2;
    else if (factors.involvedAgents > 1)
        score += 1;
    return score;
}
/**
 * Determine adaptive depth
 */
export function determineDepth(factors) {
    const complexity = calculateComplexity(factors);
    if (complexity >= 10)
        return 'deep';
    if (complexity >= 5)
        return 'standard';
    return 'simple';
}
/**
 * Generate simple reflection
 */
function generateSimpleReflection(result) {
    const learnings = [];
    // Record success/failure
    if (result.success) {
        learnings.push({
            title: `Success: ${result.description.slice(0, 50)}`,
            content: `${result.agent} agent completed the task.`,
            category: 'pattern',
            scope: 'project',
            owner: result.agent,
            confidence: 0.5,
            tags: ['success', 'quick'],
            sources: [result.taskId],
        });
    }
    else {
        learnings.push({
            title: `Failure: ${result.description.slice(0, 50)}`,
            content: `Task failed. Error: ${result.errors.slice(0, 2).join(', ')}`,
            category: 'mistake',
            scope: 'project',
            owner: result.agent,
            confidence: 0.6,
            tags: ['failure', 'quick'],
            sources: [result.taskId],
        });
    }
    return {
        taskId: result.taskId,
        taskDescription: result.description,
        success: result.success,
        depth: 'simple',
        learnings,
        improvements: [],
        confirmedPatterns: [],
        reflectedAt: new Date(),
    };
}
/**
 * Generate standard reflection
 */
function generateStandardReflection(result) {
    // Extract basic learnings
    const extraction = extractLearnings(result);
    const learnings = classifyBatch(extraction.learnings);
    // Derive improvements
    const improvements = [];
    if (result.errors.length > 0) {
        improvements.push(`Error prevention: ${result.errors[0]}`);
    }
    if (result.duration > 10 * 60 * 1000) {
        improvements.push('Seek ways to reduce task time');
    }
    // Confirmed patterns
    const confirmedPatterns = [];
    if (result.success && result.codeChanges.length > 0) {
        const languages = [...new Set(result.codeChanges.map((c) => c.language))];
        confirmedPatterns.push(`${languages.join(', ')} work pattern`);
    }
    return {
        taskId: result.taskId,
        taskDescription: result.description,
        success: result.success,
        depth: 'standard',
        learnings,
        improvements,
        confirmedPatterns,
        reflectedAt: new Date(),
    };
}
/**
 * Generate deep reflection
 */
function generateDeepReflection(result) {
    // Extract basic learnings
    const extraction = extractLearnings(result);
    const baseLearnings = classifyBatch(extraction.learnings);
    const learnings = [...baseLearnings];
    // Decision analysis
    if (result.codeChanges.length > 0) {
        learnings.push({
            title: 'Architecture decision',
            content: `File structure analysis:\n${result.codeChanges
                .map((c) => `- ${c.filePath}: ${c.changeType} (${c.linesAdded}+ / ${c.linesRemoved}-)`)
                .join('\n')}`,
            category: 'decision',
            scope: 'project',
            confidence: 0.7,
            tags: ['architecture', 'decision'],
            sources: [result.taskId],
        });
    }
    // Error analysis
    if (result.errors.length > 0) {
        learnings.push({
            title: 'Error pattern analysis',
            content: `Error types encountered:\n${result.errors
                .map((e) => `- ${categorizeError(e)}`)
                .join('\n')}`,
            category: 'mistake',
            scope: 'project',
            confidence: 0.8,
            tags: ['error', 'analysis'],
            sources: [result.taskId],
        });
    }
    // Derive improvements
    const improvements = [];
    if (result.errors.length > 0) {
        improvements.push(`Recognize error patterns and prevent proactively`);
        improvements.push(`Add test cases: cover ${result.errors.length} errors`);
    }
    if (result.duration > 20 * 60 * 1000) {
        improvements.push('Consider task division: split into smaller units');
    }
    if (result.codeChanges.filter((c) => c.changeType === 'modify').length > 3) {
        improvements.push('Refactoring opportunity: group related code');
    }
    // Confirmed patterns
    const confirmedPatterns = [];
    if (result.success) {
        confirmedPatterns.push(`${result.agent} agent effective work type`);
        const changeTypes = [...new Set(result.codeChanges.map((c) => c.changeType))];
        if (changeTypes.length > 0) {
            confirmedPatterns.push(`Work types: ${changeTypes.join(', ')}`);
        }
    }
    // Context learning
    if (result.context && Object.keys(result.context).length > 0) {
        learnings.push({
            title: 'Task context',
            content: `Important context: ${JSON.stringify(result.context, null, 2)}`,
            category: 'context',
            scope: 'project',
            confidence: 0.6,
            tags: ['context', 'deep-analysis'],
            sources: [result.taskId],
        });
    }
    return {
        taskId: result.taskId,
        taskDescription: result.description,
        success: result.success,
        depth: 'deep',
        learnings,
        improvements,
        confirmedPatterns,
        reflectedAt: new Date(),
    };
}
/**
 * Categorize error
 */
function categorizeError(error) {
    const lower = error.toLowerCase();
    if (lower.includes('type') || lower.includes('typescript')) {
        return `Type error: ${error.slice(0, 100)}`;
    }
    if (lower.includes('syntax') || lower.includes('parse')) {
        return `Syntax error: ${error.slice(0, 100)}`;
    }
    if (lower.includes('not found') || lower.includes('undefined') || lower.includes('null')) {
        return `Reference error: ${error.slice(0, 100)}`;
    }
    if (lower.includes('permission') || lower.includes('access')) {
        return `Permission error: ${error.slice(0, 100)}`;
    }
    if (lower.includes('network') || lower.includes('fetch') || lower.includes('http')) {
        return `Network error: ${error.slice(0, 100)}`;
    }
    return `Other error: ${error.slice(0, 100)}`;
}
/**
 * Execute reflection (main function)
 */
export function reflect(result, options = {}) {
    // Calculate complexity factors
    const factors = {
        filesModified: result.filesModified.length,
        linesChanged: result.codeChanges.reduce((sum, c) => sum + c.linesAdded + c.linesRemoved, 0),
        errorCount: result.errors.length,
        duration: result.duration,
        hasUserFeedback: !!result.userFeedback,
        isNewFeature: result.codeChanges.some((c) => c.changeType === 'create'),
        involvedAgents: 1, // Single task basis
    };
    // Determine depth
    const depth = options.forceDepth || determineDepth(factors);
    // Generate reflection based on depth
    switch (depth) {
        case 'simple':
            return generateSimpleReflection(result);
        case 'standard':
            return generateStandardReflection(result);
        case 'deep':
            return generateDeepReflection(result);
        default:
            return generateStandardReflection(result);
    }
}
/**
 * Batch reflection
 */
export function reflectBatch(results, options = {}) {
    const reflections = results.map((r) => reflect(r));
    if (options.aggregateLearnings) {
        // Remove duplicate learnings and reinforce
        const allLearnings = reflections.flatMap((r) => r.learnings);
        const uniqueLearnings = deduplicateLearnings(allLearnings);
        // Add aggregated learnings to first result
        if (reflections.length > 0) {
            reflections[0].learnings = uniqueLearnings;
        }
    }
    return reflections;
}
/**
 * Deduplicate learnings
 */
function deduplicateLearnings(learnings) {
    const seen = new Map();
    for (const learning of learnings) {
        const key = `${learning.category}:${learning.title}`;
        if (seen.has(key)) {
            // Keep the one with higher confidence
            const existing = seen.get(key);
            if ((learning.confidence || 0) > (existing.confidence || 0)) {
                seen.set(key, learning);
            }
        }
        else {
            seen.set(key, learning);
        }
    }
    return Array.from(seen.values());
}
/**
 * Generate reflection summary
 */
export function summarizeReflection(reflection) {
    const lines = [];
    lines.push(`## Reflection: ${reflection.taskDescription}`);
    lines.push(`- Result: ${reflection.success ? '✅ Success' : '❌ Failure'}`);
    lines.push(`- Depth: ${reflection.depth}`);
    if (reflection.learnings.length > 0) {
        lines.push(`\n### Learnings (${reflection.learnings.length})`);
        for (const learning of reflection.learnings.slice(0, 5)) {
            lines.push(`- [${learning.category}] ${learning.title}`);
        }
    }
    if (reflection.improvements.length > 0) {
        lines.push(`\n### Improvements`);
        for (const improvement of reflection.improvements) {
            lines.push(`- ${improvement}`);
        }
    }
    if (reflection.confirmedPatterns.length > 0) {
        lines.push(`\n### Confirmed Patterns`);
        for (const pattern of reflection.confirmedPatterns) {
            lines.push(`- ${pattern}`);
        }
    }
    return lines.join('\n');
}
