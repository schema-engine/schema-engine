import { afterEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import * as z from 'zod/mini';
import { createRoot } from '@ecopages/jsx/client';
import { RuiFieldError } from '@ecopages/radiant-ui/field';
import { RuiInput } from '@ecopages/radiant-ui/input';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { defineInput } from '@schema-engine/forms';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';
import { FormRenderer } from '@/components/internals/form-renderer';
import { FormField } from '@/elements/form-field';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { logger } from '@/lib/logger';

afterEach(() => document.body.replaceChildren());

const CountSchema = z.extend(BaseFieldSchema, { $type: z.literal('count') });

/** A control that declares a number and writes the text of a native input: the broken contract the runtime reports. */
const count = defineInput({
	$type: 'count',
	schema: CountSchema,
	metadata: { name: 'Count', category: 'input' },
	value: () => z.number(),
	render: (config) =>
		FormField({
			name: config.name,
			children: [
				RuiLabel({ htmlFor: config.id, children: config.label }),
				RuiInput({ id: config.id, name: config.name }),
				RuiFieldError({}),
			],
		}),
});

const engine = createRadiantFormEngine({ elements: [...schemaFormRegistrations, count] });
const config = engine.validateForm({
	id: 'broken',
	steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'count', id: 'count', name: 'count', label: 'Count' }] }],
});

test('a control that writes a value its declaration rejects fails the submission at its path, and onSubmit is not called', async () => {
	const onSubmit = vi.fn();
	vi.spyOn(logger, 'error').mockImplementation(() => logger);
	const host = document.createElement('div');
	document.body.append(host);
	const invalid = vi.fn();
	host.addEventListener('se-action-submit-invalid', (event) => invalid((event as CustomEvent).detail));
	createRoot(host).render(FormRenderer({ config, engine, onSubmit }));
	await expect.poll(() => host.querySelector('input[name="count"]')).toBeTruthy();

	await userEvent.type(host.querySelector<HTMLInputElement>('input[name="count"]')!, '3');
	host.querySelector('form')!.requestSubmit();

	await expect.poll(() => invalid.mock.calls.length).toBe(1);
	expect(invalid.mock.calls[0]?.[0].failures).toMatchObject([{ type: 'valueMismatch', params: { path: 'count' } }]);
	expect(onSubmit).not.toHaveBeenCalled();
});
