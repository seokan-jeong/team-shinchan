/**
 * Best Practices
 * Default best practices by language/framework
 */
/**
 * Common best practices
 */
const COMMON_PRACTICES = [
    {
        title: 'Clear Naming',
        content: 'Variable, function, and class names should clearly indicate their purpose. Prefer clear names over abbreviations.',
        category: 'convention',
        tags: ['naming', 'readability'],
        applicableTo: ['*'],
    },
    {
        title: 'Single Responsibility Principle',
        content: 'Each function/class should have only one responsibility. Separate code that does too much.',
        category: 'convention',
        tags: ['solid', 'architecture'],
        applicableTo: ['*'],
    },
    {
        title: 'DRY Principle',
        content: "Don't Repeat Yourself. Extract duplicate code into common functions/modules.",
        category: 'convention',
        tags: ['dry', 'refactoring'],
        applicableTo: ['*'],
    },
    {
        title: 'Error Handling',
        content: 'Handle exceptional cases appropriately. Provide meaningful error messages to users.',
        category: 'convention',
        tags: ['error-handling', 'robustness'],
        applicableTo: ['*'],
    },
    {
        title: 'Write Tests',
        content: 'Write tests for core logic. Add regression tests when fixing bugs.',
        category: 'convention',
        tags: ['testing', 'quality'],
        applicableTo: ['*'],
    },
];
/**
 * TypeScript best practices
 */
const TYPESCRIPT_PRACTICES = [
    {
        title: 'TypeScript Type Annotation',
        content: 'Specify function parameters and return types. Minimize any usage, prefer unknown.',
        category: 'convention',
        tags: ['typescript', 'type-safety'],
        applicableTo: ['TypeScript'],
    },
    {
        title: 'TypeScript Interface Usage',
        content: 'Define object types with interface. Type alias can be used when extension is not needed.',
        category: 'convention',
        tags: ['typescript', 'interface'],
        applicableTo: ['TypeScript'],
    },
    {
        title: 'TypeScript Null Safety',
        content: 'Enable strictNullChecks. Use optional chaining(?.) and nullish coalescing(??) appropriately.',
        category: 'convention',
        tags: ['typescript', 'null-safety'],
        applicableTo: ['TypeScript'],
    },
];
/**
 * React best practices
 */
const REACT_PRACTICES = [
    {
        title: 'React Functional Components',
        content: 'Use functional components and Hooks. Prefer functional over class components.',
        category: 'convention',
        tags: ['react', 'functional'],
        applicableTo: ['React'],
    },
    {
        title: 'React State Management',
        content: 'Use useState for local state, useReducer for complex state. Consider Context or external libraries for global state.',
        category: 'convention',
        tags: ['react', 'state'],
        applicableTo: ['React'],
    },
    {
        title: 'React Memoization',
        content: 'Use useMemo, useCallback, React.memo appropriately to prevent unnecessary re-renders.',
        category: 'convention',
        tags: ['react', 'performance'],
        applicableTo: ['React'],
    },
    {
        title: 'React Component Separation',
        content: 'Split components into smaller units when they become too large. Separate presentational and container components.',
        category: 'convention',
        tags: ['react', 'architecture'],
        applicableTo: ['React'],
    },
];
/**
 * Node.js best practices
 */
const NODE_PRACTICES = [
    {
        title: 'Node.js Async Handling',
        content: 'Use async/await. Use Promise instead of callbacks, handle errors with try-catch.',
        category: 'convention',
        tags: ['nodejs', 'async'],
        applicableTo: ['node'],
    },
    {
        title: 'Node.js Environment Variables',
        content: 'Manage sensitive information with environment variables. Use dotenv or similar tools.',
        category: 'convention',
        tags: ['nodejs', 'security', 'config'],
        applicableTo: ['node'],
    },
    {
        title: 'Node.js Module Structure',
        content: 'Separate modules by functionality. Expose public API through index.ts and hide internal implementation.',
        category: 'convention',
        tags: ['nodejs', 'architecture'],
        applicableTo: ['node'],
    },
];
/**
 * All best practices
 */
const ALL_PRACTICES = [
    ...COMMON_PRACTICES,
    ...TYPESCRIPT_PRACTICES,
    ...REACT_PRACTICES,
    ...NODE_PRACTICES,
];
/**
 * Get applicable best practices
 */
export function getBestPractices(languages, frameworks) {
    const applicable = new Set(['*', ...languages, ...frameworks]);
    return ALL_PRACTICES.filter((practice) => practice.applicableTo.some((target) => applicable.has(target))).map((practice) => ({
        title: practice.title,
        content: practice.content,
        category: practice.category,
        scope: 'global',
        confidence: 0.8,
        tags: practice.tags,
        sources: ['best-practices'],
    }));
}
/**
 * Get best practices by category
 */
export function getBestPracticesByCategory(category, languages, frameworks) {
    return getBestPractices(languages, frameworks).filter((p) => p.category === category);
}
/**
 * Summarize best practices
 */
export function summarizeBestPractices(practices) {
    if (practices.length === 0) {
        return 'No applicable best practices.';
    }
    const lines = [
        '## Best Practices',
        '',
        ...practices.map((p) => `- **${p.title}**: ${p.content.slice(0, 60)}...`),
    ];
    return lines.join('\n');
}
/**
 * Default best practices (language/framework agnostic)
 */
export function getDefaultBestPractices() {
    return COMMON_PRACTICES.map((practice) => ({
        title: practice.title,
        content: practice.content,
        category: practice.category,
        scope: 'global',
        confidence: 0.75,
        tags: [...practice.tags, 'default'],
        sources: ['best-practices-default'],
    }));
}
