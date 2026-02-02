/**
 * slashcommand - 슬래시 명령 실행
 */

import type { ToolConfig, PluginContext } from '../../types';

export function createSlashcommandTool(context: PluginContext): ToolConfig {
  return {
    name: 'slashcommand',
    description: 'Team-Seokan 슬래시 명령을 실행합니다.',

    parameters: [
      {
        name: 'command',
        type: 'string',
        description: '실행할 명령 (예: team-seokan:help)',
        required: true,
      },
      {
        name: 'args',
        type: 'string',
        description: '명령 인자',
        required: false,
      },
    ],

    handler: async (params) => {
      const command = params.command as string;
      const args = params.args as string | undefined;

      // team-seokan: 접두사 처리
      const normalizedCommand = command.startsWith('team-seokan:')
        ? command.replace('team-seokan:', '')
        : command;

      // 스킬로 변환 시도
      const skill = context.skills.get(normalizedCommand);
      if (skill) {
        const result = await skill.handler({
          args,
          message: args || '',
          sessionState: context.sessionState,
        });
        return result;
      }

      return {
        success: false,
        error: `명령 '${command}'을 찾을 수 없습니다.`,
      };
    },
  };
}
