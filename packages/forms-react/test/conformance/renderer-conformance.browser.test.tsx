import { render } from '@testing-library/react';
import * as z from 'zod/mini';
import { createFormEngine, defineInput } from '@schema-engine/forms';
import {
	rendererConformance,
	conformanceAction,
	conformanceInputAxes,
	conformanceLayout,
	customArrayType,
} from '../../../../test-utils/renderer-conformance';
import { FormRenderer } from '@/components/internals/form-renderer';
import { rhfAdapter } from '@/adapters/react-hook-form';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { ArrayElementRegistration } from '@/components/schema-engine/forms/inputs/form-array-elements.registration';
import {
	ArrayElementConfigSchema,
	type ArrayElementsProps,
} from '@/components/schema-engine/forms/inputs/form-array-elements.types';
import { FormArrayElements } from '@/components/schema-engine/forms/inputs/form-array-elements';
import { FieldSetRegistration } from '@/components/schema-engine/forms/inputs/form-fieldset.registration';
import { SubmitButtonElementRegistration } from '@/components/schema-engine/forms/actions/submit-button.registration';
import { schemaFormRecipeRegistrations } from '@/components/schema-engine/forms/recipes/registrations';
import '@/components/schema-engine/forms/recipes/recipes.css';

const CustomArrayRegistration = defineInput({
	$type: customArrayType,
	containerKind: 'array',
	schema: z.extend(ArrayElementConfigSchema, { $type: z.literal(customArrayType) }),
	metadata: { name: 'Repeater', category: 'input' },
	render: FormArrayElements as (props: Omit<ArrayElementsProps, '$type'>) => ReturnType<typeof FormArrayElements>,
});

rendererConformance(async ({ config, ...props }) => {
	const engine = createFormEngine({
		elements: [
			{ ...InputElementRegistration, appearanceAxes: conformanceInputAxes },
			ArrayElementRegistration,
			CustomArrayRegistration,
			FieldSetRegistration,
			SubmitButtonElementRegistration,
		],
		recipes: [...schemaFormRecipeRegistrations],
		actions: [conformanceAction],
		layout: conformanceLayout,
	});
	const renderConfig = (next: typeof config) => (
		<FormRenderer {...props} config={engine.validateForm(next)} engine={engine} adapter={rhfAdapter} />
	);
	const view = render(renderConfig(config));
	return {
		host: view.container,
		cleanup: view.unmount,
		update: async (next) => view.rerender(renderConfig(next)),
	};
});
