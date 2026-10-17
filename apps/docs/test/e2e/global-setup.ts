import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.DOCS_E2E_PORT ?? 4173);
const defaultBaseUrl = `http://localhost:${port}`;
const probePath = '/docs/forms-react/getting-started';

async function waitForServer(baseUrl: string): Promise<void> {
	const url = `${baseUrl}${probePath}`;
	for (let attempt = 0; attempt < 120; attempt += 1) {
		try {
			const response = await fetch(url);
			if (response.ok) {
				return;
			}
		} catch {
			// Retry until preview is ready.
		}
		await new Promise((resolve) => {
			setTimeout(resolve, 1000);
		});
	}
	throw new Error(`Timed out waiting for docs preview at ${url}`);
}

let previewProcess: ChildProcess | undefined;

/**
 * Reuses a running docs preview, or starts one outside CI.
 *
 * @remarks
 * The spawned preview drops `VITEST` from its environment: the Ecopages CLI
 * skips running when that variable is set, so the preview would exit at once.
 */
export async function setup(): Promise<void> {
	const configuredBaseUrl = process.env.DOCS_E2E_BASE_URL ?? defaultBaseUrl;
	process.env.DOCS_E2E_BASE_URL = configuredBaseUrl;

	try {
		await waitForServer(configuredBaseUrl);
		return;
	} catch (error) {
		if (process.env.CI) {
			throw error;
		}
	}

	const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
	const stderrChunks: string[] = [];
	previewProcess = spawn('pnpm', ['exec', 'ecopages', 'preview', '-p', String(port)], {
		cwd: docsRoot,
		stdio: ['ignore', 'pipe', 'pipe'],
		env: { ...process.env, VITEST: undefined },
	});
	previewProcess.stderr?.on('data', (chunk: Buffer) => {
		stderrChunks.push(chunk.toString());
	});

	process.env.DOCS_E2E_BASE_URL = defaultBaseUrl;
	try {
		await waitForServer(defaultBaseUrl);
	} catch (error) {
		const details = stderrChunks.join('').trim();
		throw new Error(details.length > 0 ? `${String(error)}\n${details}` : String(error), { cause: error });
	}
}

export async function teardown(): Promise<void> {
	if (!previewProcess || previewProcess.killed) {
		return;
	}
	previewProcess.kill('SIGTERM');
	await new Promise<void>((resolve) => {
		previewProcess?.once('exit', () => resolve());
		setTimeout(resolve, 2000);
	});
}
