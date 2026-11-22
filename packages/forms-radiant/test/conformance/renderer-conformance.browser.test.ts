import '@ecopages/radiant/client/install-hydrator';
import { expect } from 'vitest';
import { FormController } from '@/adapters/radiant/controller';
import { createRoot } from '@ecopages/jsx/client';
import * as z from 'zod/mini';
import { defineInput } from '@schema-engine/forms';
import {
	rendererConformance,
	conformanceAction,
	conformanceInputAxes,
	conformanceLayout,
	customArrayType,
} from '../../../../test-utils/renderer-conformance';
import { FormArrayElements } from '@/elements/inputs/form-array-elements';
import { ArrayElementConfigSchema, type ArrayElementsProps } from '@/elements/inputs/form-array-elements.types';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import '@/styles/appearance.css';
import '@/styles/hosts.css';
import { InputElementRegistration } from '@/elements/inputs/form-input.registration';

const CustomArrayRegistration = defineInput({
	$type: customArrayType,
	containerKind: 'array',
	schema: z.extend(ArrayElementConfigSchema, { $type: z.literal(customArrayType) }),
	metadata: { name: 'Repeater', category: 'input' },
	render: FormArrayElements as (props: Omit<ArrayElementsProps, '$type'>) => ReturnType<typeof FormArrayElements>,
});
const engine = createRadiantFormEngine({
	elements: [
		...schemaFormRegistrations,
		{ ...InputElementRegistration, appearanceAxes: conformanceInputAxes },
		CustomArrayRegistration,
	],
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
	await expect.poll(() => form.container).toBeTruthy();
	return {
		host,
		cleanup: () => {
			root.unmount();
			host.remove();
		},
		update: async (next) => renderConfig(next),
	};
});
