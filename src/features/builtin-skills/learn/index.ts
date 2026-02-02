/**
 * Learn 스킬 - 명시적 학습
 */

import type { SkillConfig, PluginContext, SkillResult } from '../../../types';
import { getMemoryManager } from '../../memory';
import { createSimpleLearning } from '../../learning';
import type { MemoryCategory, MemoryScope } from '../../memory/types';

/**
 * 인자에서 옵션 파싱
 */
function parseLearnArgs(args: string): {
  content: string;
  category?: MemoryCategory;
  scope?: MemoryScope;
  tags?: string[];
} {
  let content = args;
  let category: MemoryCategory | undefined;
  let scope: MemoryScope | undefined;
  const tags: string[] = [];

  // 해시태그 추출
  const tagMatches = args.match(/#\w+/g);
  if (tagMatches) {
    tags.push(...tagMatches.map((t) => t.slice(1)));
    content = content.replace(/#\w+/g, '').trim();
  }

  // 카테고리 지정 (--category=xxx)
  const categoryMatch = args.match(/--category[=:]?\s*(\w+)/i);
  if (categoryMatch) {
    const cat = categoryMatch[1].toLowerCase();
    const validCategories: MemoryCategory[] = [
      'preference', 'pattern', 'context', 'mistake',
      'decision', 'convention', 'insight',
    ];
    if (validCategories.includes(cat as MemoryCategory)) {
      category = cat as MemoryCategory;
    }
    content = content.replace(/--category[=:]?\s*\w+/i, '').trim();
  }

  // 스코프 지정 (--global 또는 --project)
  if (args.includes('--global')) {
    scope = 'global';
    content = content.replace(/--global/i, '').trim();
  } else if (args.includes('--project')) {
    scope = 'project';
    content = content.replace(/--project/i, '').trim();
  }

  return { content, category, scope, tags };
}

export function createLearnSkill(context: PluginContext): SkillConfig {
  return {
    name: 'learn',
    displayName: 'Learn',
    description: '명시적으로 새로운 내용을 학습합니다.',
    triggers: ['learn', '배워', '기억해', 'remember this'],
    autoActivate: false,

    handler: async ({ args, sessionState }): Promise<SkillResult> => {
      if (!args || args.trim() === '') {
        return {
          success: false,
          output: `# ❌ 학습 내용 필요

\`/learn "내용"\` 형식으로 학습할 내용을 입력해주세요.

**사용법:**
\`\`\`
/learn 나는 컴포넌트에 항상 .component.tsx 확장자를 사용해

/learn API 에러는 항상 한국어로 표시해줘 #preference #api

/learn --category=convention 변수명은 camelCase로 작성

/learn --project --category=context 이 프로젝트는 Next.js 14 사용
\`\`\`

**옵션:**
- \`#tag\` - 태그 추가
- \`--category=xxx\` - 카테고리 지정 (preference, pattern, convention, etc.)
- \`--global\` - 모든 프로젝트에 적용
- \`--project\` - 현재 프로젝트에만 적용 (기본값)`,
        };
      }

      try {
        const manager = getMemoryManager();
        await manager.initialize();

        const { content, category, scope, tags } = parseLearnArgs(args);

        if (!content) {
          return {
            success: false,
            output: '❌ 학습할 내용이 비어있습니다.',
          };
        }

        // 학습 생성
        const learning = createSimpleLearning(content, {
          category,
          scope: scope || 'project',
          tags,
          source: 'explicit-learn',
        });

        // 신뢰도를 높게 설정 (명시적 학습)
        learning.confidence = 0.9;

        // 저장
        const memory = await manager.create(learning);

        return {
          success: true,
          output: `# ✅ 학습 완료!

**제목**: ${memory.title}
**카테고리**: ${memory.category}
**스코프**: ${memory.scope === 'global' ? '글로벌 (모든 프로젝트)' : '프로젝트 전용'}
**태그**: ${memory.tags.length > 0 ? memory.tags.map((t) => `#${t}`).join(' ') : '없음'}

> ${memory.content}

---
이 내용은 앞으로 에이전트의 행동에 반영됩니다.

💡 학습 내용 확인: \`/memories\`
💡 학습 삭제: \`/forget "${memory.title.slice(0, 10)}..."\``,
        };
      } catch (error) {
        return {
          success: false,
          output: `❌ 학습 실패: ${error}`,
        };
      }
    },
  };
}
