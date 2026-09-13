import type { StoryContext } from 'storybook/internal/types';

/** Whether the story canvas is showing markup-only SSR inside a sandboxed iframe. */
export function isStaticSsrPreview(canvasElement: HTMLElement): boolean {
	return Boolean(
		canvasElement.querySelector('iframe.radiant-ssr-static-frame') ||
		canvasElement.ownerDocument.defaultView?.frameElement?.classList.contains('radiant-ssr-static-frame'),
	);
}

/**
 * Skip interaction plays in `ssr-static` — the canvas is a sandboxed iframe with no client module.
 */
export function whenInteractive(play: (context: StoryContext) => unknown): (context: StoryContext) => Promise<void> {
	return async (context) => {
		if (isStaticSsrPreview(context.canvasElement)) return;
		await play(context);
	};
}
