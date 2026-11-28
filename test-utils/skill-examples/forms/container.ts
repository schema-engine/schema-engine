import { createFormStateContainer } from '@schema-engine/forms/state-container';
import { contactForm } from './contact-form';
import { engine } from './engine';

export function createContactContainer() {
	return createFormStateContainer({ config: contactForm, registry: engine.validations });
}

export async function submitContact(name: string, email: string) {
	const container = createContactContainer();
	container.setValue('name', name);
	container.setValue('email', email);

	const result = await container.submit();
	if (result.outcome === 'passed') {
		result.setServerErrors({ email: { type: 'taken' } });
	}
	return { container, result };
}
