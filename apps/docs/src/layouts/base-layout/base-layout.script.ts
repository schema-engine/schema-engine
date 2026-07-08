/**
 * Lazy browser-router bootstrap.
 *
 * Design note: `@ecopages/browser-router` is not declared as a dependency of
 * this app's package.json. We attempt to import it dynamically so the docs site
 * keeps working when the package is unavailable, while gaining SPA navigation
 * when it is installed.
 */
try {
	const { createRouter } = await import('@ecopages/browser-router/client');
	createRouter();
} catch {
	// Browser router is optional; the docs site renders fully without it.
}
