/**
 * Implicit Feedback Detection
 * Detects and converts user implicit feedback into learnings
 */
/**
 * Analyze changes
 */
function analyzeChange(original, modified) {
    if (!original || !modified) {
        return {
            hasSubstantialChange: false,
            changeType: 'unknown',
            changedElements: [],
            confidence: 0,
        };
    }
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    const changedElements = [];
    let styleChanges = 0;
    let logicChanges = 0;
    let namingChanges = 0;
    let structureChanges = 0;
    // Compare line by line
    const maxLines = Math.max(originalLines.length, modifiedLines.length);
    let changedLines = 0;
    for (let i = 0; i < maxLines; i++) {
        const origLine = originalLines[i] || '';
        const modLine = modifiedLines[i] || '';
        if (origLine !== modLine) {
            changedLines++;
            // Analyze change type
            if (origLine.trim() === modLine.trim()) {
                // Whitespace only change
                styleChanges++;
                changedElements.push('whitespace');
            }
            else if (origLine.replace(/['"]/g, '') === modLine.replace(/['"]/g, '')) {
                // Quote style change
                styleChanges++;
                changedElements.push('quote-style');
            }
            else if (origLine.replace(/;/g, '') === modLine.replace(/;/g, '')) {
                // Semicolon change
                styleChanges++;
                changedElements.push('semicolon');
            }
            else if (hasNamingChange(origLine, modLine)) {
                namingChanges++;
                changedElements.push('naming');
            }
            else if (hasStructureChange(originalLines, modifiedLines, i)) {
                structureChanges++;
                changedElements.push('structure');
            }
            else {
                logicChanges++;
                changedElements.push('logic');
            }
        }
    }
    // Calculate change ratio
    const changeRatio = changedLines / maxLines;
    const hasSubstantialChange = changeRatio > 0.05 || logicChanges > 0 || structureChanges > 0;
    // Determine primary change type
    let changeType = 'unknown';
    const maxChanges = Math.max(styleChanges, logicChanges, namingChanges, structureChanges);
    if (maxChanges === 0) {
        changeType = 'minor';
    }
    else if (maxChanges === styleChanges) {
        changeType = 'style';
    }
    else if (maxChanges === logicChanges) {
        changeType = 'logic';
    }
    else if (maxChanges === namingChanges) {
        changeType = 'naming';
    }
    else if (maxChanges === structureChanges) {
        changeType = 'structure';
    }
    return {
        hasSubstantialChange,
        changeType,
        changedElements: [...new Set(changedElements)],
        confidence: Math.min(0.9, 0.5 + changeRatio),
    };
}
/**
 * Detect naming changes
 */
function hasNamingChange(original, modified) {
    // Variable/function name pattern
    const namePattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    const origNames = new Set(original.match(namePattern) || []);
    const modNames = new Set(modified.match(namePattern) || []);
    // New names added or existing names changed
    const newNames = [...modNames].filter((n) => !origNames.has(n));
    const removedNames = [...origNames].filter((n) => !modNames.has(n));
    return newNames.length > 0 && removedNames.length > 0;
}
/**
 * Detect structure changes
 */
function hasStructureChange(originalLines, modifiedLines, lineIndex) {
    // Indentation level change
    const getIndent = (line) => (line.match(/^\s*/) || [''])[0].length;
    if (lineIndex < originalLines.length && lineIndex < modifiedLines.length) {
        const origIndent = getIndent(originalLines[lineIndex]);
        const modIndent = getIndent(modifiedLines[lineIndex]);
        if (Math.abs(origIndent - modIndent) >= 2) {
            return true;
        }
    }
    // Large line count change
    if (Math.abs(originalLines.length - modifiedLines.length) > 5) {
        return true;
    }
    return false;
}
/**
 * Detect implicit feedback
 */
export function detectImplicitFeedback(action) {
    switch (action.type) {
        case 'edit':
        case 'modify':
            if (action.context.originalContent && action.context.modifiedContent) {
                const analysis = analyzeChange(action.context.originalContent, action.context.modifiedContent);
                if (analysis.hasSubstantialChange) {
                    return {
                        type: 'modification',
                        original: action.context.originalContent,
                        modified: action.context.modifiedContent,
                        agent: action.context.agent || 'shared',
                        context: `${action.context.taskDescription || ''} - ${analysis.changeType} change`,
                        timestamp: action.timestamp,
                    };
                }
            }
            break;
        case 'undo':
        case 'reject':
            return {
                type: 'rejection',
                original: action.context.originalContent || '',
                agent: action.context.agent || 'shared',
                context: action.context.taskDescription || 'User rejected the change',
                timestamp: action.timestamp,
            };
        case 'accept':
            return {
                type: 'acceptance',
                original: action.context.originalContent || '',
                agent: action.context.agent || 'shared',
                context: action.context.taskDescription || 'User approved the change',
                timestamp: action.timestamp,
            };
        case 'retry':
            return {
                type: 'correction',
                original: action.context.errorMessage || action.context.originalContent || '',
                agent: action.context.agent || 'shared',
                context: 'User requested retry',
                timestamp: action.timestamp,
            };
    }
    return null;
}
/**
 * Extract learning from feedback
 */
export function extractLearningFromFeedback(feedback) {
    const learnings = [];
    const reinforceMemoryIds = [];
    const contradictMemoryIds = [];
    switch (feedback.type) {
        case 'modification': {
            if (feedback.original && feedback.modified) {
                const analysis = analyzeChange(feedback.original, feedback.modified);
                // Generate learning based on change type
                if (analysis.changeType === 'style') {
                    learnings.push({
                        title: 'Coding Style Preference',
                        content: `User modified code style. Changed elements: ${analysis.changedElements.join(', ')}`,
                        category: 'preference',
                        scope: 'global',
                        owner: feedback.agent,
                        confidence: analysis.confidence * 0.8,
                        tags: ['style', 'preference', ...analysis.changedElements],
                        sources: [feedback.timestamp.toISOString()],
                    });
                }
                else if (analysis.changeType === 'naming') {
                    learnings.push({
                        title: 'Naming Preference',
                        content: `User modified variable/function names.`,
                        category: 'preference',
                        scope: 'project',
                        owner: feedback.agent,
                        confidence: analysis.confidence * 0.9,
                        tags: ['naming', 'convention'],
                        sources: [feedback.timestamp.toISOString()],
                    });
                }
                else if (analysis.changeType === 'logic') {
                    learnings.push({
                        title: 'Logic Correction',
                        content: `User corrected ${feedback.agent} agent's logic. Context: ${feedback.context}`,
                        category: 'mistake',
                        scope: 'project',
                        owner: feedback.agent,
                        confidence: analysis.confidence,
                        tags: ['logic', 'correction'],
                        sources: [feedback.timestamp.toISOString()],
                    });
                }
            }
            break;
        }
        case 'rejection':
            learnings.push({
                title: 'Rejected Approach',
                content: `User rejected ${feedback.agent} agent's proposal. Context: ${feedback.context}`,
                category: 'mistake',
                scope: 'global',
                owner: feedback.agent,
                confidence: 0.8,
                tags: ['rejection', 'avoid'],
                sources: [feedback.timestamp.toISOString()],
            });
            break;
        case 'acceptance':
            // Handle acceptance as reinforcement of existing memory
            learnings.push({
                title: 'Approved Approach',
                content: `User approved ${feedback.agent} agent's work. Context: ${feedback.context}`,
                category: 'pattern',
                scope: 'global',
                owner: feedback.agent,
                confidence: 0.7,
                tags: ['approved', 'success'],
                sources: [feedback.timestamp.toISOString()],
            });
            break;
        case 'correction':
            learnings.push({
                title: 'Work That Needed Correction',
                content: `Retry was requested. Original result: ${feedback.original}`,
                category: 'mistake',
                scope: 'project',
                owner: feedback.agent,
                confidence: 0.7,
                tags: ['retry', 'correction'],
                sources: [feedback.timestamp.toISOString()],
            });
            break;
    }
    return {
        learnings,
        reinforceMemoryIds,
        contradictMemoryIds,
        extractionConfidence: 0.7,
    };
}
/**
 * Process feedback batch
 */
export function processFeedbackBatch(actions) {
    const allLearnings = [];
    const allReinforce = [];
    const allContradict = [];
    let totalConfidence = 0;
    for (const action of actions) {
        const feedback = detectImplicitFeedback(action);
        if (feedback) {
            const extraction = extractLearningFromFeedback(feedback);
            allLearnings.push(...extraction.learnings);
            allReinforce.push(...extraction.reinforceMemoryIds);
            allContradict.push(...extraction.contradictMemoryIds);
            totalConfidence += extraction.extractionConfidence;
        }
    }
    return {
        learnings: allLearnings,
        reinforceMemoryIds: [...new Set(allReinforce)],
        contradictMemoryIds: [...new Set(allContradict)],
        extractionConfidence: actions.length > 0 ? totalConfidence / actions.length : 0,
    };
}
/**
 * Analyze modification patterns
 */
export function analyzeModificationPatterns(feedbacks) {
    const patterns = new Map();
    for (const feedback of feedbacks) {
        if (feedback.type === 'modification' && feedback.original && feedback.modified) {
            const analysis = analyzeChange(feedback.original, feedback.modified);
            for (const element of analysis.changedElements) {
                patterns.set(element, (patterns.get(element) || 0) + 1);
            }
        }
    }
    return new Map([...patterns.entries()].sort((a, b) => b[1] - a[1]));
}
