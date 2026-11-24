/**
 * @remarks
 * Fits each layout page frame to its column and to its page: the frame keeps the width the reader chose, its scale is
 * what makes that width fit (it never enlarges the frame), and its height is the height of the page inside, measured
 * again whenever the page reflows. The script runs on the first load and after each client-side navigation, and
 * observers follow the column and the page afterwards.
 */
const DEMO_SELECTOR = '.layout-page-demo';
const fitted = new WeakSet<Element>();

function fitWidth(demo: HTMLElement): void {
	const chosen = demo.querySelector<HTMLInputElement>('input:checked');
	const width = Number(chosen?.value);
	if (!Number.isFinite(width) || width <= 0) return;
	demo.style.setProperty('--frame-width', `${width}px`);
	demo.style.setProperty('--frame-scale', String(Math.min(1, demo.clientWidth / width)));
}

function fitHeight(demo: HTMLElement, frame: HTMLIFrameElement): void {
	const height = frame.contentDocument?.documentElement.offsetHeight;
	if (height) demo.style.setProperty('--frame-height', `${height}px`);
}

function follow(demo: HTMLElement): void {
	const frame = demo.querySelector('iframe');
	if (!frame) return;
	const measure = () => {
		fitHeight(demo, frame);
		const page = frame.contentDocument?.documentElement;
		if (page) new ResizeObserver(() => fitHeight(demo, frame)).observe(page);
	};
	if (frame.contentDocument?.readyState === 'complete') measure();
	frame.addEventListener('load', measure);
}

function fitFrames(): void {
	for (const demo of document.querySelectorAll<HTMLElement>(DEMO_SELECTOR)) {
		fitWidth(demo);
		if (fitted.has(demo)) continue;
		fitted.add(demo);
		new ResizeObserver(() => fitWidth(demo)).observe(demo);
		demo.addEventListener('change', () => fitWidth(demo));
		follow(demo);
	}
}

fitFrames();
document.addEventListener('eco:page-load', fitFrames);
document.addEventListener('eco:after-swap', fitFrames);
