import path from 'node:path';

const packageRoot = path.join(import.meta.dirname, '..');

/**
 * Vite aliases shared by `.storybook/main.ts` (`storybook dev` does not load vite.config).
 * `@/registry/forms` must be listed before `@` so it is not swallowed by the src prefix.
 */
export const formsRadiantAliases = [
	{ find: '@/registry/forms', replacement: path.join(packageRoot, '../../registry/shared/forms') },
	{ find: '@schema-engine/forms-radiant', replacement: path.join(packageRoot, 'src') },
	{ find: '@', replacement: path.join(packageRoot, 'src') },
];
