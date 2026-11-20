import { describe, it } from 'vitest';
import type { FormConfig } from '@/schemas/form-config';

describe('FormConfig', () => {
	it('does not accept callbacks', () => {
		const steps: FormConfig['steps'] = [];

		const withOnSubmit: FormConfig = {
			id: 'contact',
			steps,
			// @ts-expect-error onSubmit belongs on the renderer props or a registered action
			onSubmit: () => undefined,
		};
		const withOnChange: FormConfig = {
			id: 'contact',
			steps,
			// @ts-expect-error onChange belongs on the renderer props or a registered action
			onChange: () => undefined,
		};

		void withOnSubmit;
		void withOnChange;
	});
});
