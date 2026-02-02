/**
 * Bootstrap Analyzer
 * 프로젝트 초기 분석 및 컨벤션 감지
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  CreateMemoryInput,
  BootstrapResult,
} from '../memory/types';

/**
 * 프로젝트 정보
 */
export interface ProjectInfo {
  name: string;
  type: 'node' | 'python' | 'go' | 'rust' | 'java' | 'unknown';
  frameworks: string[];
  languages: string[];
  hasTests: boolean;
  hasCI: boolean;
  hasDocs: boolean;
}

/**
 * 파일 구조 분석
 */
export interface StructureAnalysis {
  sourceDir: string | null;
  testDir: string | null;
  configFiles: string[];
  entryPoints: string[];
  patterns: string[];
}

/**
 * 프로젝트 유형 감지
 */
export function detectProjectType(rootPath: string): ProjectInfo {
  const info: ProjectInfo = {
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

    // 프로젝트 유형 감지
    if (files.includes('package.json')) {
      info.type = 'node';
      info.languages.push('JavaScript', 'TypeScript');

      // package.json 분석
      try {
        const pkgJson = JSON.parse(
          fs.readFileSync(path.join(rootPath, 'package.json'), 'utf-8')
        );
        info.name = pkgJson.name || info.name;

        const deps = {
          ...pkgJson.dependencies,
          ...pkgJson.devDependencies,
        };

        // 프레임워크 감지
        if (deps.react) info.frameworks.push('React');
        if (deps.vue) info.frameworks.push('Vue');
        if (deps.angular || deps['@angular/core']) info.frameworks.push('Angular');
        if (deps.next) info.frameworks.push('Next.js');
        if (deps.express) info.frameworks.push('Express');
        if (deps.nestjs || deps['@nestjs/core']) info.frameworks.push('NestJS');
      } catch {}
    } else if (files.includes('requirements.txt') || files.includes('pyproject.toml')) {
      info.type = 'python';
      info.languages.push('Python');
    } else if (files.includes('go.mod')) {
      info.type = 'go';
      info.languages.push('Go');
    } else if (files.includes('Cargo.toml')) {
      info.type = 'rust';
      info.languages.push('Rust');
    } else if (files.includes('pom.xml') || files.includes('build.gradle')) {
      info.type = 'java';
      info.languages.push('Java');
    }

    // TypeScript 감지
    if (files.includes('tsconfig.json')) {
      if (!info.languages.includes('TypeScript')) {
        info.languages.push('TypeScript');
      }
    }

    // 테스트 감지
    info.hasTests =
      files.includes('__tests__') ||
      files.includes('tests') ||
      files.includes('test') ||
      files.includes('spec') ||
      files.some((f) => f.includes('.test.') || f.includes('.spec.'));

    // CI 감지
    info.hasCI =
      files.includes('.github') ||
      files.includes('.gitlab-ci.yml') ||
      files.includes('Jenkinsfile') ||
      files.includes('.circleci');

    // 문서 감지
    info.hasDocs =
      files.includes('docs') ||
      files.includes('README.md') ||
      files.includes('CONTRIBUTING.md');
  } catch {}

  return info;
}

/**
 * 구조 분석
 */
export function analyzeStructure(rootPath: string): StructureAnalysis {
  const analysis: StructureAnalysis = {
    sourceDir: null,
    testDir: null,
    configFiles: [],
    entryPoints: [],
    patterns: [],
  };

  try {
    const files = fs.readdirSync(rootPath);

    // 소스 디렉토리 감지
    const sourceDirs = ['src', 'lib', 'app', 'source'];
    for (const dir of sourceDirs) {
      if (files.includes(dir)) {
        analysis.sourceDir = dir;
        break;
      }
    }

    // 테스트 디렉토리 감지
    const testDirs = ['__tests__', 'tests', 'test', 'spec'];
    for (const dir of testDirs) {
      if (files.includes(dir)) {
        analysis.testDir = dir;
        break;
      }
    }

    // 설정 파일
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

    // 진입점 감지
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
        } catch {}
      }
    }

    // 패턴 감지
    if (files.includes('components') || files.some((f) => f.includes('.component.'))) {
      analysis.patterns.push('컴포넌트 기반 구조');
    }
    if (files.includes('services') || files.some((f) => f.includes('.service.'))) {
      analysis.patterns.push('서비스 레이어 패턴');
    }
    if (files.includes('models') || files.includes('entities')) {
      analysis.patterns.push('모델/엔티티 분리');
    }
    if (files.includes('controllers') || files.includes('routes')) {
      analysis.patterns.push('MVC/라우트 패턴');
    }
    if (files.includes('hooks') || files.some((f) => f.startsWith('use'))) {
      analysis.patterns.push('React Hooks 패턴');
    }
  } catch {}

  return analysis;
}

/**
 * 컨벤션 감지
 */
