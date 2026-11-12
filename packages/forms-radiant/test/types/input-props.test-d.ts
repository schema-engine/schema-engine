import { expectTypeOf, test } from 'vitest';
import type { CheckboxFieldProps } from '@/elements/inputs/form-checkbox.types';
import type { SelectFieldProps } from '@/elements/inputs/form-select.types';
import type { SliderFieldProps } from '@/elements/inputs/form-slider.types';
import type { MaskedInputFieldProps } from '@/elements/inputs/form-masked-input.types';
import type { PhoneInputFieldProps } from '@/elements/inputs/form-phone-input.types';
import type { InputOTPFieldProps } from '@/elements/inputs/form-input-otp.types';
import type { DropZoneFieldProps } from '@/elements/inputs/form-drop-zone.types';

test('input views take no element-level callbacks', () => {
	type Callbacks = 'onChange' | 'onBlur' | 'onFocus' | 'onDropChange';

	expectTypeOf<Extract<keyof CheckboxFieldProps, Callbacks>>().toBeNever();
	expectTypeOf<Extract<keyof SelectFieldProps, Callbacks>>().toBeNever();
	expectTypeOf<Extract<keyof SliderFieldProps, Callbacks>>().toBeNever();
	expectTypeOf<Extract<keyof MaskedInputFieldProps, Callbacks>>().toBeNever();
	expectTypeOf<Extract<keyof PhoneInputFieldProps, Callbacks>>().toBeNever();
	expectTypeOf<Extract<keyof InputOTPFieldProps, Callbacks>>().toBeNever();
	expectTypeOf<Extract<keyof DropZoneFieldProps, Callbacks>>().toBeNever();
});
