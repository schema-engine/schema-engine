import { createReactFormComposer } from '@/registries/builder-registry';
import { InputElementRegistration } from '@/components/elements/inputs/form-input.registration';
import { DefaultStepperRegistration } from '@/components/steppers/default-stepper.registration';

export function createIntegrationTestEngine() {
	return createReactFormComposer()
		.addElement(InputElementRegistration)
		.addStepper(DefaultStepperRegistration)
		.build();
}
