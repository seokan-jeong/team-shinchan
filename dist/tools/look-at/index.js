/**
 * look_at - View file/image
 */
export function createLookAtTool(context) {
    return {
        name: 'look_at',
        description: 'View a file or image. Ume (Multimodal) agent can analyze it.',
        parameters: [
            {
                name: 'path',
                type: 'string',
                description: 'File path to view',
                required: true,
            },
            {
                name: 'analyze',
                type: 'boolean',
                description: 'Request analysis from Ume for images',
                required: false,
                default: false,
            },
        ],
        handler: async (params) => {
            const path = params.path;
            const analyze = params.analyze;
            // Check image file extension
            const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
            const isImage = imageExtensions.some((ext) => path.toLowerCase().endsWith(ext));
            // Check PDF
            const isPdf = path.toLowerCase().endsWith('.pdf');
            if ((isImage || isPdf) && analyze) {
                return {
                    success: true,
                    output: {
                        path,
                        type: isImage ? 'image' : 'pdf',
                        recommendation: 'Delegate analysis to Ume (Multimodal) agent.',
                        instruction: `delegate_task(agent="namiri", task="Please analyze this ${isImage ? 'image' : 'PDF'}: ${path}")`,
                    },
                };
            }
            return {
                success: true,
                output: {
                    path,
                    type: isImage ? 'image' : isPdf ? 'pdf' : 'file',
                    instruction: `Use the Read tool to read the file.`,
                },
            };
        },
    };
}
