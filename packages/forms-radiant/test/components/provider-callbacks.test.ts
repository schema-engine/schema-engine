import { expect, test, vi } from 'vitest';
import { SubmitActionRegistration } from '@schema-engine/forms/actions';
import { createFormEngine } from '@schema-engine/forms';
import { FormRenderer } from '@/components/internals/form-renderer';

function containsCallback(node: unknown, key: string, callback: unknown): boolean {
	if (typeof node !== 'object' || node === null) return false;
	const object = node as Record<string, unknown>;
	if (object[key] === callback) return true;
	return Object.values(object).some((value) => containsCallback(value, key, callback));
}

test('FormRenderer forwards both provider callbacks to the live behavior hosts', () => {
	const engine = createFormEngine({ elements: [], actions: [SubmitActionRegistration] });
	const config = engine.defineForm({
		id: 'callbacks',
		steps: [{ id: 'main', title: 'Main', elements: [] }],
		actions: [{ id: 'save', $type: 'submit', endpoint: '/save' }],
	});
	const onChange = vi.fn();
	const onAction = vi.fn();
	const tree = FormRenderer({ engine, config, onChange, onAction });
	expect(containsCallback(tree, 'prop:onChange', onChange)).toBe(true);
	expect(containsCallback(tree, 'prop:onAction', onAction)).toBe(true);
});
