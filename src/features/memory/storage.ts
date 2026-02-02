/**
 * Memory Storage
 * 파일 기반 메모리 저장소
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type {
  MemoryEntry,
  MemoryCategory,
  MemoryScope,
  MemoryOwner,
  MemoryStorageConfig,
  DEFAULT_MEMORY_CONFIG,
} from './types';

/**
 * 메모리를 마크다운 형식으로 변환
 */
export function memoryToMarkdown(memory: MemoryEntry): string {
  const tags = memory.tags.length > 0 ? memory.tags.map((t) => `#${t}`).join(' ') : '';
  const sources = memory.sources.length > 0 ? memory.sources.join(', ') : 'unknown';

  return `## [${memory.createdAt.toISOString().split('T')[0]}] ${memory.title}
- **ID**: ${memory.id}
- **내용**: ${memory.content}
- **카테고리**: ${memory.category}
- **신뢰도**: ${memory.confidence.toFixed(2)}
- **출처**: ${sources}
- **태그**: ${tags}
- **감쇠**: ${memory.decayFactor.toFixed(2)}
- **강화 횟수**: ${memory.reinforcementCount}
- **반박 횟수**: ${memory.contradictionCount}
- **접근 횟수**: ${memory.accessCount}
- **마지막 접근**: ${memory.lastAccessedAt.toISOString()}
- **업데이트**: ${memory.updatedAt.toISOString()}
`;
}

/**
 * 마크다운에서 메모리 파싱
 */
