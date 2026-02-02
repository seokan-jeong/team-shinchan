/**
 * ast_grep - AST 기반 코드 검색
 */

import type { ToolConfig, PluginContext } from '../../types';

export function createAstGrepTool(context: PluginContext): ToolConfig {
  return {
    name: 'ast_grep',
    description: 'AST(Abstract Syntax Tree) 기반으로 코드 패턴을 검색합니다. 정확한 코드 구조 매칭에 유용합니다.',

    parameters: [
      {
        name: 'pattern',
        type: 'string',
        description: '검색할 AST 패턴',
        required: true,
      },
      {
        name: 'language',
        type: 'string',
        description: '대상 언어 (typescript, javascript, python 등)',
        required: true,
      },
      {
        name: 'path',
        type: 'string',
        description: '검색할 경로',
        required: false,
        default: '.',
      },
    ],

    handler: async (params) => {
      const pattern = params.pattern as string;
      const language = params.language as string;
      const path = params.path as string;

      return {
        success: true,
        output: {
          pattern,
          language,
          path,
          instruction: `ast-grep CLI를 사용하세요: sg --pattern "${pattern}" --lang ${language} ${path}`,
        },
      };
    },
  };
}
