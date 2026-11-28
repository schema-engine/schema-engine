/**
 * The named registrations keep the precise types of the widgets they bind: `value` is required for an input, `render` is the widget
 * itself (so it is a JSX component), and `validations` is the list the registration was built with.
 *
 * Run via: pnpm check-types (tsconfig.test-types.json)
 */

import { expectTypeOf, test } from 'vitest';
import { FormInput } from '@/elements/inputs/form-input';
import { FormPhoneInput } from '@/elements/inputs/form-phone-input';
import { createRadiantPhoneValidationRegistration } from '@/lib/phone-validation';
import { InputElementRegistration, PhoneInputElementRegistration } from '@/registrations/elements';

test('an input registration declares its value, which is a function of its config', () => {
	const config = {} as Parameters<typeof InputElementRegistration.render>[0];

	expectTypeOf(InputElementRegistration.value(config)).not.toBeAny();
});

test('a registration renders with the widget it binds', () => {
	expectTypeOf(InputElementRegistration.render).toEqualTypeOf<typeof FormInput>();
	expectTypeOf(PhoneInputElementRegistration.render).toEqualTypeOf<typeof FormPhoneInput>();
});

test('the phone input registration lists the validation it carries', () => {
	expectTypeOf(PhoneInputElementRegistration.validations[0]).toEqualTypeOf<
		ReturnType<typeof createRadiantPhoneValidationRegistration>
	>();
});
