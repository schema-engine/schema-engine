import { afterEach, expect, test, vi } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import { renderWithOwningFormEngine } from '@/contexts/form-engine-owner';

afterEach(() => {
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

test('stays quiet for a connected host that no engine reaches, because one may be bound later', () => {
	const output = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const host = document.createElement('div');
	document.body.append(host);

	expect(resolveFormEngine(host)).toBeUndefined();

	expect(output).not.toHaveBeenCalled();
});

test('stays quiet for a host under a renderer that was not given an engine yet', () => {
	const output = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const renderer = document.createElement('se-form-renderer');
	const host = document.createElement('div');
	renderer.append(host);
	document.body.append(renderer);

	expect(resolveFormEngine(host)).toBeUndefined();

	expect(output).not.toHaveBeenCalled();
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
