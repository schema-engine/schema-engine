import '@ecopages/radiant/client/install-hydrator';
import { expect } from 'vitest';
import { FormController } from '@/adapters/radiant/controller';
import { createRoot } from '@ecopages/jsx/client';
import * as z from 'zod/mini';
import { defineInput } from '@schema-engine/forms';
import {
	rendererConformance,
	conformanceAction,
	conformanceLayout,
	customArrayType,
} from '../../../../test-utils/renderer-conformance';
import { FormArrayElements } from '@/elements/inputs/form-array-elements';
import { ArrayElementConfigSchema, type ArrayElementsProps } from '@/elements/inputs/form-array-elements.types';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';

const CustomArrayRegistration = defineInput({
	$type: customArrayType,
	containerKind: 'array',
	schema: z.extend(ArrayElementConfigSchema, { $type: z.literal(customArrayType) }),
	metadata: { name: 'Repeater', category: 'input' },
	render: FormArrayElements as (props: Omit<ArrayElementsProps, '$type'>) => ReturnType<typeof FormArrayElements>,
});
const engine = createRadiantFormEngine({
	elements: [...schemaFormRegistrations, CustomArrayRegistration],
	actions: [conformanceAction],
	layout: conformanceLayout,
});

rendererConformance(async ({ config, ...props }) => {
	const host = document.createElement('div');

	document.body.append(host);
	const root = createRoot(host);
	const renderConfig = (next: typeof config) =>
		root.render(FormRenderer({ ...props, config: engine.validateForm(next), engine }));
	renderConfig(config);
	const form = new FormController(host.querySelector('rui-form')!);
	await expect.poll(() => form.ready).toBe(true);
	return {
		host,
		cleanup: () => {
			form.disconnect();
			root.unmount();
			host.remove();
		},
		update: async (next) => renderConfig(next),
	};
});
