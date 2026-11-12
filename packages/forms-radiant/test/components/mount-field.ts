import { expect } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import type { FormFieldElement } from '@/elements/form-field';

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

/** Renders one element in a one-step form that validates on blur, and waits for its field to be ready. */
export async function mountField(element: Record<string, unknown>) {
	const host = document.createElement('div');
	document.body.append(host);
	const config = {
		id: 'controls',
		validationMode: 'onBlur',
		steps: [{ id: 'main', title: 'Main', elements: [element] }],
	};
	createRoot(host).render(FormRenderer({ config: engine.validateForm(config), engine }));
	await expect.poll(() => host.querySelector('se-field')).toBeTruthy();
	const field = host.querySelector('se-field') as FormFieldElement;
	await expect.poll(() => field.form.ready).toBe(true);
	return { host, field };
}
