/**
 * Bootstrap Analyzer
 * Project initial analysis and convention detection
 */
import * as fs from 'fs';
import * as path from 'path';
/**
 * Detect project type
 */
export function detectProjectType(rootPath) {
    const info = {
        name: path.basename(rootPath),
        type: 'unknown',
        frameworks: [],
        languages: [],
        hasTests: false,
        hasCI: false,
        hasDocs: false,
    };
    try {
        const files = fs.readdirSync(rootPath);
        // Detect project type
        if (files.includes('package.json')) {
            info.type = 'node';
            info.languages.push('JavaScript', 'TypeScript');
            // Analyze package.json
            try {
                const pkgJson = JSON.parse(fs.readFileSync(path.join(rootPath, 'package.json'), 'utf-8'));
                info.name = pkgJson.name || info.name;
                const deps = {
                    ...pkgJson.dependencies,
                    ...pkgJson.devDependencies,
                };
                // Detect frameworks
                if (deps.react)
                    info.frameworks.push('React');
                if (deps.vue)
                    info.frameworks.push('Vue');
                if (deps.angular || deps['@angular/core'])
                    info.frameworks.push('Angular');
                if (deps.next)
                    info.frameworks.push('Next.js');
                if (deps.express)
                    info.frameworks.push('Express');
                if (deps.nestjs || deps['@nestjs/core'])
                    info.frameworks.push('NestJS');
            }
            catch { }
        }
        else if (files.includes('requirements.txt') || files.includes('pyproject.toml')) {
            info.type = 'python';
            info.languages.push('Python');
        }
        else if (files.includes('go.mod')) {
            info.type = 'go';
            info.languages.push('Go');
        }
        else if (files.includes('Cargo.toml')) {
            info.type = 'rust';
            info.languages.push('Rust');
        }
        else if (files.includes('pom.xml') || files.includes('build.gradle')) {
            info.type = 'java';
            info.languages.push('Java');
        }
        // Detect TypeScript
        if (files.includes('tsconfig.json')) {
            if (!info.languages.includes('TypeScript')) {
                info.languages.push('TypeScript');
            }
        }
        // Detect tests
        info.hasTests =
            files.includes('__tests__') ||
                files.includes('tests') ||
                files.includes('test') ||
                files.includes('spec') ||
                files.some((f) => f.includes('.test.') || f.includes('.spec.'));
        // Detect CI
        info.hasCI =
            files.includes('.github') ||
                files.includes('.gitlab-ci.yml') ||
                files.includes('Jenkinsfile') ||
                files.includes('.circleci');
        // Detect docs
        info.hasDocs =
            files.includes('docs') ||
                files.includes('README.md') ||
                files.includes('CONTRIBUTING.md');
    }
    catch { }
    return info;
}
/**
 * Analyze structure
 */
export function analyzeStructure(rootPath) {
    const analysis = {
        sourceDir: null,
        testDir: null,
        configFiles: [],
        entryPoints: [],
        patterns: [],
    };
    try {
        const files = fs.readdirSync(rootPath);
        // Detect source directory
        const sourceDirs = ['src', 'lib', 'app', 'source'];
        for (const dir of sourceDirs) {
            if (files.includes(dir)) {
                analysis.sourceDir = dir;
                break;
            }
        }
        // Detect test directory
        const testDirs = ['__tests__', 'tests', 'test', 'spec'];
        for (const dir of testDirs) {
            if (files.includes(dir)) {
                analysis.testDir = dir;
                break;
            }
        }
        // Config files
        const configPatterns = [
            /^\..*rc(\.json|\.js|\.yml)?$/,
            /^.*config\.(js|ts|json|yml)$/,
            /^tsconfig.*\.json$/,
            /^\.env.*/,
        ];
        for (const file of files) {
            if (configPatterns.some((p) => p.test(file))) {
                analysis.configFiles.push(file);
            }
        }
        // Detect entry points
        const entryPatterns = ['index.ts', 'index.js', 'main.ts', 'main.js', 'app.ts', 'app.js'];
        for (const pattern of entryPatterns) {
            if (files.includes(pattern)) {
                analysis.entryPoints.push(pattern);
            }
            if (analysis.sourceDir) {
                const srcEntry = path.join(analysis.sourceDir, pattern);
                try {
                    if (fs.existsSync(path.join(rootPath, srcEntry))) {
                        analysis.entryPoints.push(srcEntry);
                    }
                }
                catch { }
            }
        }
        // Detect patterns
        if (files.includes('components') || files.some((f) => f.includes('.component.'))) {
            analysis.patterns.push('Component-based structure');
        }
        if (files.includes('services') || files.some((f) => f.includes('.service.'))) {
            analysis.patterns.push('Service layer pattern');
        }
        if (files.includes('models') || files.includes('entities')) {
            analysis.patterns.push('Model/Entity separation');
        }
        if (files.includes('controllers') || files.includes('routes')) {
            analysis.patterns.push('MVC/Route pattern');
        }
        if (files.includes('hooks') || files.some((f) => f.startsWith('use'))) {
            analysis.patterns.push('React Hooks pattern');
        }
    }
    catch { }
    return analysis;
}
/**
 * Detect conventions
 */