export function detectConventions(rootPath: string): CreateMemoryInput[] {
  const conventions: CreateMemoryInput[] = [];

  try {
    // ESLint 설정 분석
    const eslintFiles = ['.eslintrc', '.eslintrc.js', '.eslintrc.json', '.eslintrc.yml'];
    for (const file of eslintFiles) {
      if (fs.existsSync(path.join(rootPath, file))) {
        conventions.push({
          title: 'ESLint 코드 스타일',
          content: `ESLint 설정 파일 발견: ${file}. 프로젝트의 린트 규칙을 따릅니다.`,
          category: 'convention',
          scope: 'project',
          confidence: 0.9,
          tags: ['eslint', 'lint', 'style'],
          sources: ['bootstrap'],
        });
        break;
      }
    }

    // Prettier 설정 분석
    const prettierFiles = ['.prettierrc', '.prettierrc.js', '.prettierrc.json', 'prettier.config.js'];
    for (const file of prettierFiles) {
      if (fs.existsSync(path.join(rootPath, file))) {
        conventions.push({
          title: 'Prettier 포맷팅',
          content: `Prettier 설정 파일 발견: ${file}. 자동 포맷팅 규칙을 따릅니다.`,
          category: 'convention',
          scope: 'project',
          confidence: 0.9,
          tags: ['prettier', 'format', 'style'],
          sources: ['bootstrap'],
        });
        break;
      }
    }

    // TypeScript 엄격 모드 확인
    try {
      const tsConfigPath = path.join(rootPath, 'tsconfig.json');
      if (fs.existsSync(tsConfigPath)) {
        const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf-8'));
        if (tsConfig.compilerOptions?.strict) {
          conventions.push({
            title: 'TypeScript 엄격 모드',
            content: 'TypeScript strict 모드 활성화. 타입 안전성을 최우선합니다.',
            category: 'convention',
            scope: 'project',
            confidence: 0.95,
            tags: ['typescript', 'strict', 'type-safety'],
            sources: ['bootstrap'],
          });
        }
      }
    } catch {}

    // 파일 네이밍 컨벤션 감지
    try {
      const srcPath = path.join(rootPath, 'src');
      if (fs.existsSync(srcPath)) {
        const srcFiles = fs.readdirSync(srcPath, { recursive: true }) as string[];
        const fileNames = srcFiles.filter((f) => typeof f === 'string' && !f.includes('node_modules'));

        // 케밥 케이스 감지
        const kebabCase = fileNames.filter((f) => /^[a-z]+(-[a-z]+)+\.[a-z]+$/.test(path.basename(f)));
        // 파스칼 케이스 감지
        const pascalCase = fileNames.filter((f) => /^[A-Z][a-zA-Z]+\.[a-z]+$/.test(path.basename(f)));
        // 카멜 케이스 감지
        const camelCase = fileNames.filter((f) => /^[a-z]+[A-Z][a-zA-Z]*\.[a-z]+$/.test(path.basename(f)));

        if (kebabCase.length > pascalCase.length && kebabCase.length > camelCase.length) {
          conventions.push({
            title: '파일 네이밍: kebab-case',
            content: '파일명에 kebab-case 사용 (예: my-component.ts)',
            category: 'convention',
            scope: 'project',
            confidence: 0.7,
            tags: ['naming', 'file', 'kebab-case'],
            sources: ['bootstrap'],
          });
        } else if (pascalCase.length > camelCase.length) {
          conventions.push({
            title: '파일 네이밍: PascalCase',
            content: '파일명에 PascalCase 사용 (예: MyComponent.ts)',
            category: 'convention',
            scope: 'project',
            confidence: 0.7,
            tags: ['naming', 'file', 'pascal-case'],
            sources: ['bootstrap'],
          });
        }
      }
    } catch {}
  } catch {}

  return conventions;
}

/**
 * 전체 부트스트랩 분석 실행
 */
export function runBootstrapAnalysis(rootPath: string): BootstrapResult {
  const projectInfo = detectProjectType(rootPath);
  const structure = analyzeStructure(rootPath);
  const conventionMemories = detectConventions(rootPath);

  // 프로젝트 컨텍스트 생성
  const projectContext: CreateMemoryInput[] = [];

  // 기본 프로젝트 정보
  projectContext.push({
    title: '프로젝트 개요',
    content: `프로젝트: ${projectInfo.name}
유형: ${projectInfo.type}
언어: ${projectInfo.languages.join(', ')}
프레임워크: ${projectInfo.frameworks.join(', ') || '없음'}
테스트: ${projectInfo.hasTests ? '있음' : '없음'}
CI/CD: ${projectInfo.hasCI ? '있음' : '없음'}`,
    category: 'context',
    scope: 'project',
    confidence: 0.95,
    tags: ['project', 'overview', projectInfo.type],
    sources: ['bootstrap'],
  });

  // 구조 정보
  if (structure.sourceDir || structure.patterns.length > 0) {
    projectContext.push({
      title: '프로젝트 구조',
      content: `소스 디렉토리: ${structure.sourceDir || '루트'}
테스트 디렉토리: ${structure.testDir || '없음'}
진입점: ${structure.entryPoints.join(', ') || '없음'}
패턴: ${structure.patterns.join(', ') || '없음'}`,
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
    bestPractices: [], // 별도 모듈에서 제공
    analyzedAt: new Date(),
  };
}
