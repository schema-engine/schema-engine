import { customElement, prop } from '@ecopages/radiant';
import { FormAssociatedElement, type FormValue } from '@ecopages/radiant/form-associated-element';
import { RuiFieldError } from '@ecopages/radiant-ui/field';
import { announceControlConnect, registerFieldControl } from '@ecopages/radiant-ui/form';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import * as z from 'zod/mini';
import { defineInput } from '@schema-engine/forms';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';
import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { FormField } from '@schema-engine/forms-radiant/primitives';

/**
 * A control that picks one of its options, as a form control of its own.
 *
 * @remarks
 * A form control announces itself when it connects, so a field that registered earlier seeds it, and
 * dispatches the native `input` and `change` on itself after `value` holds the new value. A value set from code
 * dispatches nothing, which is how the form writes a reset or a default into it.
 */
@customElement('x-tone')
export class ToneControl extends FormAssociatedElement {
	@prop({ type: String, reflect: true, defaultValue: '' }) value!: string;

	protected override onConnected(): void {
		super.onConnected();
		announceControlConnect(this);
	}

	choose(value: string): void {
		this.value = value;
		this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
		this.dispatchEvent(new Event('change', { bubbles: true }));
	}

	protected override formValue(): FormValue {
		return this.value;
	}

	protected override restoreFormState(state: FormValue): void {
		this.value = typeof state === 'string' ? state : '';
	}
}

registerFieldControl('x-tone', {
	read: (host) => (host as ToneControl).value,
	write: (host, value) => {
		(host as ToneControl).value = typeof value === 'string' ? value : '';
	},
	submission: 'host',
});

const ToneSchema = z.extend(BaseFieldSchema, { $type: z.literal('tone') });

export const ToneRegistration = defineInput({
	$type: 'tone',
	schema: ToneSchema,
	metadata: { name: 'Tone', category: 'input' },
	render: (config) => (
		<FormField name={config.name}>
			<RuiLabel>{config.label}</RuiLabel>
			<x-tone name={config.name} />
			<RuiFieldError />
		</FormField>
	),
});

export const engine = createRadiantFormEngine({ elements: [...schemaFormRegistrations, ToneRegistration] });
