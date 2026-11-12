import { afterEach, expect, test, vi } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import { renderWithOwningFormEngine } from '@/contexts/form-engine-owner';

afterEach(() => {
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

test('tags the missing engine warning with the Radiant package and reports each host once', () => {
	const output = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const host = document.createElement('div');
	const other = document.createElement('section');
	document.body.append(host, other);

	expect(resolveFormEngine(host)).toBeUndefined();
	expect(resolveFormEngine(host)).toBeUndefined();
	expect(resolveFormEngine(other)).toBeUndefined();

	expect(output).toHaveBeenCalledTimes(2);
	expect(output).toHaveBeenNthCalledWith(
		1,
		expect.stringContaining('[schema-engine/forms-radiant]'),
		expect.any(String),
		expect.stringContaining('Could not resolve FormEngine for <div>'),
	);
	expect(output).toHaveBeenNthCalledWith(
		2,
		expect.stringContaining('[schema-engine/forms-radiant]'),
		expect.any(String),
		expect.stringContaining('Could not resolve FormEngine for <section>'),
	);
});

test('reports a host under a renderer that was never given an engine', () => {
	const output = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const renderer = document.createElement('se-form-renderer');
	const host = document.createElement('div');
	renderer.append(host);
	document.body.append(renderer);
	output.mockClear();

	expect(resolveFormEngine(host)).toBeUndefined();
	expect(resolveFormEngine(host)).toBeUndefined();

	expect(output).toHaveBeenCalledOnce();
	expect(output).toHaveBeenCalledWith(
		expect.stringContaining('[schema-engine/forms-radiant]'),
		expect.any(String),
		expect.stringContaining('Could not resolve FormEngine for <div>'),
	);
});

test('stays quiet for a host that is not attached to the document', () => {
	const output = vi.spyOn(console, 'warn').mockImplementation(() => {});

	expect(resolveFormEngine(document.createElement('div'))).toBeUndefined();

	expect(output).not.toHaveBeenCalled();
});

test('stays quiet when no host is given', () => {
	const output = vi.spyOn(console, 'warn').mockImplementation(() => {});

	expect(resolveFormEngine()).toBeUndefined();

	expect(output).not.toHaveBeenCalled();
});

test('resolves an explicit engine or the owning render without reporting', () => {
	const output = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const engine = createFormEngine();
	const host = document.createElement('div');
	document.body.append(host);

	expect(resolveFormEngine(host, engine)).toBe(engine);
	expect(renderWithOwningFormEngine(engine, () => resolveFormEngine(host))).toBe(engine);

	expect(output).not.toHaveBeenCalled();
});
