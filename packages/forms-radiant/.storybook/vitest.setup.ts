import '@testing-library/jest-dom/vitest';

import { page } from 'vitest/browser';

type ViewportSize = { width: number; height: number };

interface TestViewportGlobal {
	__seTestViewport?: (size: ViewportSize | null) => Promise<void>;
}

/** Must match the `browser.viewport` configured for the storybook vitest project. */
const DEFAULT_VIEWPORT: ViewportSize = { width: 1280, height: 720 };

/**
 * Lets storybook plays resize the real browser viewport (and reset it).
 *
 * @remarks Plays call `globalThis.__seTestViewport` defensively; it is only
 * registered here, inside the vitest browser context, so storybook dev builds
 * never load the test-only `vitest/browser` module.
 */
(globalThis as unknown as TestViewportGlobal).__seTestViewport = async (size) => {
	const { width, height } = size ?? DEFAULT_VIEWPORT;
	await page.viewport(width, height);
};
