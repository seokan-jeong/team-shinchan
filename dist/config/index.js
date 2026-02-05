/**
 * Team-Shinchan Config System
 */
import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
// ============================================================
// Default Settings
// ============================================================
export function createDefaultSettings() {
    return {
        defaultModel: 'sonnet',
        maxConcurrentAgents: 5,
        maxRetries: 3,
        contextWarningThreshold: 50,
        enableRalphLoop: true,
        enableTodoEnforcer: true,
        enableIntentGate: true,
        enableReviewerCheck: true,
        language: 'ko',
        agentOverrides: undefined,
        disabledHooks: [],
        disabledSkills: [],
    };
}
// ============================================================
// Load Config
// ============================================================
export async function loadPluginConfig() {
    const defaultSettings = createDefaultSettings();
    // Config file paths
    const configPaths = [
        join(process.cwd(), '.team-shinchan', 'config.json'),
        join(process.cwd(), 'team-shinchan.config.json'),
        join(homedir(), '.config', 'team-shinchan', 'config.json'),
    ];
    for (const configPath of configPaths) {
        try {
            const content = await readFile(configPath, 'utf-8');
            const userConfig = JSON.parse(content);
            return mergeSettings(defaultSettings, userConfig);
        }
        catch {
            // If file doesn't exist, try next path
            continue;
        }
    }
    return defaultSettings;
}
// ============================================================
// Merge Settings
// ============================================================
function mergeSettings(defaults, overrides) {
    // Merge agentOverrides (allow undefined)
    const mergedAgentOverrides = overrides.agentOverrides
        ? { ...defaults.agentOverrides, ...overrides.agentOverrides }
        : defaults.agentOverrides;
    return {
        ...defaults,
        ...overrides,
        agentOverrides: mergedAgentOverrides,
        disabledHooks: [
            ...(defaults.disabledHooks || []),
            ...(overrides.disabledHooks || []),
        ],
        disabledSkills: [
            ...(defaults.disabledSkills || []),
            ...(overrides.disabledSkills || []),
        ],
    };
}
// ============================================================
// Agent Model Configuration
// ============================================================
export const AGENT_MODEL_MAP = {
    // Orchestration (Opus)
    shinnosuke: 'opus',
    himawari: 'opus',
    midori: 'opus', // Debate moderator
    // Execution (Sonnet/Opus)
    bo: 'sonnet',
    kazama: 'opus',
    // Specialists (Sonnet)
    aichan: 'sonnet',
    bunta: 'sonnet',
    masao: 'sonnet',
    // Advisory/Planning (Opus/Sonnet)
    hiroshi: 'opus',
    nene: 'opus',
    misae: 'sonnet',
    actionkamen: 'opus',
    // Exploration/Utility (Haiku/Sonnet)
    shiro: 'haiku',
    masumi: 'sonnet',
    ume: 'sonnet',
};
// ============================================================
// Read-only Agent List
// ============================================================
export const READ_ONLY_AGENTS = [
    'hiroshi', // Oracle
    'nene', // Planner
    'misae', // Metis
    'actionkamen', // Reviewer
    'shiro', // Explorer
    'masumi', // Librarian
];
// ============================================================
// Agent Categories
// ============================================================
export const AGENT_CATEGORIES = {
    orchestration: ['shinnosuke', 'himawari'],
    execution: ['bo', 'kazama'],
    specialist: ['aichan', 'bunta', 'masao'],
    advisor: ['hiroshi', 'nene', 'misae', 'actionkamen'],
    exploration: ['shiro', 'masumi'],
    utility: ['ume'],
};
// ============================================================
// Skill Trigger Keywords
// ============================================================
export const SKILL_TRIGGERS = {
    ultrawork: ['ulw', 'ultrawork', 'parallel', 'fast', 'parallel'],
    ralph: ['ralph', 'until done', 'until complete', 'dont stop', "don't stop"],
    autopilot: ['autopilot', 'automatically', 'on its own', 'auto'],
    plan: ['plan', 'planning', 'design', 'planning'],
    analyze: ['analyze', 'analysis', 'debugging', 'why not', 'debug', 'investigate'],
    deepsearch: ['deepsearch', 'deep search', 'find', 'search'],
    debate: ['debate', 'discussion', 'opinion', 'discuss', 'pros and cons', 'compare', 'which method'],
    'git-master': ['commit', 'push', 'merge', 'rebase', 'git'],
    'frontend-ui-ux': ['UI', 'UX', 'component', 'style', 'CSS', 'component'],
    cancel: ['cancel', 'cancel', 'stop', 'stop', 'halt'],
};
