/**
 * look_at - 파일/이미지 조회
 */

import type { ToolConfig, PluginContext } from '../../types';

export function createLookAtTool(context: PluginContext): ToolConfig {
  return {
    name: 'look_at',
    description: '파일이나 이미지를 조회합니다. 나미리(Multimodal) 에이전트가 분석할 수 있습니다.',

    parameters: [
      {
        name: 'path',
        type: 'string',
        description: '조회할 파일 경로',
        required: true,
      },
      {
        name: 'analyze',
        type: 'boolean',
        description: '이미지인 경우 나미리에게 분석 요청',
        required: false,
        default: false,
      },
    ],

    handler: async (params) => {
      const path = params.path as string;
      const analyze = params.analyze as boolean;

      // 이미지 파일 확장자 확인
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
      const isImage = imageExtensions.some((ext) => path.toLowerCase().endsWith(ext));

      // PDF 확인
      const isPdf = path.toLowerCase().endsWith('.pdf');

      if ((isImage || isPdf) && analyze) {
        return {
          success: true,
          output: {
            path,
            type: isImage ? 'image' : 'pdf',
            recommendation: '나미리(Multimodal) 에이전트에게 분석을 위임하세요.',
            instruction: `delegate_task(agent="namiri", task="이 ${isImage ? '이미지' : 'PDF'}를 분석해주세요: ${path}")`,
          },
        };
      }

      return {
        success: true,
        output: {
          path,
          type: isImage ? 'image' : isPdf ? 'pdf' : 'file',
          instruction: `Read 도구를 사용하여 파일을 읽으세요.`,
        },
      };
    },
  };
}
