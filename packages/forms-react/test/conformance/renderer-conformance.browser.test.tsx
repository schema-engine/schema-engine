import { render } from '@testing-library/react';
import { createFormEngine } from '@schema-engine/forms';
import { rendererConformance, conformanceAction } from '../../../../test-utils/renderer-conformance';
import { FormRenderer } from '@/components/internals/form-renderer';
import { rhfAdapter } from '@/adapters/react-hook-form';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { ArrayElementRegistration } from '@/components/schema-engine/forms/inputs/form-array-elements.registration';
import { FieldSetRegistration } from '@/components/schema-engine/forms/inputs/form-fieldset.registration';
import { SubmitButtonElementRegistration } from '@/components/schema-engine/forms/actions/submit-button.registration';
import { WizardRecipe } from '@/components/schema-engine/forms/recipes/registrations/wizard';

rendererConformance(async ({ config, ...props }) => {
	const engine = createFormEngine({
		elements: [
			InputElementRegistration,
			ArrayElementRegistration,
			FieldSetRegistration,
			SubmitButtonElementRegistration,
		],
		recipes: [WizardRecipe],
		actions: [conformanceAction],
	});
	const view = render(
		<FormRenderer {...props} config={engine.validateForm(config)} engine={engine} adapter={rhfAdapter} />,
	);
	return { host: view.container, cleanup: view.unmount };
});
