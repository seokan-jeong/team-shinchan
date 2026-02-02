/**
 * interactive_bash - 대화형 bash 세션
 */

import type { ToolConfig, PluginContext } from '../../types';

export function createInteractiveBashTool(context: PluginContext): ToolConfig {
  return {
    name: 'interactive_bash',
    description: '대화형 bash 세션을 시작합니다. 사용자 입력이 필요한 명령에 사용합니다.',

    parameters: [
      {
        name: 'command',
        type: 'string',
        description: '실행할 명령',
        required: true,
      },
      {
        name: 'timeout',
        type: 'number',
        description: '타임아웃 (밀리초)',
        required: false,
        default: 30000,
      },
    ],

    handler: async (params) => {
      const command = params.command as string;
      const timeout = params.timeout as number;

      return {
        success: true,
        output: {
          command,
          timeout,
          note: '대화형 bash 세션은 tmux를 통해 관리됩니다.',
          instruction: `Bash 도구를 사용하세요: Bash(command="${command}", timeout=${timeout})`,
        },
      };
    },
  };
}