export function detectConventions(rootPath) {
    const conventions = [];
    try {
        // Analyze ESLint config
        const eslintFiles = ['.eslintrc', '.eslintrc.js', '.eslintrc.json', '.eslintrc.yml'];
        for (const file of eslintFiles) {
            if (fs.existsSync(path.join(rootPath, file))) {
                conventions.push({
                    title: 'ESLint Code Style',
                    content: `ESLint config file found: ${file}. Follow project lint rules.`,
                    category: 'convention',
                    scope: 'project',
                    confidence: 0.9,
                    tags: ['eslint', 'lint', 'style'],
                    sources: ['bootstrap'],
                });
                break;
            }
        }
        // Analyze Prettier config
        const prettierFiles = ['.prettierrc', '.prettierrc.js', '.prettierrc.json', 'prettier.config.js'];
        for (const file of prettierFiles) {
            if (fs.existsSync(path.join(rootPath, file))) {
                conventions.push({
                    title: 'Prettier Formatting',
                    content: `Prettier config file found: ${file}. Follow auto-formatting rules.`,
                    category: 'convention',
                    scope: 'project',
                    confidence: 0.9,
                    tags: ['prettier', 'format', 'style'],
                    sources: ['bootstrap'],
                });
                break;
            }
        }
        // Check TypeScript strict mode
        try {
            const tsConfigPath = path.join(rootPath, 'tsconfig.json');
            if (fs.existsSync(tsConfigPath)) {
                const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf-8'));
                if (tsConfig.compilerOptions?.strict) {
                    conventions.push({
                        title: 'TypeScript Strict Mode',
                        content: 'TypeScript strict mode enabled. Type safety is priority.',
                        category: 'convention',
                        scope: 'project',
                        confidence: 0.95,
                        tags: ['typescript', 'strict', 'type-safety'],
                        sources: ['bootstrap'],
                    });
                }
            }
        }
        catch { }
        // Detect file naming convention
        try {
            const srcPath = path.join(rootPath, 'src');
            if (fs.existsSync(srcPath)) {
                const srcFiles = fs.readdirSync(srcPath, { recursive: true });
                const fileNames = srcFiles.filter((f) => typeof f === 'string' && !f.includes('node_modules'));
                // Detect kebab-case
                const kebabCase = fileNames.filter((f) => /^[a-z]+(-[a-z]+)+\.[a-z]+$/.test(path.basename(f)));
                // Detect PascalCase
                const pascalCase = fileNames.filter((f) => /^[A-Z][a-zA-Z]+\.[a-z]+$/.test(path.basename(f)));
                // Detect camelCase
                const camelCase = fileNames.filter((f) => /^[a-z]+[A-Z][a-zA-Z]*\.[a-z]+$/.test(path.basename(f)));
                if (kebabCase.length > pascalCase.length && kebabCase.length > camelCase.length) {
                    conventions.push({
                        title: 'File Naming: kebab-case',
                        content: 'Use kebab-case for file names (e.g., my-component.ts)',
                        category: 'convention',
                        scope: 'project',
                        confidence: 0.7,
                        tags: ['naming', 'file', 'kebab-case'],
                        sources: ['bootstrap'],
                    });
                }
                else if (pascalCase.length > camelCase.length) {
                    conventions.push({
                        title: 'File Naming: PascalCase',
                        content: 'Use PascalCase for file names (e.g., MyComponent.ts)',
                        category: 'convention',
                        scope: 'project',
                        confidence: 0.7,
                        tags: ['naming', 'file', 'pascal-case'],
                        sources: ['bootstrap'],
                    });
                }
            }
        }
        catch { }
    }
    catch { }
    return conventions;
}
/**
 * Run full bootstrap analysis
 */
export function runBootstrapAnalysis(rootPath) {
    const projectInfo = detectProjectType(rootPath);
    const structure = analyzeStructure(rootPath);
    const conventionMemories = detectConventions(rootPath);
    // Generate project context
    const projectContext = [];
    // Basic project info
    projectContext.push({
        title: 'Project Overview',
        content: `Project: ${projectInfo.name}
Type: ${projectInfo.type}
Languages: ${projectInfo.languages.join(', ')}
Frameworks: ${projectInfo.frameworks.join(', ') || 'None'}
Tests: ${projectInfo.hasTests ? 'Yes' : 'No'}
CI/CD: ${projectInfo.hasCI ? 'Yes' : 'No'}`,
        category: 'context',
        scope: 'project',
        confidence: 0.95,
        tags: ['project', 'overview', projectInfo.type],
        sources: ['bootstrap'],
    });
    // Structure info
    if (structure.sourceDir || structure.patterns.length > 0) {
        projectContext.push({
            title: 'Project Structure',
            content: `Source directory: ${structure.sourceDir || 'root'}
Test directory: ${structure.testDir || 'None'}
Entry points: ${structure.entryPoints.join(', ') || 'None'}
Patterns: ${structure.patterns.join(', ') || 'None'}`,
            category: 'context',
            scope: 'project',
            confidence: 0.9,
            tags: ['structure', 'architecture'],
            sources: ['bootstrap'],
        });
    }
    return {
        conventions: conventionMemories,
        projectContext,
        bestPractices: [], // Provided by separate module
        analyzedAt: new Date(),
    };
}
