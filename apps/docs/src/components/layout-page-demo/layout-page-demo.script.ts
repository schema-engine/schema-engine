/**
 * @remarks
 * Fits each layout page frame to its column: the frame keeps the width the reader chose, and its scale is what makes
 * that width fit. The scale never enlarges the frame. The script runs on the first load and after each client-side
 * navigation, and a resize observer follows the column afterwards.
 */
const DEMO_SELECTOR = '.layout-page-demo';
const fitted = new WeakSet<Element>();

function fit(demo: HTMLElement): void {
	const chosen = demo.querySelector<HTMLInputElement>('input:checked');
	const width = Number(chosen?.value);
	if (!Number.isFinite(width) || width <= 0) return;
	demo.style.setProperty('--frame-width', `${width}px`);
	demo.style.setProperty('--frame-scale', String(Math.min(1, demo.clientWidth / width)));
}

function fitFrames(): void {
	for (const demo of document.querySelectorAll<HTMLElement>(DEMO_SELECTOR)) {
		fit(demo);
		if (fitted.has(demo)) continue;
		fitted.add(demo);
		new ResizeObserver(() => fit(demo)).observe(demo);
		demo.addEventListener('change', () => fit(demo));
	}
}

fitFrames();
document.addEventListener('eco:page-load', fitFrames);
document.addEventListener('eco:after-swap', fitFrames);
