/**
 * Memory Storage
 * File-based memory storage
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
/**
 * Convert memory to markdown format
 */
export function memoryToMarkdown(memory) {
    const tags = memory.tags.length > 0 ? memory.tags.map((t) => `#${t}`).join(' ') : '';
    const sources = memory.sources.length > 0 ? memory.sources.join(', ') : 'unknown';
    return `## [${memory.createdAt.toISOString().split('T')[0]}] ${memory.title}
- **ID**: ${memory.id}
- **Content**: ${memory.content}
- **Category**: ${memory.category}
- **Confidence**: ${memory.confidence.toFixed(2)}
- **Source**: ${sources}
- **Tags**: ${tags}
- **Decay**: ${memory.decayFactor.toFixed(2)}
- **Reinforcement Count**: ${memory.reinforcementCount}
- **Contradiction Count**: ${memory.contradictionCount}
- **Access Count**: ${memory.accessCount}
- **Last Accessed**: ${memory.lastAccessedAt.toISOString()}
- **Updated**: ${memory.updatedAt.toISOString()}
`;
}
/**
 * Parse memory from markdown
 */
export function markdownToMemory(markdown, scope) {
    try {
        const idMatch = markdown.match(/- \*\*ID\*\*: (.+)/);
        const titleMatch = markdown.match(/## \[.+\] (.+)/);
        const contentMatch = markdown.match(/- \*\*Content\*\*: (.+)/);
        const categoryMatch = markdown.match(/- \*\*Category\*\*: (.+)/);
        const confidenceMatch = markdown.match(/- \*\*Confidence\*\*: (.+)/);
        const sourcesMatch = markdown.match(/- \*\*Source\*\*: (.+)/);
        const tagsMatch = markdown.match(/- \*\*Tags\*\*: (.+)/);
        const decayMatch = markdown.match(/- \*\*Decay\*\*: (.+)/);
        const reinforcementMatch = markdown.match(/- \*\*Reinforcement Count\*\*: (.+)/);
        const contradictionMatch = markdown.match(/- \*\*Contradiction Count\*\*: (.+)/);
        const accessCountMatch = markdown.match(/- \*\*Access Count\*\*: (.+)/);
        const lastAccessMatch = markdown.match(/- \*\*Last Accessed\*\*: (.+)/);
        const updatedMatch = markdown.match(/- \*\*Updated\*\*: (.+)/);
        const dateMatch = markdown.match(/## \[(\d{4}-\d{2}-\d{2})\]/);
        if (!idMatch || !titleMatch || !contentMatch) {
            return null;
        }
        const tags = tagsMatch?.[1]
            ? tagsMatch[1]
                .split(' ')
                .filter((t) => t.startsWith('#'))
                .map((t) => t.slice(1))
            : [];
        const sources = sourcesMatch?.[1] && sourcesMatch[1] !== 'unknown' ? sourcesMatch[1].split(', ') : [];
        return {
            id: idMatch[1].trim(),
            title: titleMatch[1].trim(),
            content: contentMatch[1].trim(),
            category: (categoryMatch?.[1]?.trim() || 'insight'),
            scope,
            owner: 'shared',
            confidence: parseFloat(confidenceMatch?.[1] || '0.5'),
            tags,
            sources,
            createdAt: dateMatch ? new Date(dateMatch[1]) : new Date(),
            updatedAt: updatedMatch ? new Date(updatedMatch[1]) : new Date(),
            lastAccessedAt: lastAccessMatch ? new Date(lastAccessMatch[1]) : new Date(),
            accessCount: parseInt(accessCountMatch?.[1] || '0', 10),
            reinforcementCount: parseInt(reinforcementMatch?.[1] || '0', 10),
            decayFactor: parseFloat(decayMatch?.[1] || '1.0'),
            contradictionCount: parseInt(contradictionMatch?.[1] || '0', 10),
            relatedMemories: [],
            metadata: {},
        };
    }
    catch {
        return null;
    }
}
/**
 * Expand path (handle ~)
 */
export function expandPath(filePath) {
    if (filePath.startsWith('~')) {
        return path.join(os.homedir(), filePath.slice(1));
    }
    return filePath;
}
/**
 * Get learning file name
 */
export function getLearningFileName() {
    return 'learnings.md';
}
/**
 * Memory Storage class
 */
export class MemoryStorage {
    config;
    globalPath;
    projectPath;
    constructor(config = {}) {
        this.config = {
            globalPath: config.globalPath || '~/.team-shinchan',
            projectPath: config.projectPath || '.team-shinchan',
            maxEntries: config.maxEntries || 500,
            decayThreshold: config.decayThreshold || 0.1,
            confidenceThreshold: config.confidenceThreshold || 0.3,
            autoBackup: config.autoBackup ?? true,
        };
        this.globalPath = expandPath(this.config.globalPath);
        this.projectPath = this.config.projectPath;
    }
    /**
     * Initialize directories
     */
    async initialize() {
        // Create global memory directory
        await this.ensureDirectory(this.globalPath);
        await this.ensureDirectory(path.join(this.globalPath, 'agents'));
        // Create project memory directory (only when in project root)
        if (fs.existsSync(this.projectPath) || fs.existsSync('.git') || fs.existsSync('package.json')) {
            await this.ensureDirectory(this.projectPath);
            await this.ensureDirectory(path.join(this.projectPath, 'agents'));
        }
    }
    /**
     * Ensure directory exists
     */
    async ensureDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
    /**
     * Get base path by scope
     */
    getBasePath(scope) {
        return scope === 'global' ? this.globalPath : this.projectPath;
    }
    /**
     * Get memory file path
     */
    getMemoryFilePath(scope, owner = 'shared') {
        const basePath = this.getBasePath(scope);
        if (owner === 'shared') {
            return path.join(basePath, getLearningFileName());
        }
        else {
            return path.join(basePath, 'agents', `${owner}.md`);
        }
    }
    /**
     * Load memories from file
     */
    async loadFromFile(filePath, scope) {
        const fullPath = expandPath(filePath);
        if (!fs.existsSync(fullPath)) {
            return [];
        }
        try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const sections = content.split(/(?=## \[)/);
            const memories = [];
            for (const section of sections) {
                if (section.trim()) {
                    const memory = markdownToMemory(section, scope);
                    if (memory) {
                        memories.push(memory);
                    }
                }
            }
            return memories;
        }
        catch (error) {
            console.error(`Failed to load memories from ${fullPath}:`, error);
            return [];
        }
    }
    /**
     * Save memories to file (organized by category sections)
     */
    async saveToFile(filePath, memories) {
        const fullPath = expandPath(filePath);
        const dirPath = path.dirname(fullPath);
        await this.ensureDirectory(dirPath);

        // Group by category
        const categories = ['preference', 'pattern', 'context', 'mistake', 'decision', 'convention', 'insight'];
        const categoryNames = {
            preference: 'Preferences',
            pattern: 'Patterns',
            context: 'Context',
            mistake: 'Mistakes',
            decision: 'Decisions',
            convention: 'Conventions',
            insight: 'Insights'
        };

        const header = `# Team-Shinchan Learnings
> Auto-generated memory file. Do not edit manually.
> Last updated: ${new Date().toISOString()}

`;

        let content = header;

        for (const category of categories) {
            const categoryMemories = memories.filter(m => m.category === category);
            if (categoryMemories.length > 0) {
                content += `\n## ${categoryNames[category]}\n\n`;
                const sortedMemories = [...categoryMemories].sort((a, b) => b.confidence - a.confidence);
                content += sortedMemories.map((m) => memoryToMarkdown(m)).join('\n---\n\n');
                content += '\n';
            }
        }

        fs.writeFileSync(fullPath, content, 'utf-8');
    }
    /**
     * Load all memories (global + project, from single learnings.md file)
     */
    async loadAllMemories() {
        const globalMemories = [];
        const projectMemories = [];

        // Load global memories (from learnings.md)
        const globalFilePath = this.getMemoryFilePath('global');
        const globalLearnings = await this.loadFromFile(globalFilePath, 'global');
        globalMemories.push(...globalLearnings);

        // Load global agent-specific memories
        const agentsDir = path.join(this.globalPath, 'agents');
        if (fs.existsSync(agentsDir)) {
            const agentFiles = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'));
            for (const file of agentFiles) {
                const memories = await this.loadFromFile(path.join(agentsDir, file), 'global');
                globalMemories.push(...memories);
            }
        }

        // Load project memories (from learnings.md)
        if (fs.existsSync(this.projectPath)) {
            const projectFilePath = this.getMemoryFilePath('project');
            const projectLearnings = await this.loadFromFile(projectFilePath, 'project');
            projectMemories.push(...projectLearnings);

            // Load project agent-specific memories
            const projectAgentsDir = path.join(this.projectPath, 'agents');
            if (fs.existsSync(projectAgentsDir)) {
                const agentFiles = fs.readdirSync(projectAgentsDir).filter((f) => f.endsWith('.md'));
                for (const file of agentFiles) {
                    const memories = await this.loadFromFile(path.join(projectAgentsDir, file), 'project');
                    projectMemories.push(...memories);
                }
            }
        }

        return { global: globalMemories, project: projectMemories };
    }
    /**
     * Save memory (to single learnings.md file)
     */
    async saveMemory(memory) {
        const filePath = this.getMemoryFilePath(memory.scope, memory.owner);
        const existingMemories = await this.loadFromFile(filePath, memory.scope);
        // Update existing memory or add new
        const index = existingMemories.findIndex((m) => m.id === memory.id);
        if (index >= 0) {
            existingMemories[index] = memory;
        }
        else {
            existingMemories.push(memory);
        }
        await this.saveToFile(filePath, existingMemories);
    }
    /**
     * Delete memory (from single learnings.md file)
     */
    async deleteMemory(memoryId, scope) {
        const { global: globalMemories, project: projectMemories } = await this.loadAllMemories();
        const memories = scope === 'global' ? globalMemories : projectMemories;
        const memory = memories.find((m) => m.id === memoryId);
        if (!memory) {
            return false;
        }
        const filePath = this.getMemoryFilePath(scope, memory.owner);
        const fileMemories = await this.loadFromFile(filePath, scope);
        const filtered = fileMemories.filter((m) => m.id !== memoryId);
        await this.saveToFile(filePath, filtered);
        return true;
    }
    /**
     * Create backup
     */
    async createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.globalPath, 'backups', timestamp);
        await this.ensureDirectory(backupDir);
        // Backup global memories
        const files = fs.readdirSync(this.globalPath).filter((f) => f.endsWith('.md'));
        for (const file of files) {
            const src = path.join(this.globalPath, file);
            const dest = path.join(backupDir, file);
            fs.copyFileSync(src, dest);
        }
        return backupDir;
    }
    /**
     * Get configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
/**
 * Default storage instance
 */
let defaultStorage = null;
export function getDefaultStorage() {
    if (!defaultStorage) {
        defaultStorage = new MemoryStorage();
    }
    return defaultStorage;
}
export function setDefaultStorage(storage) {
    defaultStorage = storage;
}