export function markdownToMemory(markdown: string, scope: MemoryScope): MemoryEntry | null {
  try {
    const idMatch = markdown.match(/- \*\*ID\*\*: (.+)/);
    const titleMatch = markdown.match(/## \[.+\] (.+)/);
    const contentMatch = markdown.match(/- \*\*내용\*\*: (.+)/);
    const categoryMatch = markdown.match(/- \*\*카테고리\*\*: (.+)/);
    const confidenceMatch = markdown.match(/- \*\*신뢰도\*\*: (.+)/);
    const sourcesMatch = markdown.match(/- \*\*출처\*\*: (.+)/);
    const tagsMatch = markdown.match(/- \*\*태그\*\*: (.+)/);
    const decayMatch = markdown.match(/- \*\*감쇠\*\*: (.+)/);
    const reinforcementMatch = markdown.match(/- \*\*강화 횟수\*\*: (.+)/);
    const contradictionMatch = markdown.match(/- \*\*반박 횟수\*\*: (.+)/);
    const accessCountMatch = markdown.match(/- \*\*접근 횟수\*\*: (.+)/);
    const lastAccessMatch = markdown.match(/- \*\*마지막 접근\*\*: (.+)/);
    const updatedMatch = markdown.match(/- \*\*업데이트\*\*: (.+)/);
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
      category: (categoryMatch?.[1]?.trim() || 'insight') as MemoryCategory,
      scope,
      owner: 'shared' as MemoryOwner,
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
  } catch {
    return null;
  }
}

/**
 * 경로 확장 (~ 처리)
 */
export function expandPath(filePath: string): string {
  if (filePath.startsWith('~')) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

/**
 * 카테고리별 파일 이름 반환
 */
export function getCategoryFileName(category: MemoryCategory): string {
  const categoryFiles: Record<MemoryCategory, string> = {
    preference: 'preferences.md',
    pattern: 'patterns.md',
    context: 'context.md',
    mistake: 'mistakes.md',
    decision: 'decisions.md',
    convention: 'conventions.md',
    insight: 'insights.md',
  };
  return categoryFiles[category];
}

/**
 * 메모리 저장소 클래스
 */
export class MemoryStorage {
  private config: MemoryStorageConfig;
  private globalPath: string;
  private projectPath: string;

  constructor(config: Partial<MemoryStorageConfig> = {}) {
    this.config = {
      globalPath: config.globalPath || '~/.team-seokan/memories',
      projectPath: config.projectPath || '.team-seokan/memories',
      maxEntries: config.maxEntries || 500,
      decayThreshold: config.decayThreshold || 0.1,
      confidenceThreshold: config.confidenceThreshold || 0.3,
      autoBackup: config.autoBackup ?? true,
    };

    this.globalPath = expandPath(this.config.globalPath);
    this.projectPath = this.config.projectPath;
  }

  /**
   * 디렉토리 초기화
   */
  async initialize(): Promise<void> {
    // 글로벌 메모리 디렉토리 생성
    await this.ensureDirectory(this.globalPath);
    await this.ensureDirectory(path.join(this.globalPath, 'agents'));

    // 프로젝트 메모리 디렉토리 생성 (프로젝트 루트에 있을 때만)
    if (fs.existsSync(this.projectPath) || fs.existsSync('.git') || fs.existsSync('package.json')) {
      await this.ensureDirectory(this.projectPath);
      await this.ensureDirectory(path.join(this.projectPath, 'agents'));
    }
  }

  /**
   * 디렉토리 존재 확인 및 생성
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * 스코프에 따른 기본 경로 반환
   */
  getBasePath(scope: MemoryScope): string {
    return scope === 'global' ? this.globalPath : this.projectPath;
  }

  /**
   * 메모리 파일 경로 반환
   */
  getMemoryFilePath(scope: MemoryScope, category: MemoryCategory, owner: MemoryOwner = 'shared'): string {
    const basePath = this.getBasePath(scope);

    if (owner === 'shared') {
      return path.join(basePath, getCategoryFileName(category));
    } else {
      return path.join(basePath, 'agents', `${owner}.md`);
    }
  }

  /**
   * 파일에서 메모리 로드
   */
  async loadFromFile(filePath: string, scope: MemoryScope): Promise<MemoryEntry[]> {
    const fullPath = expandPath(filePath);

    if (!fs.existsSync(fullPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const sections = content.split(/(?=## \[)/);

      const memories: MemoryEntry[] = [];

      for (const section of sections) {
        if (section.trim()) {
          const memory = markdownToMemory(section, scope);
          if (memory) {
            memories.push(memory);
          }
        }
      }

      return memories;
    } catch (error) {
      console.error(`Failed to load memories from ${fullPath}:`, error);
      return [];
    }
  }

  /**
   * 파일에 메모리 저장
   */
  async saveToFile(filePath: string, memories: MemoryEntry[]): Promise<void> {
    const fullPath = expandPath(filePath);
    const dirPath = path.dirname(fullPath);

    await this.ensureDirectory(dirPath);

    // 신뢰도 기준 정렬
    const sortedMemories = [...memories].sort((a, b) => b.confidence - a.confidence);

    const content = sortedMemories.map((m) => memoryToMarkdown(m)).join('\n---\n\n');

    const header = `# Team-Seokan Memories
> 자동 생성된 메모리 파일입니다. 직접 수정하지 마세요.
> 마지막 업데이트: ${new Date().toISOString()}

---

`;

    fs.writeFileSync(fullPath, header + content, 'utf-8');
  }

  /**
   * 모든 메모리 로드 (글로벌 + 프로젝트)
   */
  async loadAllMemories(): Promise<{
    global: MemoryEntry[];
    project: MemoryEntry[];
  }> {
    const globalMemories: MemoryEntry[] = [];
    const projectMemories: MemoryEntry[] = [];

    const categories: MemoryCategory[] = [
      'preference',
      'pattern',
      'context',
      'mistake',
      'decision',
      'convention',
      'insight',
    ];

    // 글로벌 메모리 로드
    for (const category of categories) {
      const filePath = this.getMemoryFilePath('global', category);
      const memories = await this.loadFromFile(filePath, 'global');
      globalMemories.push(...memories);
    }

    // 글로벌 에이전트별 메모리 로드
    const agentsDir = path.join(this.globalPath, 'agents');
    if (fs.existsSync(agentsDir)) {
      const agentFiles = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'));
      for (const file of agentFiles) {
        const memories = await this.loadFromFile(path.join(agentsDir, file), 'global');
        globalMemories.push(...memories);
      }
    }

    // 프로젝트 메모리 로드
    if (fs.existsSync(this.projectPath)) {
      for (const category of categories) {
        const filePath = this.getMemoryFilePath('project', category);
        const memories = await this.loadFromFile(filePath, 'project');
        projectMemories.push(...memories);
      }

      // 프로젝트 에이전트별 메모리 로드
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
   * 메모리 저장
   */
  async saveMemory(memory: MemoryEntry): Promise<void> {
    const filePath = this.getMemoryFilePath(memory.scope, memory.category, memory.owner);
    const existingMemories = await this.loadFromFile(filePath, memory.scope);

    // 기존 메모리 업데이트 또는 추가
    const index = existingMemories.findIndex((m) => m.id === memory.id);
    if (index >= 0) {
      existingMemories[index] = memory;
    } else {
      existingMemories.push(memory);
    }

    await this.saveToFile(filePath, existingMemories);
  }

  /**
   * 메모리 삭제
   */
  async deleteMemory(memoryId: string, scope: MemoryScope): Promise<boolean> {
    const { global: globalMemories, project: projectMemories } = await this.loadAllMemories();
    const memories = scope === 'global' ? globalMemories : projectMemories;

    const memory = memories.find((m) => m.id === memoryId);
    if (!memory) {
      return false;
    }

    const filePath = this.getMemoryFilePath(scope, memory.category, memory.owner);
    const fileMemories = await this.loadFromFile(filePath, scope);
    const filtered = fileMemories.filter((m) => m.id !== memoryId);

    await this.saveToFile(filePath, filtered);
    return true;
  }

  /**
   * 백업 생성
   */
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.globalPath, 'backups', timestamp);

    await this.ensureDirectory(backupDir);

    // 글로벌 메모리 백업
    const files = fs.readdirSync(this.globalPath).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const src = path.join(this.globalPath, file);
      const dest = path.join(backupDir, file);
      fs.copyFileSync(src, dest);
    }

    return backupDir;
  }

  /**
   * 설정 반환
   */
  getConfig(): MemoryStorageConfig {
    return { ...this.config };
  }
}

/**
 * 기본 저장소 인스턴스
 */
let defaultStorage: MemoryStorage | null = null;

export function getDefaultStorage(): MemoryStorage {
  if (!defaultStorage) {
    defaultStorage = new MemoryStorage();
  }
  return defaultStorage;
}

export function setDefaultStorage(storage: MemoryStorage): void {
  defaultStorage = storage;
}
