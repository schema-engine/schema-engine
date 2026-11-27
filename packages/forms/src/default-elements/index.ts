import { createRegistry, type BaseRegistration, type ReadOnlyRegistry } from '@schema-engine/registry';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { WithNormalizedChildren } from '@/types/define-element';
import type { ValidationRegistrationConstraint } from '@/schemas/validation/types';
import { ArrayElementContract } from './array-elements';
import { CheckboxElementContract } from './checkbox';
import { CheckboxGroupElementContract } from './checkbox-group';
import { ComboboxElementContract } from './combobox';
import { DropZoneElementContract } from './drop-zone';
import { FieldSetContract } from './fieldset';
import { InputElementContract } from './input';
import { InputOTPElementContract } from './input-otp';
import { MaskedInputElementContract } from './masked-input';
import { NumberElementContract } from './number';
import { PhoneInputElementContract } from './phone-input';
import { RadioElementContract } from './radio';
import { SelectElementContract } from './select';
import { SliderElementContract } from './slider';
import { SubmissionAlertElementContract } from './submission-alert';
import { SubmitButtonElementContract } from './submit-button';
import { SwitchElementContract } from './switch';
import { TextareaElementContract } from './textarea';

export * from './array-elements';
export * from './checkbox';
export * from './checkbox-group';
export * from './combobox';
export * from './drop-zone';
export * from './fieldset';
export * from './input';
export * from './input-otp';
export * from './masked-input';
export * from './number';
export * from './phone-input';
export * from './radio';
export * from './select';
export * from './slider';
export * from './submission-alert';
export * from './submit-button';
export * from './switch';
export * from './textarea';
export type { InputContract, StaticContract } from './define-contract';

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
