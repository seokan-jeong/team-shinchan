/**
 * Memories 스킬 - 학습된 메모리 조회
 */

import type { SkillConfig, PluginContext, SkillResult } from '../../../types';
import { getMemoryManager } from '../../memory';
import { calculateEffectiveConfidence } from '../../memory/decay';
import type { MemoryCategory, MemoryEntry } from '../../memory/types';

/**
 * 메모리를 읽기 쉬운 형식으로 포맷
 */
function formatMemory(memory: MemoryEntry, index: number): string {
  const confidence = calculateEffectiveConfidence(memory);
  const confidenceStr = confidence >= 0.8 ? '⭐⭐⭐' : confidence >= 0.5 ? '⭐⭐' : '⭐';
  const date = memory.createdAt.toISOString().split('T')[0];
  const tags = memory.tags.length > 0 ? memory.tags.map((t) => `#${t}`).join(' ') : '';

  return `### ${index + 1}. ${memory.title}
- **카테고리**: ${memory.category}
- **신뢰도**: ${confidenceStr} (${(confidence * 100).toFixed(0)}%)
- **생성일**: ${date}
- **태그**: ${tags || '없음'}

> ${memory.content}
`;
}

/**
 * 카테고리별 요약
 */
function formatCategorySummary(
  stats: Map<string, number>,
  avgConfidence: number
): string {
  const lines: string[] = [];

  for (const [category, count] of stats) {
    lines.push(`- ${category}: ${count}개`);
  }

  return `## 📊 메모리 통계

**총 메모리 수**: ${Array.from(stats.values()).reduce((a, b) => a + b, 0)}개
**평균 신뢰도**: ${(avgConfidence * 100).toFixed(1)}%

### 카테고리별
${lines.join('\n')}
`;
}

export function createMemoriesSkill(context: PluginContext): SkillConfig {
  return {
    name: 'memories',
    displayName: 'Memories',
    description: '학습된 메모리를 조회합니다.',
    triggers: ['memories', '기억', '학습 내용', 'what did you learn'],
    autoActivate: false,

    handler: async ({ args, sessionState }): Promise<SkillResult> => {
      try {
        const manager = getMemoryManager();
        await manager.initialize();

        // 인자 파싱
        const lowerArgs = (args || '').toLowerCase();

        // 필터 옵션
        let category: MemoryCategory | undefined;
        let limit = 10;
        let showStats = false;

        // 카테고리 필터
        const categories: MemoryCategory[] = [
          'preference', 'pattern', 'context', 'mistake',
          'decision', 'convention', 'insight',
        ];
        for (const cat of categories) {
          if (lowerArgs.includes(cat)) {
            category = cat;
            break;
          }
        }

        // 통계 모드
        if (lowerArgs.includes('stats') || lowerArgs.includes('통계')) {
          showStats = true;
        }

        // 개수 제한
        const limitMatch = lowerArgs.match(/(\d+)개?/);
        if (limitMatch) {
          limit = parseInt(limitMatch[1], 10);
        }

        // 통계 모드
        if (showStats) {
          const stats = await manager.getStats();

          return {
            success: true,
            output: `# 🧠 Team-Seokan 메모리 통계

${formatCategorySummary(stats.byCategory, stats.averageConfidence)}

### 에이전트별
${Array.from(stats.byOwner.entries())
  .map(([owner, count]) => `- ${owner}: ${count}개`)
  .join('\n')}

### 인기 태그
${stats.topTags.slice(0, 5).map(([tag, count]) => `- #${tag}: ${count}회`).join('\n')}
`,
          };
        }

        // 메모리 검색
        const result = await manager.search({
          categories: category ? [category] : undefined,
          sortBy: 'confidence',
          sortOrder: 'desc',
          limit,
        });

        if (result.memories.length === 0) {
          return {
            success: true,
            output: `# 🧠 학습된 메모리

아직 학습된 메모리가 없습니다.

작업을 수행하면서 자동으로 학습하거나, \`/learn "내용"\`으로 직접 가르칠 수 있습니다.`,
          };
        }

        const memoryList = result.memories
          .map((m, i) => formatMemory(m, i))
          .join('\n---\n\n');

        return {
          success: true,
          output: `# 🧠 학습된 메모리 (${result.total}개 중 ${result.memories.length}개)

${category ? `**필터**: ${category}` : ''}

${memoryList}

---
💡 더 보려면: \`/memories 20개\`
💡 카테고리별: \`/memories preference\`
💡 통계 보기: \`/memories stats\`
`,
        };
      } catch (error) {
        return {
          success: false,
          output: `❌ 메모리 조회 실패: ${error}`,
        };
      }
    },
  };
}
