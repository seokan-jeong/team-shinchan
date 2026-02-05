/**
 * Learning Categorizer
 * Automatic categorization of learning content
 */
/**
 * Category keyword mapping
 */
const categoryKeywords = {
    preference: [
        'prefer', 'like', 'dislike',
        'always', 'never', 'usually',
        'style', 'way', 'habit',
    ],
    pattern: [
        'pattern', 'repeat', 'workflow',
        'often', 'every time', 'typically',
        'process', 'sequence', 'step',
    ],
    context: [
        'architecture', 'structure', 'tech stack',
        'framework', 'library', 'dependency',
        'config', 'environment', 'infrastructure',
    ],
    mistake: [
        'mistake', 'error', 'bug',
        'caution', 'careful', 'avoid',
        'problem', 'issue', 'fault',
    ],
    decision: [
        'decision', 'choice', 'adopt',
        'reason', 'because', 'rationale',
        'tradeoff', 'alternative', 'compare',
    ],
    convention: [
        'convention', 'rule', 'guideline',
        'standard', 'format', 'naming',
        'lint', 'code style',
    ],
    insight: [
        'discover', 'learned', 'interesting',
        'note', 'tip', 'trick',
        'optimize', 'improve', 'efficient',
    ],
};
/**
 * Category weights
 */
const categoryWeights = {
    preference: 1.2, // Prioritize personalization
    pattern: 1.1,
    context: 1.0,
    mistake: 1.3, // Mistake learning is important
    decision: 1.0,
    convention: 1.1,
    insight: 0.9,
};
/**
 * Calculate category scores from text
 */
function calculateCategoryScores(text) {
    const scores = new Map();
    const lowerText = text.toLowerCase();
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        let score = 0;
        for (const keyword of keywords) {
            const regex = new RegExp(keyword.toLowerCase(), 'gi');
            const matches = lowerText.match(regex);
            if (matches) {
                score += matches.length;
            }
        }
        // Apply weight
        const weight = categoryWeights[category];
        scores.set(category, score * weight);
    }
    return scores;
}
/**
 * Determine optimal category
 */
export function determineCategory(content, title, tags) {
    // Combine all text
    const fullText = [title || '', content, ...(tags || [])].join(' ');
    const scores = calculateCategoryScores(fullText);
    // Return category with highest score
    let maxScore = 0;
    let bestCategory = 'insight';
    for (const [category, score] of scores) {
        if (score > maxScore) {
            maxScore = score;
            bestCategory = category;
        }
    }
    return bestCategory;
}
/**
 * Calculate category confidence
 */
export function calculateCategoryConfidence(content, determinedCategory) {
    const scores = calculateCategoryScores(content);
    const totalScore = Array.from(scores.values()).reduce((a, b) => a + b, 0);
    if (totalScore === 0) {
        return 0.3; // Default low confidence
    }
    const categoryScore = scores.get(determinedCategory) || 0;
    return Math.min(0.95, 0.3 + (categoryScore / totalScore) * 0.7);
}
/**
 * Classify and enhance learning
 */
export function classifyLearning(input) {
    // Skip if category is already properly set
    const currentScores = calculateCategoryScores(input.content);
    const currentCategoryScore = currentScores.get(input.category) || 0;
    const maxScore = Math.max(...Array.from(currentScores.values()));
    // Reclassify only if current category is not optimal
    if (currentCategoryScore < maxScore * 0.8) {
        const betterCategory = determineCategory(input.content, input.title, input.tags);
        return {
            ...input,
            category: betterCategory,
            confidence: calculateCategoryConfidence(input.content, betterCategory),
        };
    }
    return input;
}
/**
 * Batch classification
 */
export function classifyBatch(inputs) {
    return inputs.map(classifyLearning);
}
/**
 * Suggest categories
 */
export function suggestCategories(content) {
    const scores = calculateCategoryScores(content);
    // Sort by score
    const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
    return {
        primary: sorted[0][0],
        alternatives: sorted.slice(1, 3).map(([cat]) => cat),
        scores,
    };
}
/**
 * Extract category hints from tags
 */
export function extractCategoryFromTags(tags) {
    const tagSet = new Set(tags.map((t) => t.toLowerCase()));
    // Direct category tags
    const directMappings = [
        [['pref', 'preference', 'like', 'style'], 'preference'],
        [['pattern', 'workflow', 'process'], 'pattern'],
        [['arch', 'architecture', 'context', 'infra'], 'context'],
        [['mistake', 'error', 'bug', 'avoid'], 'mistake'],
        [['decision', 'choice', 'rationale'], 'decision'],
        [['convention', 'rule', 'standard'], 'convention'],
        [['tip', 'insight', 'note'], 'insight'],
    ];
    for (const [keywords, category] of directMappings) {
        if (keywords.some((k) => tagSet.has(k))) {
            return category;
        }
    }
    return null;
}
/**
 * Context-based classification
 */
export function classifyWithContext(input, context) {
    let classified = classifyLearning(input);
    // Adjust based on agent type
    if (context.agentType) {
        const agentCategoryBias = {
            maenggu: 'pattern', // Executor → Pattern
            suji: 'convention', // Frontend → Convention
            heukgom: 'context', // Backend → Context
            shinhyungman: 'insight', // Advisor → Insight
            yuri: 'decision', // Planner → Decision
        };
        const biasCategory = agentCategoryBias[context.agentType];
        if (biasCategory) {
            const scores = calculateCategoryScores(classified.content);
            const biasScore = scores.get(biasCategory) || 0;
            const currentScore = scores.get(classified.category) || 0;
            // Prioritize bias category if similarly high
            if (biasScore >= currentScore * 0.7) {
                classified = {
                    ...classified,
                    category: biasCategory,
                };
            }
        }
    }
    // Adjust based on task type
    if (context.taskType) {
        const taskCategoryBias = {
            'bug fix': 'mistake',
            'refactor': 'decision',
            'new feature': 'pattern',
            'style': 'convention',
            'config': 'context',
        };
        const biasCategory = Object.entries(taskCategoryBias).find(([task]) => context.taskType.toLowerCase().includes(task))?.[1];
        if (biasCategory && classified.category === 'insight') {
            classified = {
                ...classified,
                category: biasCategory,
            };
        }
    }
    return classified;
}
/**
 * Category statistics analysis
 */
export function analyzeCategoryDistribution(learnings) {
    const stats = new Map();
    for (const learning of learnings) {
        const existing = stats.get(learning.category) || { count: 0, totalConfidence: 0 };
        stats.set(learning.category, {
            count: existing.count + 1,
            totalConfidence: existing.totalConfidence + (learning.confidence || 0.5),
        });
    }
    const result = new Map();
    for (const [category, { count, totalConfidence }] of stats) {
        result.set(category, {
            count,
            avgConfidence: totalConfidence / count,
        });
    }
    return result;
}
