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
import { useFormStateContext, type FormStateContextValue } from '@/hooks/form-state/context';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { ArrayElementRegistration } from '@/components/schema-engine/forms/inputs/form-array-elements.registration';
import {
	ArrayElementConfigSchema,
	type ArrayElementsProps,
} from '@/components/schema-engine/forms/inputs/form-array-elements.types';
import { FormArrayElements } from '@/components/schema-engine/forms/inputs/form-array-elements';
import { CheckboxElementRegistration } from '@/components/schema-engine/forms/inputs/form-checkbox.registration';
import { CheckboxGroupElementRegistration } from '@/components/schema-engine/forms/inputs/form-checkbox-group.registration';
import { FieldSetRegistration } from '@/components/schema-engine/forms/inputs/form-fieldset.registration';
import { SubmitButtonElementRegistration } from '@/components/schema-engine/forms/actions/submit-button.registration';
import { schemaFormRecipeRegistrations } from '@/components/schema-engine/forms/recipes/registrations';
import '@/components/schema-engine/forms/recipes/recipes.css';
import '@/components/ui/schema-engine/components/controls.css';

/**
 * The part of the shadcn `Input` the shared field layout relies on: `w-full` and Tailwind's border-box.
 *
 * @remarks
 * The registry copies no `Input` of its own (it depends on shadcn's, which is `w-full min-w-0`), and the test
 * stubs carry no Tailwind, so this stands for those utilities, in the `utilities` layer where they live.
 */
const shadcnInput = document.createElement('style');
shadcnInput.textContent = '@layer utilities { input { box-sizing: border-box; width: 100%; } }';
document.head.prepend(shadcnInput);

const CustomArrayRegistration = defineInput({
	$type: customArrayType,
	containerKind: 'array',
	schema: z.extend(ArrayElementConfigSchema, { $type: z.literal(customArrayType) }),
	metadata: { name: 'Repeater', category: 'input' },
	render: FormArrayElements as (props: Omit<ArrayElementsProps, '$type'>) => ReturnType<typeof FormArrayElements>,
});

rendererConformance(async ({ config, onSubmit, ...props }) => {
	const probed: Partial<FormStateContextValue> = {};
	/** Reaches the form's container and runtime, as a component under the provider does. */
	function Probe() {
		Object.assign(probed, useFormStateContext());
		return null;
	}
	const engine = createFormEngine({
		elements: [
			{ ...InputElementRegistration, appearanceAxes: conformanceInputAxes },
			ArrayElementRegistration,
			CheckboxElementRegistration,
			CheckboxGroupElementRegistration,
			CustomArrayRegistration,
			FieldSetRegistration,
			SubmitButtonElementRegistration,
		],
		recipes: [...schemaFormRecipeRegistrations],
		actions: [conformanceAction],
		layout: conformanceLayout,
	});
	const renderConfig = (next: typeof config) => (
		<FormRenderer {...props} onSubmit={onSubmit} config={engine.validateForm(next)} engine={engine}>
			<Probe />
		</FormRenderer>
	);
	const view = render(renderConfig(config));
	return {
		host: view.container,
		cleanup: view.unmount,
		update: async (next) => view.rerender(renderConfig(next)),
		container: () => probed.container,
		submission: () => probed.runtime?.getSnapshot().submission,
	};
});
