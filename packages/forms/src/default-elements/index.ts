import { createRegistry, type BaseRegistration, type ReadOnlyRegistry } from '@schema-engine/registry';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { WithNormalizedChildren } from '@/types/define-element.js';
import type { ValidationRegistrationConstraint } from '@/schemas/validation/types.js';
import { ArrayElementContract } from './array-elements.js';
import { CheckboxElementContract } from './checkbox.js';
import { CheckboxGroupElementContract } from './checkbox-group.js';
import { ComboboxElementContract } from './combobox.js';
import { DropZoneElementContract } from './drop-zone.js';
import { FieldSetContract } from './fieldset.js';
import { InputElementContract } from './input.js';
import { InputOTPElementContract } from './input-otp.js';
import { MaskedInputElementContract } from './masked-input.js';
import { NumberElementContract } from './number.js';
import { PhoneInputElementContract } from './phone-input.js';
import { RadioElementContract } from './radio.js';
import { SelectElementContract } from './select.js';
import { SliderElementContract } from './slider.js';
import { SubmissionAlertElementContract } from './submission-alert.js';
import { SubmitButtonElementContract } from './submit-button.js';
import { SwitchElementContract } from './switch.js';
import { TextareaElementContract } from './textarea.js';

export * from './array-elements.js';
export * from './checkbox.js';
export * from './checkbox-group.js';
export * from './combobox.js';
export * from './drop-zone.js';
export * from './fieldset.js';
export * from './input.js';
export * from './input-otp.js';
export * from './masked-input.js';
export * from './number.js';
export * from './phone-input.js';
export * from './radio.js';
export * from './select.js';
export * from './slider.js';
export * from './submission-alert.js';
export * from './submit-button.js';
export * from './switch.js';
export * from './textarea.js';
export type { InputContract, StaticContract } from './define-contract.js';

/**
 * The contracts of the elements a renderer draws, which every renderer of Schema Engine binds.
 *
 * @remarks
 * A contract is an element without its renderer's part: the `$type`, schema, metadata, value declaration, container
 * kind and appearance axes. A renderer binds its `render` (and, for an input, its own `validations`) to each with
 * `bindRegistry` from `@schema-engine/registry`, so the schema and the value an element writes are defined once and
 * a renderer that leaves one out fails to compile. Annotated with the contracts' own types: with the inferred union the
 * type is too long to write into a declaration file.
 */
export const defaultElementContracts: ReadOnlyRegistry<
	| typeof InputElementContract
	| typeof TextareaElementContract
	| typeof NumberElementContract
	| typeof SelectElementContract
	| typeof CheckboxElementContract
	| typeof CheckboxGroupElementContract
	| typeof SwitchElementContract
	| typeof RadioElementContract
	| typeof SliderElementContract
	| typeof ComboboxElementContract
	| typeof DropZoneElementContract
	| typeof FieldSetContract
	| typeof InputOTPElementContract
	| typeof PhoneInputElementContract
	| typeof MaskedInputElementContract
	| typeof ArrayElementContract
	| typeof SubmitButtonElementContract
	| typeof SubmissionAlertElementContract
> = createRegistry(
	'Element',
	[
		InputElementContract,
		TextareaElementContract,
		NumberElementContract,
		SelectElementContract,
		CheckboxElementContract,
		CheckboxGroupElementContract,
		SwitchElementContract,
		RadioElementContract,
		SliderElementContract,
		ComboboxElementContract,
		DropZoneElementContract,
		FieldSetContract,
		InputOTPElementContract,
		PhoneInputElementContract,
		MaskedInputElementContract,
		ArrayElementContract,
		SubmitButtonElementContract,
		SubmissionAlertElementContract,
	],
	{ duplicates: 'error' },
);

type ContractOutput<TContract extends BaseRegistration> = TContract['schema'] extends StandardSchemaV1
	? WithNormalizedChildren<StandardSchemaV1.InferOutput<TContract['schema']>>
	: never;

/** What a renderer binds to one contract: its `render`, which takes the schema output, and for an input its `validations`. */
export type ElementBinding<TContract extends BaseRegistration> = TContract extends { kind: 'input' }
	? {
			render: (props: ContractOutput<TContract>) => unknown;
			validations?: readonly ValidationRegistrationConstraint[];
		}
	: { render: (props: ContractOutput<TContract>) => unknown };

/**
 * The bindings of a renderer for a registry of element contracts, one per `$type`.
 *
 * @remarks
 * Use it with `satisfies` on the bindings passed to `bindRegistry`, so each `render` is checked against the output of
 * its own contract's schema, as `defineInput` checks it: `{ checkbox: { render: FormCheckbox } } satisfies
 * ElementBindings<typeof defaultElementContracts>`.
 */
export type ElementBindings<TContracts extends ReadOnlyRegistry> =
	TContracts extends ReadOnlyRegistry<infer TContract extends BaseRegistration>
		? { readonly [K in TContract['$type']]: ElementBinding<Extract<TContract, { $type: K }>> }
		: never;
