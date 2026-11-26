import type { SliderFieldConfig } from '@schema-engine/forms/elements';

export { SliderFieldExtensionSchema, SliderFieldConfigSchema, sliderFieldValue } from '@schema-engine/forms/elements';
export type { SliderFieldExtension, SliderFieldConfig } from '@schema-engine/forms/elements';

export type SliderFieldProps = SliderFieldConfig & {
	onChange?: (value: number) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
