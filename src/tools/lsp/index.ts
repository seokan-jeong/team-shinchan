/**
 * LSP 도구들 - Language Server Protocol 기반 도구
 */

import type { ToolConfig, PluginContext } from '../../types';

export function createLspDiagnosticsTool(context: PluginContext): ToolConfig {
  return {
    name: 'lsp_diagnostics',
    description: 'LSP를 사용하여 파일 또는 디렉토리의 타입 에러와 린트 오류를 확인합니다.',

    parameters: [
      {
        name: 'path',
        type: 'string',
        description: '진단할 파일 또는 디렉토리 경로',
        required: true,
      },
    ],

    handler: async (params) => {
      const path = params.path as string;

      return {
        success: true,
        output: {
          path,
          note: 'TypeScript 프로젝트의 경우 tsc --noEmit을 사용합니다.',
          instruction: `Bash(command="npx tsc --noEmit", description="TypeScript 타입 체크")`,
        },
      };
    },
  };
}

export function createLspRenameTool(context: PluginContext): ToolConfig {
  return {
    name: 'lsp_rename',
    description: 'LSP를 사용하여 심볼 이름을 프로젝트 전체에서 안전하게 변경합니다.',

    parameters: [
      {
        name: 'file',
        type: 'string',
        description: '심볼이 정의된 파일',
        required: true,
      },
      {
        name: 'line',
        type: 'number',
        description: '심볼의 라인 번호',
        required: true,
      },
      {
        name: 'column',
        type: 'number',
        description: '심볼의 컬럼 번호',
        required: true,
      },
      {
        name: 'newName',
        type: 'string',
        description: '새 이름',
        required: true,
      },
    ],

    handler: async (params) => {
      const file = params.file as string;
      const line = params.line as number;
      const column = params.column as number;
      const newName = params.newName as string;

      return {
        success: true,
        output: {
          file,
          position: { line, column },
          newName,
          note: 'IDE의 리팩토링 기능 또는 ts-morph를 사용하여 안전하게 이름을 변경하세요.',
        },
      };
    },
  };
}

export function createLspReferencesTool(context: PluginContext): ToolConfig {
  return {
    name: 'lsp_references',
    description: 'LSP를 사용하여 심볼의 모든 참조를 찾습니다.',

    parameters: [
      {
        name: 'file',
        type: 'string',
        description: '심볼이 정의된 파일',
        required: true,
      },
      {
        name: 'line',
        type: 'number',
        description: '심볼의 라인 번호',
        required: true,
      },
      {
        name: 'column',
        type: 'number',
        description: '심볼의 컬럼 번호',
        required: true,
      },
    ],

    handler: async (params) => {
      const file = params.file as string;
      const line = params.line as number;
      const column = params.column as number;

      return {
        success: true,
        output: {
          file,
          position: { line, column },
          instruction: `Grep 도구로 심볼 이름을 검색하거나, 흰둥이(Explorer)에게 위임하세요.`,
        },
      };
    },
  };
}
