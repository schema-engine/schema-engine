import { expect, test } from 'vitest';

test('the debugger element is defined by the debugger entry alone, never by the root', async () => {
	await import('@/index');
	expect(customElements.get('se-form-debugger')).toBeUndefined();

	await import('@/debugger');
	expect(customElements.get('se-form-debugger')).toBeDefined();
});
