import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { rm } from 'node:fs/promises';
import { createServer, type AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { expect as pwExpect } from '@playwright/test';
import { chromium, type Browser, type Page } from 'playwright';
import { copyRegistryDemo } from '../../scripts/copy-registry-demo';

const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const examplesPath = '/docs/forms-react/components';

/** Output of the dev server, apart from the `dist` and `.eco` the production preview serves. */
const DEV_DIST_DIR = 'dist-dev-smoke';
const DEV_WORK_DIR = '.eco-dev-smoke';

/**
 * Console errors that mean the demo graph broke: a missing provider, a module outside `src/`, or one
 * that failed to load, or a server-rendered tree React could not hydrate.
 */
const BOUNDARY_ERROR =
	/must be used within|outside .*src|failed to resolve|failed to fetch dynamically imported module|cannot find module|hydrated but some attributes/i;

async function findFreePort(): Promise<number> {
	const server = createServer();
	server.listen(0);
	await once(server, 'listening');
	const { port } = server.address() as AddressInfo;
	server.close();
	await once(server, 'close');
	return port;
}

async function waitForServer(baseUrl: string, server: ChildProcess, stderr: string[]): Promise<void> {
	let exitCode: number | null | undefined;
	server.once('exit', (code) => {
		exitCode = code;
	});
	for (let attempt = 0; attempt < 120; attempt += 1) {
		if (exitCode !== undefined) {
			throw new Error(`Docs dev server exited with code ${String(exitCode)}\n${stderr.join('')}`);
		}
		try {
			const response = await fetch(`${baseUrl}${examplesPath}`, { signal: AbortSignal.timeout(30_000) });
			if (response.ok) return;
		} catch {
			/* the server is not listening yet */
		}
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
	throw new Error(`Timed out waiting for the docs dev server at ${baseUrl}`);
}

/**
 * The dev server transforms client entrypoints on demand and refuses any outside `src/`, a boundary
 * the production build does not enforce. This runs the shadcn example against `ecopages dev` so a
 * demo graph that reaches into `registry/` fails here and not only for a contributor running `pnpm dev`.
 */
describe('docs dev server source boundary', () => {
	let browser: Browser;
	let page: Page;
	let server: ChildProcess;
	let baseUrl: string;
	const problems: string[] = [];

	beforeAll(async () => {
		await copyRegistryDemo();
		const port = await findFreePort();
		baseUrl = `http://localhost:${port}`;
		const stderr: string[] = [];
		server = spawn('pnpm', ['exec', 'ecopages', 'dev', '-p', String(port)], {
			cwd: docsRoot,
			stdio: ['ignore', 'ignore', 'pipe'],
			env: { ...process.env, VITEST: undefined, DOCS_DIST_DIR: DEV_DIST_DIR, DOCS_WORK_DIR: DEV_WORK_DIR },
			detached: true,
		});
		server.stderr?.on('data', (chunk: Buffer) => stderr.push(chunk.toString()));
		await waitForServer(baseUrl, server, stderr);

		browser = await chromium.launch();
		page = await browser.newPage();
		page.on('pageerror', (error) => problems.push(error.message));
		page.on('console', (message) => {
			if (message.type() === 'error' && BOUNDARY_ERROR.test(message.text())) {
				problems.push(`console: ${message.text()}`);
			}
		});
	}, 240_000);

	afterEach(() => {
		problems.length = 0;
	});

	afterAll(async () => {
		await page?.close();
		await browser?.close();
		if (server?.pid) {
			const exited = server.exitCode === null ? once(server, 'exit') : Promise.resolve();
			try {
				process.kill(-server.pid, 'SIGTERM');
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
			}
			await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 3000))]);
		}
		await Promise.all(
			[DEV_DIST_DIR, DEV_WORK_DIR].map((dir) => rm(path.join(docsRoot, dir), { recursive: true, force: true })),
		);
	});

	test('the shadcn example hydrates, validates and submits on one React context', async () => {
		await page.goto(`${baseUrl}${examplesPath}`, { waitUntil: 'networkidle' });
		const demo = page.locator('[data-se-react-form-demo-kit="shadcn"]');
		await page
			.waitForFunction(
				() => {
					const form = document.querySelector('[data-se-react-form-demo-kit="shadcn"] form');
					return !!form && Object.keys(form).some((key) => key.startsWith('__react'));
				},
				undefined,
				{ timeout: 60_000 },
			)
			.catch((error: unknown) => {
				throw new Error(`The shadcn demo never hydrated. Console errors: ${JSON.stringify(problems)}`, {
					cause: error,
				});
			});

		await demo.locator('button[type="submit"]').click();
		await pwExpect(demo.locator('input[name="name"]')).toHaveAttribute('aria-invalid', 'true');

		await demo.locator('input[name="name"]').fill('Ada Lovelace');
		await demo.locator('input[name="email"]').fill('ada@example.com');
		await demo.locator('button[type="submit"]').click();
		await pwExpect(demo.locator('[aria-invalid="true"]')).toHaveCount(0);
		expect(problems).toEqual([]);
	}, 120_000);

	test('the Radiant-styled demo kit still hydrates in dev', async () => {
		await page.goto(`${baseUrl}/docs/examples/contact-form`, { waitUntil: 'networkidle' });
		await page.waitForFunction(
			() => {
				const form = document.querySelector('.docs-react-form-demo form');
				return !!form && Object.keys(form).some((key) => key.startsWith('__react'));
			},
			undefined,
			{ timeout: 60_000 },
		);
		await page.locator('.docs-react-form-demo button[type="submit"]').click();
		await pwExpect(page.locator('.docs-react-form-demo input[name="email"]')).toHaveAttribute(
			'aria-invalid',
			'true',
		);
		expect(problems).toEqual([]);
	}, 120_000);

	test.each(['/docs/forms-react/layouts', '/docs/examples/theming', '/docs/examples/contact-form'])(
		'%s hydrates its form demos without a mismatch in dev',
		async (pagePath) => {
			await page.goto(`${baseUrl}${pagePath}`, { waitUntil: 'networkidle' });
			await page.waitForFunction(
				() => {
					const form = document.querySelector('[data-se-theme] form, form[data-se-theme]');
					return !!form && Object.keys(form).some((key) => key.startsWith('__react'));
				},
				undefined,
				{ timeout: 60_000 },
			);
			expect(problems).toEqual([]);
		},
		120_000,
	);

	test('On this page lists page sections but not the headings inside a rendered form demo', async () => {
		await page.goto(`${baseUrl}/docs/examples/registration-wizard`, { waitUntil: 'networkidle' });
		await page.waitForSelector('.rui-toc__link');

		const demoHeading = page.locator('[data-se-theme] h2').first();
		expect(await demoHeading.textContent()).toBe('Account');
		expect(await demoHeading.getAttribute('id')).toBeNull();

		const entries = await page.locator('.rui-toc__link').allTextContents();
		expect(entries).toContain('See it');
		expect(entries).toContain('The config');
		expect(entries).not.toContain('Account');
		expect(problems).toEqual([]);
	}, 120_000);
});
