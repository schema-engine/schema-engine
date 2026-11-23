import { chromium } from 'playwright';
import { expect, inject, test } from 'vitest';

const baseUrl = inject('docsBaseUrl');
const experimentalPath = '/docs/forms/agent-tool';
const stablePath = '/docs/forms/builder';

const badge = '.docs-status-badge[title="Experimental: this API may change"]';

async function badgesOn(path: string) {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
		return {
			sidebarOwn: await page.locator(`rui-sidebar a[href="${path}"] ${badge}`).count(),
			sidebarOthers: await page.locator(`rui-sidebar a:not([href="${path}"]) ${badge}`).count(),
			breadcrumb: await page.locator(`rui-breadcrumb ${badge}`).count(),
			labels: await page
				.locator(`rui-breadcrumb ${badge} svg`)
				.evaluateAll((icons) => icons.map((icon) => icon.getAttribute('aria-label'))),
		};
	} finally {
		await browser.close();
	}
}

test('a page with status experimental shows the flask beside its sidebar link and in its breadcrumb', async () => {
	const badges = await badgesOn(experimentalPath);

	expect(badges.sidebarOwn).toBe(1);
	expect(badges.breadcrumb).toBe(1);
	expect(badges.labels).toEqual(['Experimental']);
});

test('a page without it shows no flask in its breadcrumb, and its sidebar link has none', async () => {
	const badges = await badgesOn(stablePath);

	expect(badges.sidebarOwn).toBe(0);
	expect(badges.breadcrumb).toBe(0);
	expect(badges.sidebarOthers).toBeGreaterThan(0);
});

test('llms.txt notes the experimental page and no stable one', async () => {
	const lines = (await (await fetch(`${baseUrl}/llms.txt`)).text()).split('\n');

	expect(lines.find((line) => line.includes('/docs-llm/forms/agent-tool.md'))).toMatch(/\(experimental\)$/);
	expect(lines.find((line) => line.includes('/docs-llm/forms/builder.md'))).not.toMatch(/experimental/);
});
