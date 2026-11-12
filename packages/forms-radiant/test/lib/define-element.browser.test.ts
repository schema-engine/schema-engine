import { getCustomElementTagName } from '@ecopages/jsx';
import { afterEach, expect, test, vi } from 'vitest';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { deferFormElements, defineFormElements } from '@/define';

afterEach(() => {
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

test('deferred hosts leave server-rendered elements alone until defineFormElements, which binds the engine first', async () => {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	document.body.innerHTML = '<se-form-renderer><se-form-instance></se-form-instance></se-form-renderer>';
	const renderer = document.querySelector('se-form-renderer') as HTMLElement & { engine?: unknown };
	const instance = document.querySelector('se-form-instance') as HTMLElement & { engine?: unknown };

	deferFormElements();
	await import('@/components/internals/form-renderer.script');
	const { FormInstanceElement } = await import('@/components/form-instance.script');
	expect(getCustomElementTagName(FormInstanceElement)).toBe('se-form-instance');
	expect(customElements.get('se-form-renderer')).toBeUndefined();
	expect(customElements.get('se-form-instance')).toBeUndefined();

	const engine = createRadiantFormEngine();
	renderer.engine = engine;
	defineFormElements();

	expect(customElements.get('se-form-instance')).toBeDefined();
	await vi.waitFor(() => expect(instance.engine).toBe(engine));
	expect(warn).not.toHaveBeenCalled();
});
