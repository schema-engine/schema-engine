export { FormInput } from './form-input';
export { FormTextarea } from './form-textarea';
export { FormSelect } from './form-select';
export { FormCheckbox } from './form-checkbox';
export { FormRadio } from './form-radio';
export { FormNumber } from './form-number';
export { FormSwitch } from './form-switch';
export { FormArrayElements } from './form-array-elements';

export type { InputFieldConfig } from './form-input.types';
export type { TextareaFieldConfig } from './form-textarea.types';
export type { SelectFieldConfig, SelectOption } from './form-select.types';
export type { CheckboxFieldConfig } from './form-checkbox.types';
export type { RadioFieldConfig, RadioOption } from './form-radio.types';
export type { NumberFieldConfig } from './form-number.types';
export type { SwitchFieldConfig } from './form-switch.types';
export type { ArrayElementsConfig } from './form-array-elements.types';

import './form-array-elements.registry';
import './form-checkbox.registry';
import './form-input.registry';
import './form-number.registry';
import './form-radio.registry';
import './form-select.registry';
import './form-switch.registry';
import './form-textarea.registry';
