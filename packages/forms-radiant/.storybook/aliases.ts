import path from 'node:path';

const packageRoot = path.join(import.meta.dirname, '..');

/**
 * Vite aliases shared by `.storybook/main.ts` (`storybook dev` does not load vite.config).
 */
export const formsRadiantAliases = [
	{ find: '@schema-engine/forms-radiant', replacement: path.join(packageRoot, 'src') },
	{ find: '@', replacement: path.join(packageRoot, 'src') },
];
