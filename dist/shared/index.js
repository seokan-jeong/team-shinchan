/**
 * Team-Shinchan Shared Utilities
 */
// ============================================================
// Create Environment Context
// ============================================================
export function createEnvContext() {
    const now = new Date();
    return `<env-context>
<date>${now.toISOString().split('T')[0]}</date>
<time>${now.toTimeString().split(' ')[0]}</time>
<timezone>${Intl.DateTimeFormat().resolvedOptions().timeZone}</timezone>
<locale>${Intl.DateTimeFormat().resolvedOptions().locale}</locale>
</env-context>`;
}
// ============================================================
// Agent Name Conversion
// ============================================================
export const AGENT_DISPLAY_NAMES = {
    shinnosuke: 'Shinnosuke',
    himawari: 'Himawari',
    midori: 'Midori',
    bo: 'Bo',
    kazama: 'Kazama',
    aichan: 'Aichan',
    bunta: 'Bunta',
    masao: 'Masao',
    hiroshi: 'Hiroshi',
    nene: 'Nene',
    misae: 'Misae',
    actionkamen: 'Action Kamen',
    shiro: 'Shiro',
    masumi: 'Masumi',
    ume: 'Ume',
};
export const AGENT_ROLES = {
    shinnosuke: 'Orchestrator',
    himawari: 'Atlas',
    midori: 'Moderator',
    bo: 'Executor',
    kazama: 'Hephaestus',
    aichan: 'Frontend',
    bunta: 'Backend',
    masao: 'DevOps',
    hiroshi: 'Oracle',
    nene: 'Planner',
    misae: 'Metis',
    actionkamen: 'Reviewer',
    shiro: 'Explorer',
    masumi: 'Librarian',
    ume: 'Multimodal',
};
export function getAgentDisplayName(name) {
    return AGENT_DISPLAY_NAMES[name] || name;
}
export function getAgentRole(name) {
    return AGENT_ROLES[name] || 'Unknown';
}
export function formatAgentName(name) {
    return `${AGENT_DISPLAY_NAMES[name]} (${AGENT_ROLES[name]})`;
}
// ============================================================
// Model-related Utilities
// ============================================================
export function getModelDisplayName(model) {
    const names = {
        opus: 'Claude Opus',
        sonnet: 'Claude Sonnet',
        haiku: 'Claude Haiku',
    };
    return names[model];
}
export function isExpensiveModel(model) {
    return model === 'opus';
}
export function isCheapModel(model) {
    return model === 'haiku';
}
// ============================================================
// String Utilities
// ============================================================
export function truncateString(str, maxLength) {
    if (str.length <= maxLength)
        return str;
    return str.slice(0, maxLength - 3) + '...';
}
export function escapeXml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
export function stripXmlTags(str) {
    return str.replace(/<[^>]*>/g, '');
}
// ============================================================
// Keyword Matching
// ============================================================
export function matchKeywords(text, keywords) {
    const lowerText = text.toLowerCase();
    return keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()));
}
export function findMatchedKeyword(text, keywords) {
    const lowerText = text.toLowerCase();
    return keywords.find((keyword) => lowerText.includes(keyword.toLowerCase()));
}
// ============================================================
// Array Utilities
// ============================================================
export function chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
export function unique(array) {
    return [...new Set(array)];
}
// ============================================================
// Logging Utilities
// ============================================================
export function log(category, message, data) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [Team-Shinchan:${category}] ${message}`);
    if (data) {
        console.log(JSON.stringify(data, null, 2));
    }
}
export function logError(category, message, error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [Team-Shinchan:${category}] ERROR: ${message}`);
    if (error) {
        console.error(error);
    }
}
export function logWarning(category, message) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [Team-Shinchan:${category}] WARNING: ${message}`);
}
// ============================================================
// Timing Utilities
// ============================================================
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export function measureTime(fn) {
    const start = Date.now();
    const result = fn();
    if (result instanceof Promise) {
        return result.then((r) => ({
            result: r,
            duration: Date.now() - start,
        }));
    }
    return Promise.resolve({
        result,
        duration: Date.now() - start,
    });
}
