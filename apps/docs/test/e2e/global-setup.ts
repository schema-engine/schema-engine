import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer, type AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
	export interface ProvidedContext {
		docsBaseUrl: string;
	}
}

const probePath = '/docs/forms-react/getting-started';

async function isServing(baseUrl: string): Promise<boolean> {
	try {
		const response = await fetch(`${baseUrl}${probePath}`, { signal: AbortSignal.timeout(5000) });
		return response.ok;
	} catch {
		return false;
	}
}

/** Polls the preview once a second until it serves the probe page, `preview` exits, or 120 attempts pass. */
async function waitForPreview(baseUrl: string, preview: ChildProcess): Promise<void> {
	let exitCode: number | null | undefined;
	preview.once('exit', (code) => {
		exitCode = code;
	});
	for (let attempt = 0; attempt < 120; attempt += 1) {
		if (exitCode !== undefined) {
			throw new Error(`Docs preview exited with code ${String(exitCode)} before serving ${baseUrl}`);
		}
		if (await isServing(baseUrl)) {
			return;
		}
		await new Promise((resolve) => {
			setTimeout(resolve, 1000);
		});
	}
	throw new Error(`Timed out waiting for docs preview at ${baseUrl}${probePath}`);
}

async function findFreePort(): Promise<number> {
	const server = createServer();
	server.listen(0);
	await once(server, 'listening');
	const { port } = server.address() as AddressInfo;
	server.close();
	await once(server, 'close');
	return port;
}

let previewProcess: ChildProcess | undefined;

/**
 * Starts a docs preview of the current build on a free port and provides its
 * URL to the tests as `docsBaseUrl`.
 *
 * @remarks
 * Setting `DOCS_E2E_BASE_URL` opts in to testing an already running server
 * instead; setup fails when that server does not answer within five seconds. Without it, a
 * server another checkout left on a well-known port is never reused, so the
 * suite cannot report results for a stale build.
 *
 * The spawned preview drops `VITEST` from its environment: the Ecopages CLI
 * skips running when that variable is set, so the preview would exit at once.
 * It runs in its own process group so teardown stops the server `pnpm exec`
 * starts, not only the `pnpm` wrapper.
 */
export async function setup(project: TestProject): Promise<void> {
	const explicitBaseUrl = process.env.DOCS_E2E_BASE_URL;
	if (explicitBaseUrl) {
		if (!(await isServing(explicitBaseUrl))) {
			throw new Error(`DOCS_E2E_BASE_URL is set but ${explicitBaseUrl}${probePath} does not answer`);
		}
		project.provide('docsBaseUrl', explicitBaseUrl);
		return;
	}

	const port = await findFreePort();
	const baseUrl = `http://localhost:${port}`;
	const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
	const stderrChunks: string[] = [];
	previewProcess = spawn('pnpm', ['exec', 'ecopages', 'preview', '-p', String(port)], {
		cwd: docsRoot,
		stdio: ['ignore', 'ignore', 'pipe'],
		env: { ...process.env, VITEST: undefined },
		detached: true,
	});
	previewProcess.stderr?.on('data', (chunk: Buffer) => {
		stderrChunks.push(chunk.toString());
	});

	try {
		await waitForPreview(baseUrl, previewProcess);
	} catch (error) {
		stopPreview();
		const details = stderrChunks.join('').trim();
		throw new Error(details.length > 0 ? `${String(error)}\n${details}` : String(error), { cause: error });
	}
	project.provide('docsBaseUrl', baseUrl);
}

/**
 * Sends SIGTERM to the preview's process group.
 *
 * @remarks
 * The `pnpm` wrapper may exit before the server it started, so its exit code says
 * nothing about the group; a group that is already gone (`ESRCH`) is not an error.
 */
function stopPreview(): void {
	if (!previewProcess?.pid) {
		return;
	}
	try {
		process.kill(-previewProcess.pid, 'SIGTERM');
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
			throw error;
		}
	}
}

export async function teardown(): Promise<void> {
	if (!previewProcess) {
		return;
	}
	const exited = previewProcess.exitCode === null ? once(previewProcess, 'exit') : Promise.resolve();
	stopPreview();
	await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 2000))]);
}
