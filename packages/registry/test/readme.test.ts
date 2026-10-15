import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

test('README TypeScript examples compile against the published package entry', () => {
	const directory = mkdtempSync(join(tmpdir(), 'registry-readme-'));
	try {
		const packageDirectory = resolve(import.meta.dirname, '..');
		mkdirSync(join(directory, 'node_modules', '@schema-engine'), { recursive: true });
		symlinkSync(packageDirectory, join(directory, 'node_modules', '@schema-engine', 'registry'));
		symlinkSync(
			dirname(fileURLToPath(import.meta.resolve('zod/package.json'))),
			join(directory, 'node_modules', 'zod'),
		);
		writeFileSync(join(directory, 'package.json'), '{"type":"module"}');
		const examples = [
			...readFileSync(join(packageDirectory, 'README.md'), 'utf8').matchAll(/```typescript\n([\s\S]*?)```/g),
		];
		expect(examples.length).toBeGreaterThan(0);
		const files = examples.map((example, index) => {
			const file = join(directory, `example-${index}.ts`);
			writeFileSync(file, example[1]);
			return file;
		});
		expect(() =>
			execFileSync(
				resolve(packageDirectory, '../../node_modules/.bin/tsc'),
				[
					'--noEmit',
					'--strict',
					'--skipLibCheck',
					'--target',
					'ES2022',
					'--module',
					'NodeNext',
					'--moduleResolution',
					'NodeNext',
					...files,
				],
				{ encoding: 'utf8', stdio: 'inherit' },
			),
		).not.toThrow();
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
}, 15000);
