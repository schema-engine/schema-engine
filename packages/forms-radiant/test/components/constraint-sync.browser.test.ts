import { expect, test } from 'vitest';
import { FormStore } from '@ecopages/radiant-ui/form';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import { FormInstanceElement } from '@/components/form-instance.script';
import { provideTestFormStore } from '../adapters/test-form';

test('authored disabled survives live constraint sync', async () => {
	const instance = new FormInstanceElement();
	instance.config = {
		id: 'disabled-form',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{
						$type: 'input',
						id: 'ref',
						name: 'ref',
						disabled: true,
						constraints: [{ field: 'mode', operator: 'equals', value: 'manual', action: 'enable' }],
					},
				],
			},
		],
	} satisfies NormalizedFormConfig;
	const form = document.createElement('rui-form');
	const store = new FormStore({ defaultValues: { mode: 'manual' } });
	provideTestFormStore(form, store);
	const wrapper = document.createElement('div');
	wrapper.setAttribute('data-se-constraint-field', 'ref');
	const field = document.createElement('se-field');
	field.setAttribute('name', 'ref');
	wrapper.append(field);
	form.append(wrapper);
	instance.append(form);
	document.body.append(instance);
	try {
		store.setValue('mode', 'manual');
		await expect.poll(() => (field as HTMLElement & { disabled?: boolean }).disabled).toBe(true);
	} finally {
		instance.remove();
	}
});
